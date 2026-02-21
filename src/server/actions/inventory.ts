"use server";

import { db } from "@/lib/db";
import {
  requireTenantContext,
  requirePermissions,
  hasFeature,
  requireActiveSubscription,
} from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import {
  inventoryItemSchema,
  stockMovementSchema,
  supplierSchema,
} from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */

async function requireInventoryFeature(clinicId: string) {
  const allowed = await hasFeature(clinicId, "inventory");
  if (!allowed) throw new Error("FEATURE_NOT_AVAILABLE");
}

/* ────────────────────────────────────────────────────────────────
   Inventory Items – CRUD
   ──────────────────────────────────────────────────────────────── */

export async function getInventoryItems(params?: {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_READ]);
  await requireInventoryFeature(ctx.clinicId);

  const where: Record<string, unknown> = { clinicId: ctx.clinicId };

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params?.category) {
    where.category = params.category;
  }

  const items = await db.inventoryItem.findMany({
    where: where as any,
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  // Low-stock filter applied in-memory (Prisma can't compare two columns)
  if (params?.lowStockOnly) {
    return items.filter((i) => i.currentStock <= i.minStock);
  }

  return items;
}

export async function getInventoryItem(itemId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_READ]);
  await requireInventoryFeature(ctx.clinicId);

  const item = await db.inventoryItem.findFirst({
    where: { id: itemId, clinicId: ctx.clinicId },
    include: {
      supplier: { select: { id: true, name: true } },
      stockMovements: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!item) throw new Error("NOT_FOUND");
  return item;
}

export async function createInventoryItem(data: Record<string, unknown>) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_WRITE]);
  await requireActiveSubscription(ctx.clinicId);
  await requireInventoryFeature(ctx.clinicId);

  const parsed = inventoryItemSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const d = parsed.data;

  // Verify supplier belongs to same clinic
  if (d.supplierId) {
    const sup = await db.supplier.findFirst({
      where: { id: d.supplierId, clinicId: ctx.clinicId },
    });
    if (!sup) return { error: "Supplier not found" };
  }

  const item = await db.inventoryItem.create({
    data: {
      clinicId: ctx.clinicId,
      name: d.name,
      sku: d.sku || null,
      category: d.category || null,
      unit: d.unit,
      currentStock: d.currentStock,
      minStock: d.minStock,
      costPrice: d.costPrice,
      sellPrice: d.sellPrice,
      supplierId: d.supplierId || null,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "inventory.item.create",
    entity: "InventoryItem",
    entityId: item.id,
  });

  logger.info("Inventory item created", { itemId: item.id, name: d.name });
  revalidatePath("/dashboard/inventory");
  return { success: true, itemId: item.id };
}

export async function updateInventoryItem(
  itemId: string,
  data: Record<string, unknown>
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_WRITE]);
  await requireActiveSubscription(ctx.clinicId);
  await requireInventoryFeature(ctx.clinicId);

  const existing = await db.inventoryItem.findFirst({
    where: { id: itemId, clinicId: ctx.clinicId },
  });
  if (!existing) return { error: "Item not found" };

  const parsed = inventoryItemSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const d = parsed.data;

  if (d.supplierId) {
    const sup = await db.supplier.findFirst({
      where: { id: d.supplierId, clinicId: ctx.clinicId },
    });
    if (!sup) return { error: "Supplier not found" };
  }

  await db.inventoryItem.update({
    where: { id: itemId },
    data: {
      name: d.name,
      sku: d.sku || null,
      category: d.category || null,
      unit: d.unit,
      currentStock: d.currentStock,
      minStock: d.minStock,
      costPrice: d.costPrice,
      sellPrice: d.sellPrice,
      supplierId: d.supplierId || null,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "inventory.item.update",
    entity: "InventoryItem",
    entityId: itemId,
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/inventory/${itemId}`);
  return { success: true };
}

export async function deleteInventoryItem(itemId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_WRITE]);
  await requireInventoryFeature(ctx.clinicId);

  const item = await db.inventoryItem.findFirst({
    where: { id: itemId, clinicId: ctx.clinicId },
  });
  if (!item) return { error: "Item not found" };

  await db.inventoryItem.delete({ where: { id: itemId } });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "inventory.item.delete",
    entity: "InventoryItem",
    entityId: itemId,
  });

  revalidatePath("/dashboard/inventory");
  return { success: true };
}

/* ────────────────────────────────────────────────────────────────
   Stock Movements
   ──────────────────────────────────────────────────────────────── */

export async function recordStockMovement(data: {
  inventoryItemId: string;
  type: string;
  quantity: number;
  reason?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_WRITE]);
  await requireActiveSubscription(ctx.clinicId);
  await requireInventoryFeature(ctx.clinicId);

  const parsed = stockMovementSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const d = parsed.data;

  const item = await db.inventoryItem.findFirst({
    where: { id: d.inventoryItemId, clinicId: ctx.clinicId },
  });
  if (!item) return { error: "Inventory item not found" };

  const quantityChange =
    d.type === "in"
      ? d.quantity
      : d.type === "out"
      ? -d.quantity
      : d.quantity; // adjustment sets absolute delta

  // Prevent stock going negative
  if (d.type === "out" && item.currentStock < d.quantity) {
    return { error: `Insufficient stock. Available: ${item.currentStock} ${item.unit}` };
  }

  await db.$transaction([
    db.stockMovement.create({
      data: {
        inventoryItemId: d.inventoryItemId,
        type: d.type,
        quantity: d.quantity,
        reason: d.reason || null,
        createdBy: ctx.userId,
      },
    }),
    db.inventoryItem.update({
      where: { id: d.inventoryItemId },
      data: { currentStock: { increment: quantityChange } },
    }),
  ]);

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: `inventory.stock.${d.type}`,
    entity: "InventoryItem",
    entityId: d.inventoryItemId,
    metadata: { quantity: d.quantity, reason: d.reason },
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/inventory/${d.inventoryItemId}`);
  return { success: true };
}

export async function getStockMovements(itemId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_READ]);
  await requireInventoryFeature(ctx.clinicId);

  const item = await db.inventoryItem.findFirst({
    where: { id: itemId, clinicId: ctx.clinicId },
  });
  if (!item) throw new Error("NOT_FOUND");

  return db.stockMovement.findMany({
    where: { inventoryItemId: itemId },
    orderBy: { createdAt: "desc" },
  });
}

