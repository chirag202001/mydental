import { z } from "zod";

// ─── Auth ──────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

// ─── Clinic Onboarding ─────────────────────────────────────────
export const createClinicSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("IN"),
});

// ─── Patient ───────────────────────────────────────────────────
export const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(), // ISO date string
  gender: z.enum(["male", "female", "other"]).optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Medical History ────────────────────────────────────────────
export const medicalHistorySchema = z.object({
  patientId: z.string().min(1),
  conditions: z.string().optional(),
  medications: z.string().optional(),
  surgeries: z.string().optional(),
  familyHistory: z.string().optional(),
  smokingStatus: z.enum(["never", "former", "current"]).optional(),
  alcoholConsumption: z.enum(["none", "occasional", "moderate", "heavy"]).optional(),
  notes: z.string().optional(),
});

// ─── Allergy ────────────────────────────────────────────────────
export const allergySchema = z.object({
  patientId: z.string().min(1),
  name: z.string().min(1, "Allergy name is required"),
  severity: z.enum(["mild", "moderate", "severe"]).default("mild"),
  notes: z.string().optional(),
});

// ─── Tooth Condition ────────────────────────────────────────────
export const toothConditionSchema = z.object({
  patientId: z.string().min(1),
  toothNum: z.number().int().min(11).max(48),
  condition: z.enum([
    "healthy",
    "cavity",
    "filling",
    "crown",
    "root_canal",
    "extraction",
    "implant",
    "bridge",
    "missing",
  ]),
  surface: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Tooth Note ─────────────────────────────────────────────────
export const toothNoteSchema = z.object({
  patientId: z.string().min(1),
  toothNum: z.number().int().min(11).max(48),
  note: z.string().min(1, "Note is required"),
});

// ─── Appointment ───────────────────────────────────────────────
export const appointmentSchema = z.object({
  patientId: z.string().min(1),
  dentistProfileId: z.string().optional(),
  title: z.string().optional(),
  startTime: z.string(), // ISO datetime
  endTime: z.string(),
  type: z.string().optional(),
  notes: z.string().optional(),
  status: z
    .enum([
      "SCHEDULED",
      "CONFIRMED",
      "ARRIVED",
      "IN_TREATMENT",
      "COMPLETED",
      "NO_SHOW",
      "CANCELLED",
    ])
    .default("SCHEDULED"),
});

// ─── Treatment Plan ────────────────────────────────────────────
export const treatmentPlanSchema = z.object({
  patientId: z.string().min(1),
  name: z.string().min(1, "Plan name is required"),
  notes: z.string().optional(),
});

export const treatmentItemSchema = z.object({
  procedure: z.string().min(1, "Procedure name is required"),
  toothNum: z.number().int().min(11).max(48).optional(),
  cost: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  dentistId: z.string().optional(),
  scheduledDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateTreatmentItemSchema = z.object({
  procedure: z.string().min(1).optional(),
  toothNum: z.number().int().min(11).max(48).optional().nullable(),
  cost: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  dentistId: z.string().optional().nullable(),
  status: z
    .enum(["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
  scheduledDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ─── Invoice ───────────────────────────────────────────────────
export const invoiceSchema = z.object({
  patientId: z.string().min(1),
  treatmentPlanId: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().int().min(1).default(1),
      unitPrice: z.number().min(0),
    })
  ).min(1, "At least one item is required"),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "INSURANCE"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Inventory ─────────────────────────────────────────────────
export const inventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  unit: z.string().max(20).default("pcs"),
  currentStock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  costPrice: z.number().min(0).default(0),
  sellPrice: z.number().min(0).default(0),
  supplierId: z.string().optional(),
});

export const stockMovementSchema = z.object({
  inventoryItemId: z.string().min(1),
  type: z.enum(["in", "out", "adjustment"]),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  reason: z.string().max(500).optional(),
});

// ─── Suppliers ─────────────────────────────────────────────────
export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

// ─── Members ───────────────────────────────────────────────────
export const inviteMemberSchema = z.object({
  email: z.string().email(),
  roleName: z.string().min(1),
});
