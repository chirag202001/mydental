/**
 * Tests for appointment validation schemas.
 */
import { describe, it, expect } from "vitest";
import { appointmentSchema } from "@/lib/validations";

describe("appointmentSchema", () => {
  const validData = {
    patientId: "clx1234567890",
    startTime: "2026-03-01T09:00",
    endTime: "2026-03-01T09:30",
    status: "SCHEDULED",
  };

  it("should accept valid minimal appointment data", () => {
    const result = appointmentSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should accept valid full appointment data", () => {
    const result = appointmentSchema.safeParse({
      ...validData,
      dentistProfileId: "clx0987654321",
      title: "Checkup",
      type: "Cleaning",
      notes: "Patient requested gentle cleaning",
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing patientId", () => {
    const result = appointmentSchema.safeParse({
      ...validData,
      patientId: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing startTime", () => {
    const { startTime, ...rest } = validData;
    const result = appointmentSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("should reject missing endTime", () => {
    const { endTime, ...rest } = validData;
    const result = appointmentSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("should default status to SCHEDULED", () => {
    const { status, ...rest } = validData;
    const result = appointmentSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("SCHEDULED");
    }
  });

  it("should accept all valid statuses", () => {
    const statuses = [
      "SCHEDULED",
      "CONFIRMED",
      "ARRIVED",
      "IN_TREATMENT",
      "COMPLETED",
      "NO_SHOW",
      "CANCELLED",
    ];
    for (const status of statuses) {
      const result = appointmentSchema.safeParse({ ...validData, status });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid status", () => {
    const result = appointmentSchema.safeParse({
      ...validData,
      status: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("should allow optional dentistProfileId", () => {
    const result = appointmentSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dentistProfileId).toBeUndefined();
    }
  });
});