/* ────────────────────────────────────────────────────────────────
   Low-Stock Alerts
   ──────────────────────────────────────────────────────────────── */

export async function getLowStockItems() {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_READ]);
  await requireInventoryFeature(ctx.clinicId);

  const items = await db.inventoryItem.findMany({
    where: { clinicId: ctx.clinicId },
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  // Filter in-memory since Prisma can't compare two columns
  return items.filter((i) => i.currentStock <= i.minStock);
}

/* ────────────────────────────────────────────────────────────────
   Suppliers – CRUD
   ──────────────────────────────────────────────────────────────── */

export async function getSuppliers() {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_READ]);
  await requireInventoryFeature(ctx.clinicId);

  return db.supplier.findMany({
    where: { clinicId: ctx.clinicId },
    include: { _count: { select: { inventoryItems: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getSupplier(supplierId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_READ]);
  await requireInventoryFeature(ctx.clinicId);

  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, clinicId: ctx.clinicId },
    include: {
      inventoryItems: { select: { id: true, name: true, currentStock: true, unit: true } },
    },
  });
  if (!supplier) throw new Error("NOT_FOUND");
  return supplier;
}

export async function createSupplier(data: Record<string, unknown>) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_WRITE]);
  await requireActiveSubscription(ctx.clinicId);
  await requireInventoryFeature(ctx.clinicId);

  const parsed = supplierSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const d = parsed.data;
  const supplier = await db.supplier.create({
    data: {
      clinicId: ctx.clinicId,
      name: d.name,
      email: d.email || null,
      phone: d.phone || null,
      address: d.address || null,
      notes: d.notes || null,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "inventory.supplier.create",
    entity: "Supplier",
    entityId: supplier.id,
  });

  logger.info("Supplier created", { supplierId: supplier.id, name: d.name });
  revalidatePath("/dashboard/inventory");
  return { success: true, supplierId: supplier.id };
}

export async function updateSupplier(
  supplierId: string,
  data: Record<string, unknown>
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_WRITE]);
  await requireActiveSubscription(ctx.clinicId);
  await requireInventoryFeature(ctx.clinicId);

  const existing = await db.supplier.findFirst({
    where: { id: supplierId, clinicId: ctx.clinicId },
  });
  if (!existing) return { error: "Supplier not found" };

  const parsed = supplierSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const d = parsed.data;
  await db.supplier.update({
    where: { id: supplierId },
    data: {
      name: d.name,
      email: d.email || null,
      phone: d.phone || null,
      address: d.address || null,
      notes: d.notes || null,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "inventory.supplier.update",
    entity: "Supplier",
    entityId: supplierId,
  });

  revalidatePath("/dashboard/inventory");
  return { success: true };
}

export async function deleteSupplier(supplierId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_WRITE]);
  await requireInventoryFeature(ctx.clinicId);

  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, clinicId: ctx.clinicId },
    include: { _count: { select: { inventoryItems: true } } },
  });
  if (!supplier) return { error: "Supplier not found" };

  if (supplier._count.inventoryItems > 0) {
    return {
      error: `Cannot delete supplier with ${supplier._count.inventoryItems} linked items. Reassign items first.`,
    };
  }

  await db.supplier.delete({ where: { id: supplierId } });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "inventory.supplier.delete",
    entity: "Supplier",
    entityId: supplierId,
  });

  revalidatePath("/dashboard/inventory");
  return { success: true };
}

/* ────────────────────────────────────────────────────────────────
   Categories — Utility
   ──────────────────────────────────────────────────────────────── */

export async function getInventoryCategories() {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.INVENTORY_READ]);

  const items = await db.inventoryItem.findMany({
    where: { clinicId: ctx.clinicId, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return items.map((i) => i.category!).filter(Boolean);
}
