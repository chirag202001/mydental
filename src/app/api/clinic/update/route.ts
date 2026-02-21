import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, requirePermissions } from "@/lib/tenant";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requirePermissions(ctx, ["settings:write"]);

    const body = await req.json();
    const { name, address, phone, email, city, state, timezone } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Clinic name is required" }, { status: 400 });
    }

    const updated = await db.clinic.update({
      where: { id: ctx.clinicId },
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        timezone: timezone?.trim() || "Asia/Kolkata",
      },
    });

    await createAuditLog({
      clinicId: ctx.clinicId,
      userId: ctx.userId,
      action: "CLINIC_UPDATED",
      entity: "Clinic",
      entityId: updated.id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
