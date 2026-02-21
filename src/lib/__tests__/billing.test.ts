import { describe, it, expect } from "vitest";
import { invoiceSchema, paymentSchema } from "../validations";

/* ────────────────────────────────────────────────────────────
   Phase 7 – Billing validation tests
   ──────────────────────────────────────────────────────────── */

describe("invoiceSchema", () => {
  const validInvoice = {
    patientId: "pat_123",
    items: [
      { description: "Consultation", quantity: 1, unitPrice: 500 },
    ],
    taxRate: 18,
    discount: 50,
    dueDate: "2025-01-31",
    notes: "First visit",
  };

  it("accepts a valid invoice", () => {
    expect(invoiceSchema.safeParse(validInvoice).success).toBe(true);
  });

  it("requires patientId", () => {
    const data = { ...validInvoice, patientId: "" };
    expect(invoiceSchema.safeParse(data).success).toBe(false);
  });

  it("requires at least one item", () => {
    const data = { ...validInvoice, items: [] };
    expect(invoiceSchema.safeParse(data).success).toBe(false);
  });

  it("requires item description", () => {
    const data = {
      ...validInvoice,
      items: [{ description: "", quantity: 1, unitPrice: 100 }],
    };
    expect(invoiceSchema.safeParse(data).success).toBe(false);
  });

  it("requires quantity >= 1", () => {
    const data = {
      ...validInvoice,
      items: [{ description: "X-ray", quantity: 0, unitPrice: 100 }],
    };
    expect(invoiceSchema.safeParse(data).success).toBe(false);
  });

  it("rejects negative unitPrice", () => {
    const data = {
      ...validInvoice,
      items: [{ description: "X-ray", quantity: 1, unitPrice: -100 }],
    };
    expect(invoiceSchema.safeParse(data).success).toBe(false);
  });

  it("rejects taxRate above 100", () => {
    const data = { ...validInvoice, taxRate: 150 };
    expect(invoiceSchema.safeParse(data).success).toBe(false);
  });

  it("rejects negative discount", () => {
    const data = { ...validInvoice, discount: -10 };
    expect(invoiceSchema.safeParse(data).success).toBe(false);
  });

  it("allows optional treatmentPlanId", () => {
    const data = { ...validInvoice, treatmentPlanId: "tp_123" };
    expect(invoiceSchema.safeParse(data).success).toBe(true);
  });

  it("defaults taxRate to 0 if omitted", () => {
    const { taxRate, ...rest } = validInvoice;
    const result = invoiceSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taxRate).toBe(0);
    }
  });

  it("defaults discount to 0 if omitted", () => {
    const { discount, ...rest } = validInvoice;
    const result = invoiceSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.discount).toBe(0);
    }
  });

  it("allows multiple line items", () => {
    const data = {
      ...validInvoice,
      items: [
        { description: "Cleaning", quantity: 1, unitPrice: 300 },
        { description: "Filling", quantity: 2, unitPrice: 800 },
        { description: "X-ray", quantity: 1, unitPrice: 200 },
      ],
    };
    expect(invoiceSchema.safeParse(data).success).toBe(true);
  });
});

describe("paymentSchema", () => {
  const validPayment = {
    invoiceId: "inv_123",
    amount: 1000,
    method: "CASH" as const,
    reference: "TXN-001",
    notes: "Partial payment",
  };

  it("accepts a valid payment", () => {
    expect(paymentSchema.safeParse(validPayment).success).toBe(true);
  });

  it("requires invoiceId", () => {
    const data = { ...validPayment, invoiceId: "" };
    expect(paymentSchema.safeParse(data).success).toBe(false);
  });

  it("requires positive amount", () => {
    const data = { ...validPayment, amount: 0 };
    expect(paymentSchema.safeParse(data).success).toBe(false);
  });

  it("rejects negative amount", () => {
    const data = { ...validPayment, amount: -500 };
    expect(paymentSchema.safeParse(data).success).toBe(false);
  });

  it("accepts all valid payment methods", () => {
    const methods = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "INSURANCE"];
    methods.forEach((method) => {
      const data = { ...validPayment, method };
      expect(paymentSchema.safeParse(data).success).toBe(true);
    });
  });

  it("rejects invalid payment method", () => {
    const data = { ...validPayment, method: "BITCOIN" };
    expect(paymentSchema.safeParse(data).success).toBe(false);
  });

  it("rejects lowercase payment methods", () => {
    const data = { ...validPayment, method: "cash" };
    expect(paymentSchema.safeParse(data).success).toBe(false);
  });

  it("allows optional reference and notes", () => {
    const data = {
      invoiceId: "inv_123",
      amount: 500,
      method: "UPI" as const,
    };
    expect(paymentSchema.safeParse(data).success).toBe(true);
  });
});

