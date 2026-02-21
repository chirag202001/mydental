/**
 * Unit tests for permission helpers and plan feature checks.
 */
import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  ALL_PERMISSION_CODES,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/lib/permissions";
import { PLAN_CONFIGS } from "@/lib/plans";

// ── Permission constants ─────────────────────────────────────────

describe("PERMISSIONS", () => {
  it("should have all expected modules", () => {
    const modules = new Set(
      ALL_PERMISSION_CODES.map((c) => c.split(":")[0])
    );
    expect(modules).toContain("patients");
    expect(modules).toContain("appointments");
    expect(modules).toContain("treatments");
    expect(modules).toContain("billing");
    expect(modules).toContain("inventory");
    expect(modules).toContain("reports");
    expect(modules).toContain("settings");
    expect(modules).toContain("members");
  });

  it("should have unique permission codes", () => {
    expect(new Set(ALL_PERMISSION_CODES).size).toBe(ALL_PERMISSION_CODES.length);
  });

  it("should have 21 permissions total", () => {
    expect(ALL_PERMISSION_CODES.length).toBe(21);
  });
});

// ── Default role → permission mappings ──────────────────────────

describe("DEFAULT_ROLE_PERMISSIONS", () => {
  it("Owner should have all permissions", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Owner).toEqual(
      expect.arrayContaining(ALL_PERMISSION_CODES)
    );
    expect(DEFAULT_ROLE_PERMISSIONS.Owner.length).toBe(ALL_PERMISSION_CODES.length);
  });

  it("Admin should have all permissions", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Admin.length).toBe(ALL_PERMISSION_CODES.length);
  });

  it("Dentist should NOT have settings:write", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Dentist).not.toContain(
      PERMISSIONS.SETTINGS_WRITE
    );
  });

  it("Dentist should have patients:read", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Dentist).toContain(
      PERMISSIONS.PATIENTS_READ
    );
  });

  it("Reception should have billing:write but NOT billing:refund", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Reception).toContain(PERMISSIONS.BILLING_WRITE);
    expect(DEFAULT_ROLE_PERMISSIONS.Reception).not.toContain(PERMISSIONS.BILLING_REFUND);
  });

  it("Assistant should have read-only access", () => {
    const assistantPerms = DEFAULT_ROLE_PERMISSIONS.Assistant;
    for (const p of assistantPerms) {
      expect(p).toMatch(/:read$/);
    }
  });

  it("Accountant should have billing + reports access", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Accountant).toContain(PERMISSIONS.BILLING_READ);
    expect(DEFAULT_ROLE_PERMISSIONS.Accountant).toContain(PERMISSIONS.REPORTS_READ);
    expect(DEFAULT_ROLE_PERMISSIONS.Accountant).not.toContain(PERMISSIONS.PATIENTS_READ);
  });

  it("every role permission should be a valid code", () => {
    for (const [, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      for (const p of perms) {
        expect(ALL_PERMISSION_CODES).toContain(p);
      }
    }
  });
});

// ── Plan feature checks ────────────────────────────────────────

describe("PLAN_CONFIGS", () => {
  it("should define TRIAL, BASIC, PRO, ENTERPRISE", () => {
    expect(PLAN_CONFIGS).toHaveProperty("TRIAL");
    expect(PLAN_CONFIGS).toHaveProperty("BASIC");
    expect(PLAN_CONFIGS).toHaveProperty("PRO");
    expect(PLAN_CONFIGS).toHaveProperty("ENTERPRISE");
  });

  it("TRIAL should have limited users", () => {
    expect(PLAN_CONFIGS.TRIAL.maxUsers).toBeLessThanOrEqual(5);
  });

  it("ENTERPRISE should have highest limits", () => {
    expect(PLAN_CONFIGS.ENTERPRISE.maxUsers).toBeGreaterThanOrEqual(
      PLAN_CONFIGS.PRO.maxUsers
    );
    expect(PLAN_CONFIGS.ENTERPRISE.maxAppointmentsPerMonth).toBeGreaterThanOrEqual(
      PLAN_CONFIGS.PRO.maxAppointmentsPerMonth
    );
  });

  it("inventory feature should be OFF for TRIAL & BASIC", () => {
    expect(PLAN_CONFIGS.TRIAL.features.inventory).toBe(false);
    expect(PLAN_CONFIGS.BASIC.features.inventory).toBe(false);
  });

  it("inventory feature should be ON for PRO & ENTERPRISE", () => {
    expect(PLAN_CONFIGS.PRO.features.inventory).toBe(true);
    expect(PLAN_CONFIGS.ENTERPRISE.features.inventory).toBe(true);
  });

  it("all plans should have treatment plans feature", () => {
    for (const plan of Object.values(PLAN_CONFIGS)) {
      expect(plan.features.treatmentPlans).toBe(true);
    }
  });
});
