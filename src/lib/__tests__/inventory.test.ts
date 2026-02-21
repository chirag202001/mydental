/**
 * Phase 8 tests – Inventory validations, rate limiting, error boundary config.
 */
import { describe, it, expect } from "vitest";
import {
  inventoryItemSchema,
  stockMovementSchema,
  supplierSchema,
} from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

/* ────────────────────────────────────────────────────────────────
   Inventory Item Schema
   ──────────────────────────────────────────────────────────────── */
describe("inventoryItemSchema", () => {
  const validItem = {
    name: "Dental Gloves",
    sku: "GLV-M-100",
    category: "Consumables",
    unit: "box",
    currentStock: 50,
    minStock: 10,
    costPrice: 250,
    sellPrice: 400,
  };

  it("should accept a valid inventory item", () => {
    const result = inventoryItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it("should apply defaults for optional fields", () => {
    const result = inventoryItemSchema.safeParse({ name: "Item" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit).toBe("pcs");
      expect(result.data.currentStock).toBe(0);
      expect(result.data.minStock).toBe(5);
      expect(result.data.costPrice).toBe(0);
      expect(result.data.sellPrice).toBe(0);
    }
  });

  it("should reject empty name", () => {
    const result = inventoryItemSchema.safeParse({ ...validItem, name: "" });
    expect(result.success).toBe(false);
  });

  it("should reject name exceeding 200 chars", () => {
    const result = inventoryItemSchema.safeParse({
      ...validItem,
      name: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative stock", () => {
    const result = inventoryItemSchema.safeParse({
      ...validItem,
      currentStock: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative cost price", () => {
    const result = inventoryItemSchema.safeParse({
      ...validItem,
      costPrice: -10,
    });
    expect(result.success).toBe(false);
  });

  it("should accept item with supplierId", () => {
    const result = inventoryItemSchema.safeParse({
      ...validItem,
      supplierId: "sup_123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject sku exceeding 50 chars", () => {
    const result = inventoryItemSchema.safeParse({
      ...validItem,
      sku: "x".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

/* ────────────────────────────────────────────────────────────────
   Stock Movement Schema
   ──────────────────────────────────────────────────────────────── */
describe("stockMovementSchema", () => {
  const validMovement = {
    inventoryItemId: "item_abc",
    type: "in" as const,
    quantity: 10,
    reason: "Monthly restock",
  };

  it("should accept a valid stock-in movement", () => {
    const result = stockMovementSchema.safeParse(validMovement);
    expect(result.success).toBe(true);
  });

  it("should accept stock-out type", () => {
    const result = stockMovementSchema.safeParse({
      ...validMovement,
      type: "out",
    });
    expect(result.success).toBe(true);
  });

  it("should accept adjustment type", () => {
    const result = stockMovementSchema.safeParse({
      ...validMovement,
      type: "adjustment",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid type", () => {
    const result = stockMovementSchema.safeParse({
      ...validMovement,
      type: "transfer",
    });
    expect(result.success).toBe(false);
  });

  it("should reject quantity of 0", () => {
    const result = stockMovementSchema.safeParse({
      ...validMovement,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative quantity", () => {
    const result = stockMovementSchema.safeParse({
      ...validMovement,
      quantity: -5,
    });
    expect(result.success).toBe(false);
  });

  it("should reject reason exceeding 500 chars", () => {
    const result = stockMovementSchema.safeParse({
      ...validMovement,
      reason: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("should allow reason to be omitted", () => {
    const { reason, ...noReason } = validMovement;
    const result = stockMovementSchema.safeParse(noReason);
    expect(result.success).toBe(true);
  });

  it("should reject missing inventoryItemId", () => {
    const { inventoryItemId, ...noId } = validMovement;
    const result = stockMovementSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });
});

/* ────────────────────────────────────────────────────────────────
   Supplier Schema
   ──────────────────────────────────────────────────────────────── */
describe("supplierSchema", () => {
  it("should accept valid supplier with name only", () => {
    const result = supplierSchema.safeParse({ name: "Dentsply" });
    expect(result.success).toBe(true);
  });

  it("should accept full supplier data", () => {
    const result = supplierSchema.safeParse({
      name: "MedLine Supplies",
      email: "sales@medline.com",
      phone: "+91 98765 43210",
      address: "Mumbai, Maharashtra",
      notes: "Preferred supplier for gloves",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const result = supplierSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("should reject name exceeding 200 chars", () => {
    const result = supplierSchema.safeParse({ name: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = supplierSchema.safeParse({
      name: "Supplier",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("should accept empty string email", () => {
    const result = supplierSchema.safeParse({
      name: "Supplier",
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("should reject phone exceeding 20 chars", () => {
    const result = supplierSchema.safeParse({
      name: "Supplier",
      phone: "1".repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it("should reject address exceeding 500 chars", () => {
    const result = supplierSchema.safeParse({
      name: "Supplier",
      address: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("should reject notes exceeding 1000 chars", () => {
    const result = supplierSchema.safeParse({
      name: "Supplier",
      notes: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

/* ────────────────────────────────────────────────────────────────
   Rate Limiter
   ──────────────────────────────────────────────────────────────── */
describe("checkRateLimit", () => {
  const opts = { maxRequests: 3, windowSeconds: 60 };

  it("should allow requests under the limit", () => {
    const key = `test:${Date.now()}:allow`;
    const r1 = checkRateLimit(key, opts);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, opts);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it("should block after exceeding limit", () => {
    const key = `test:${Date.now()}:block`;
    checkRateLimit(key, opts); // 1
    checkRateLimit(key, opts); // 2
    checkRateLimit(key, opts); // 3

    const r4 = checkRateLimit(key, opts);
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("should use separate counters for different keys", () => {
    const key1 = `test:${Date.now()}:k1`;
    const key2 = `test:${Date.now()}:k2`;

    checkRateLimit(key1, opts);
    checkRateLimit(key1, opts);
    checkRateLimit(key1, opts);

    // key1 is exhausted
    expect(checkRateLimit(key1, opts).success).toBe(false);

    // key2 should still work
    expect(checkRateLimit(key2, opts).success).toBe(true);
  });

  it("should reset after window expires", async () => {
    const key = `test:${Date.now()}:expire`;
    const shortOpts = { maxRequests: 1, windowSeconds: 1 };

    checkRateLimit(key, shortOpts); // uses the slot

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 1100));

    const r2 = checkRateLimit(key, shortOpts);
    expect(r2.success).toBe(true);
  });

  it("should include resetAt in the result", () => {
    const key = `test:${Date.now()}:reset`;
    const result = checkRateLimit(key, opts);
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1000);
  });
});
