import { describe, it, expect } from "vitest";
import {
  treatmentPlanSchema,
  treatmentItemSchema,
  updateTreatmentItemSchema,
} from "@/lib/validations";

describe("treatmentPlanSchema", () => {
  it("accepts valid plan data", () => {
    const result = treatmentPlanSchema.safeParse({
      patientId: "cuid123",
      name: "Root Canal + Crown",
      notes: "Some notes",
    });
    expect(result.success).toBe(true);
  });

  it("requires patientId", () => {
    const result = treatmentPlanSchema.safeParse({
      patientId: "",
      name: "Test Plan",
    });
    expect(result.success).toBe(false);
  });

  it("requires plan name", () => {
    const result = treatmentPlanSchema.safeParse({
      patientId: "cuid123",
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional notes", () => {
    const result = treatmentPlanSchema.safeParse({
      patientId: "cuid123",
      name: "Plan",
    });
    expect(result.success).toBe(true);
  });
});

describe("treatmentItemSchema", () => {
  it("accepts valid item data", () => {
    const result = treatmentItemSchema.safeParse({
      procedure: "Root Canal",
      toothNum: 36,
      cost: 8000,
      discount: 500,
      dentistId: "dent123",
      scheduledDate: "2026-03-01",
      notes: "Lower left molar",
    });
    expect(result.success).toBe(true);
  });

  it("requires procedure name", () => {
    const result = treatmentItemSchema.safeParse({
      procedure: "",
      cost: 100,
    });
    expect(result.success).toBe(false);
  });

  it("defaults cost and discount to 0", () => {
    const result = treatmentItemSchema.safeParse({
      procedure: "Filling",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cost).toBe(0);
      expect(result.data.discount).toBe(0);
    }
  });

  it("validates tooth number range (11-48)", () => {
    expect(
      treatmentItemSchema.safeParse({ procedure: "Test", toothNum: 10 }).success
    ).toBe(false);
    expect(
      treatmentItemSchema.safeParse({ procedure: "Test", toothNum: 49 }).success
    ).toBe(false);
    expect(
      treatmentItemSchema.safeParse({ procedure: "Test", toothNum: 11 }).success
    ).toBe(true);
    expect(
      treatmentItemSchema.safeParse({ procedure: "Test", toothNum: 48 }).success
    ).toBe(true);
  });

  it("rejects negative cost", () => {
    const result = treatmentItemSchema.safeParse({
      procedure: "Filling",
      cost: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTreatmentItemSchema", () => {
  it("accepts valid status values", () => {
    const statuses = ["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    for (const status of statuses) {
      const result = updateTreatmentItemSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = updateTreatmentItemSchema.safeParse({
      status: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("allows partial updates", () => {
    const result = updateTreatmentItemSchema.safeParse({
      cost: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("allows nullable fields", () => {
    const result = updateTreatmentItemSchema.safeParse({
      toothNum: null,
      dentistId: null,
      scheduledDate: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });
});