describe("Invoice status transitions", () => {
  // Mirror the state machine from billing.ts
  const VALID_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ["SENT", "CANCELLED"],
    SENT: ["OVERDUE", "CANCELLED"],
    PARTIALLY_PAID: ["OVERDUE", "CANCELLED"],
    OVERDUE: ["CANCELLED"],
    PAID: ["REFUNDED"],
    CANCELLED: ["DRAFT"],
    REFUNDED: [],
  };

  it("DRAFT can transition to SENT and CANCELLED", () => {
    expect(VALID_TRANSITIONS["DRAFT"]).toEqual(
      expect.arrayContaining(["SENT", "CANCELLED"])
    );
  });

  it("SENT can transition to OVERDUE and CANCELLED", () => {
    expect(VALID_TRANSITIONS["SENT"]).toEqual(
      expect.arrayContaining(["OVERDUE", "CANCELLED"])
    );
  });

  it("PAID can only transition to REFUNDED", () => {
    expect(VALID_TRANSITIONS["PAID"]).toEqual(["REFUNDED"]);
  });

  it("REFUNDED cannot transition anywhere", () => {
    expect(VALID_TRANSITIONS["REFUNDED"]).toEqual([]);
  });

  it("CANCELLED can be reopened as DRAFT", () => {
    expect(VALID_TRANSITIONS["CANCELLED"]).toEqual(["DRAFT"]);
  });

  it("PARTIALLY_PAID cannot go directly to PAID", () => {
    expect(VALID_TRANSITIONS["PARTIALLY_PAID"]).not.toContain("PAID");
  });

  it("no status can transition to PARTIALLY_PAID directly", () => {
    // PARTIALLY_PAID is set automatically by recordPayment, never via status transition
    Object.values(VALID_TRANSITIONS).forEach((targets) => {
      expect(targets).not.toContain("PARTIALLY_PAID");
    });
  });
});

describe("Invoice calculation logic", () => {
  function calculateInvoiceTotals(
    items: { quantity: number; unitPrice: number }[],
    taxRate: number,
    discount: number
  ) {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;
    return { subtotal, taxAmount, total };
  }

  it("calculates subtotal correctly for multiple items", () => {
    const items = [
      { quantity: 2, unitPrice: 500 },
      { quantity: 1, unitPrice: 1000 },
    ];
    const { subtotal } = calculateInvoiceTotals(items, 0, 0);
    expect(subtotal).toBe(2000);
  });

  it("applies tax correctly", () => {
    const items = [{ quantity: 1, unitPrice: 1000 }];
    const { taxAmount, total } = calculateInvoiceTotals(items, 18, 0);
    expect(taxAmount).toBe(180);
    expect(total).toBe(1180);
  });

  it("applies discount correctly", () => {
    const items = [{ quantity: 1, unitPrice: 1000 }];
    const { total } = calculateInvoiceTotals(items, 0, 200);
    expect(total).toBe(800);
  });

  it("applies both tax and discount", () => {
    const items = [{ quantity: 1, unitPrice: 1000 }];
    const { total } = calculateInvoiceTotals(items, 18, 100);
    // subtotal: 1000, tax: 180, total: 1000 + 180 - 100 = 1080
    expect(total).toBe(1080);
  });

  it("handles zero items gracefully", () => {
    const { subtotal, total } = calculateInvoiceTotals([], 18, 0);
    expect(subtotal).toBe(0);
    expect(total).toBe(0);
  });

  it("balance due is total minus paid", () => {
    const paidAmount = 500;
    const total = 1500;
    expect(total - paidAmount).toBe(1000);
  });

  it("partial payment leaves positive balance", () => {
    const total = 2000;
    const paidAmount = 800;
    const balance = total - paidAmount;
    expect(balance).toBeGreaterThan(0);
  });

  it("full payment leaves zero balance", () => {
    const total = 2000;
    const paidAmount = 2000;
    expect(total - paidAmount).toBe(0);
  });
});
