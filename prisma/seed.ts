/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * prisma/seed.ts
 *
 * Seeds the database with:
 *   - All permissions
 *   - 1 clinic ("Smile Dental Studio")
 *   - Default roles (Owner, Admin, Dentist, Reception, Assistant, Accountant) with permissions
 *   - 2 users: owner@dentos.app (Owner) and dentist@dentos.app (Dentist)
 *   - DentistProfile for the dentist
 *   - 5 sample patients
 *   - 3 sample appointments
 *   - 1 treatment plan with 2 items
 *   - 1 invoice with 2 line items and 1 payment
 *   - Trial subscription
 *
 * Run: npx tsx prisma/seed.ts
 */

import { PrismaClient, AppointmentStatus, TreatmentPlanStatus, TreatmentItemStatus, InvoiceStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Permission definitions ───────────────────
const PERMISSION_DEFS = [
  { code: "patients:read", module: "patients", description: "View patients" },
  { code: "patients:write", module: "patients", description: "Create/edit patients" },
  { code: "patients:delete", module: "patients", description: "Delete patients" },
  { code: "appointments:read", module: "appointments", description: "View appointments" },
  { code: "appointments:write", module: "appointments", description: "Create/edit appointments" },
  { code: "appointments:delete", module: "appointments", description: "Delete appointments" },
  { code: "treatments:read", module: "treatments", description: "View treatment plans" },
  { code: "treatments:write", module: "treatments", description: "Create/edit treatment plans" },
  { code: "treatments:approve", module: "treatments", description: "Approve treatment plans" },
  { code: "billing:read", module: "billing", description: "View invoices & payments" },
  { code: "billing:write", module: "billing", description: "Create/edit invoices" },
  { code: "billing:refund", module: "billing", description: "Process refunds" },
  { code: "inventory:read", module: "inventory", description: "View inventory" },
  { code: "inventory:write", module: "inventory", description: "Manage inventory" },
  { code: "reports:read", module: "reports", description: "View reports" },
  { code: "reports:export", module: "reports", description: "Export reports" },
  { code: "settings:read", module: "settings", description: "View settings" },
  { code: "settings:write", module: "settings", description: "Edit settings" },
  { code: "members:read", module: "members", description: "View team members" },
  { code: "members:write", module: "members", description: "Invite/edit members" },
  { code: "members:delete", module: "members", description: "Remove members" },
];

const ALL_CODES = PERMISSION_DEFS.map((p) => p.code);

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Owner: ALL_CODES,
  Admin: ALL_CODES,
  Dentist: [
    "patients:read", "patients:write",
    "appointments:read", "appointments:write",
    "treatments:read", "treatments:write", "treatments:approve",
    "billing:read",
    "reports:read",
  ],
  Reception: [
    "patients:read", "patients:write",
    "appointments:read", "appointments:write",
    "billing:read", "billing:write",
  ],
  Assistant: [
    "patients:read",
    "appointments:read",
    "treatments:read",
    "inventory:read",
  ],
  Accountant: [
    "billing:read", "billing:write", "billing:refund",
    "reports:read", "reports:export",
  ],
};

async function main() {
  console.log("🌱 Seeding DentOS database…\n");

  // ── 1. Upsert permissions ──────────────────
  console.log("  → Permissions");
  const permMap = new Map<string, string>();
  for (const p of PERMISSION_DEFS) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: { code: p.code, module: p.module, description: p.description },
    });
    permMap.set(perm.code, perm.id);
  }

  // ── 2. Create clinic ───────────────────────
  console.log("  → Clinic");
  const clinic = await prisma.clinic.upsert({
    where: { slug: "smile-dental-studio" },
    update: {},
    create: {
      name: "Smile Dental Studio",
      slug: "smile-dental-studio",
      email: "info@smiledental.in",
      phone: "+91 98765 43210",
      address: "42, MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      country: "IN",
      timezone: "Asia/Kolkata",
    },
  });

  // ── 3. Create roles with permissions ───────
  console.log("  → Roles");
  const roleMap = new Map<string, string>();
  for (const [roleName, codes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { clinicId_name: { clinicId: clinic.id, name: roleName } },
      update: {},
      create: {
        clinicId: clinic.id,
        name: roleName,
        isSystem: true,
        description: `Default ${roleName} role`,
      },
    });
    roleMap.set(roleName, role.id);

    // Assign permissions
    for (const code of codes) {
      const permId = permMap.get(code);
      if (!permId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
        update: {},
        create: { roleId: role.id, permissionId: permId },
      });
    }
  }

  // ── 4. Create users ────────────────────────
  console.log("  → Users");
  const ownerHash = await hash("Owner@123", 12);
  const adminHash = await hash("Admin@123", 12);
  const dentistHash = await hash("Dentist@123", 12);
  const receptionHash = await hash("Reception@123", 12);
  const assistantHash = await hash("Assistant@123", 12);
  const accountantHash = await hash("Accountant@123", 12);
  const superAdminHash = await hash("SuperAdmin@123", 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@dentos.app" },
    update: {},
    create: {
      name: "Dr. Priya Sharma",
      email: "owner@dentos.app",
      passwordHash: ownerHash,
      phone: "+91 99887 76655",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@dentos.app" },
    update: {},
    create: {
      name: "Rahul Gupta",
      email: "admin@dentos.app",
      passwordHash: adminHash,
      phone: "+91 99887 76600",
    },
  });

  const dentist = await prisma.user.upsert({
    where: { email: "dentist@dentos.app" },
    update: {},
    create: {
      name: "Dr. Arjun Mehta",
      email: "dentist@dentos.app",
      passwordHash: dentistHash,
      phone: "+91 88776 65544",
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { email: "reception@dentos.app" },
    update: {},
    create: {
      name: "Anita Desai",
      email: "reception@dentos.app",
      passwordHash: receptionHash,
      phone: "+91 88776 65500",
    },
  });

  const assistant = await prisma.user.upsert({
    where: { email: "assistant@dentos.app" },
    update: {},
    create: {
      name: "Pooja Iyer",
      email: "assistant@dentos.app",
      passwordHash: assistantHash,
      phone: "+91 88776 65511",
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: "accountant@dentos.app" },
    update: {},
    create: {
      name: "Vijay Rao",
      email: "accountant@dentos.app",
      passwordHash: accountantHash,
      phone: "+91 88776 65522",
    },
  });

  // Super Admin (platform-level, not tied to any clinic)
  await prisma.user.upsert({
    where: { email: "superadmin@dentos.app" },
    update: { isSuperAdmin: true },
    create: {
      name: "Chirag Sharma",
      email: "superadmin@dentos.app",
      passwordHash: superAdminHash,
      phone: "+91 99999 00000",
      isSuperAdmin: true,
    },
  });

  // ── 5. Clinic memberships ──────────────────
  console.log("  → Memberships");
  const ownerMember = await prisma.clinicMember.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: owner.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      userId: owner.id,
      roleId: roleMap.get("Owner")!,
    },
  });

  await prisma.clinicMember.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: admin.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      userId: admin.id,
      roleId: roleMap.get("Admin")!,
    },
  });

  const dentistMember = await prisma.clinicMember.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: dentist.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      userId: dentist.id,
      roleId: roleMap.get("Dentist")!,
    },
  });

  await prisma.clinicMember.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: receptionist.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      userId: receptionist.id,
      roleId: roleMap.get("Reception")!,
    },
  });

  await prisma.clinicMember.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: assistant.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      userId: assistant.id,
      roleId: roleMap.get("Assistant")!,
    },
  });

  await prisma.clinicMember.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: accountant.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      userId: accountant.id,
      roleId: roleMap.get("Accountant")!,
    },
  });

  // ── 6. Dentist profile ─────────────────────
  console.log("  → Dentist profile");
  await prisma.dentistProfile.upsert({
    where: { clinicMemberId: dentistMember.id },
    update: {},
    create: {
      clinicMemberId: dentistMember.id,
      specialization: "Orthodontics",
      licenseNumber: "KA-DENT-2024-0042",
      color: "#3B82F6",
    },
  });

  // Also create a profile for the owner (who is also a dentist)
  const ownerProfile = await prisma.dentistProfile.upsert({
    where: { clinicMemberId: ownerMember.id },
    update: {},
    create: {
      clinicMemberId: ownerMember.id,
      specialization: "General Dentistry",
      licenseNumber: "KA-DENT-2020-0015",
      color: "#10B981",
    },
  });

  // ── 7. Sample patients ─────────────────────
  console.log("  → Patients");
  const patientData = [
    { firstName: "Aarav", lastName: "Patel", email: "aarav@example.com", phone: "+91 90001 10001", gender: "Male", dateOfBirth: new Date("1990-05-14"), bloodGroup: "O+" },
    { firstName: "Sneha", lastName: "Reddy", email: "sneha@example.com", phone: "+91 90001 10002", gender: "Female", dateOfBirth: new Date("1985-11-22"), bloodGroup: "A+" },
    { firstName: "Karan", lastName: "Singh", email: "karan@example.com", phone: "+91 90001 10003", gender: "Male", dateOfBirth: new Date("1978-03-09"), bloodGroup: "B+" },
    { firstName: "Meera", lastName: "Nair", email: "meera@example.com", phone: "+91 90001 10004", gender: "Female", dateOfBirth: new Date("1995-07-30"), bloodGroup: "AB+" },
    { firstName: "Ravi", lastName: "Kumar", email: "ravi@example.com", phone: "+91 90001 10005", gender: "Male", dateOfBirth: new Date("2000-01-18"), bloodGroup: "O-" },
  ];

  const patients = [];
  for (const pd of patientData) {
    const patient = await prisma.patient.create({
      data: { clinicId: clinic.id, ...pd },
    });
    patients.push(patient);
  }

  // ── 8. Medical histories ───────────────────
  console.log("  → Medical histories");
  await prisma.medicalHistory.create({
    data: {
      patientId: patients[0].id,
      conditions: "Mild asthma",
      medications: "Salbutamol inhaler PRN",
      smokingStatus: "Never",
      alcoholConsumption: "Occasional",
    },
  });
  await prisma.medicalHistory.create({
    data: {
      patientId: patients[2].id,
      conditions: "Type 2 Diabetes",
      medications: "Metformin 500mg",
      smokingStatus: "Former",
      alcoholConsumption: "None",
    },
  });

  // ── 9. Allergies ───────────────────────────
  await prisma.allergy.createMany({
    data: [
      { patientId: patients[0].id, name: "Penicillin", severity: "severe" },
      { patientId: patients[2].id, name: "Latex", severity: "moderate" },
      { patientId: patients[3].id, name: "Ibuprofen", severity: "mild" },
    ],
  });

  // ── 10. Appointments ──────────────────────
  console.log("  → Appointments");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointments = [
    {
      clinicId: clinic.id,
      patientId: patients[0].id,
      dentistProfileId: ownerProfile.id,
      title: "Routine Checkup",
      type: "checkup",
      startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00 AM today
      endTime: new Date(today.getTime() + 10.5 * 60 * 60 * 1000), // 10:30 AM
      status: "SCHEDULED" as AppointmentStatus,
    },
    {
      clinicId: clinic.id,
      patientId: patients[1].id,
      dentistProfileId: ownerProfile.id,
      title: "Root Canal Follow-up",
      type: "follow-up",
      startTime: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11:00 AM
      endTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12:00 PM
      status: "CONFIRMED" as AppointmentStatus,
    },
    {
      clinicId: clinic.id,
      patientId: patients[2].id,
      dentistProfileId: ownerProfile.id,
      title: "Teeth Cleaning",
      type: "cleaning",
      startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2:00 PM
      endTime: new Date(today.getTime() + 14.75 * 60 * 60 * 1000), // 2:45 PM
      status: "SCHEDULED" as AppointmentStatus,
    },
  ];

  const createdAppts = [];
  for (const a of appointments) {
    const appt = await prisma.appointment.create({ data: a });
    createdAppts.push(appt);
  }

  // ── 11. Treatment plan ────────────────────
  console.log("  → Treatment plan");
  const plan = await prisma.treatmentPlan.create({
    data: {
      clinicId: clinic.id,
      patientId: patients[1].id,
      name: "Root Canal Treatment – Tooth #36",
      status: "IN_PROGRESS" as TreatmentPlanStatus,
      createdBy: owner.id,
      notes: "Patient presented with persistent pain in lower left molar.",
    },
  });

  await prisma.treatmentItem.createMany({
    data: [
      {
        treatmentPlanId: plan.id,
        procedure: "Root Canal Treatment",
        toothNum: 36,
        cost: 8000,
        discount: 500,
        status: TreatmentItemStatus.IN_PROGRESS,
        scheduledDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        treatmentPlanId: plan.id,
        procedure: "Dental Crown (Zirconia)",
        toothNum: 36,
        cost: 12000,
        discount: 0,
        status: TreatmentItemStatus.PENDING,
        scheduledDate: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // ── 12. Invoice + Payment ──────────────────
  console.log("  → Invoice & Payment");
  const invoice = await prisma.invoice.create({
    data: {
      clinicId: clinic.id,
      patientId: patients[1].id,
      invoiceNumber: "INV-2024-0001",
      subtotal: 20000,
      taxRate: 18,
      taxAmount: 3600,
      discount: 500,
      total: 23100,
      paidAmount: 10000,
      status: "PARTIALLY_PAID" as InvoiceStatus,
      dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
      notes: "Root canal + crown treatment",
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: invoice.id,
        description: "Root Canal Treatment – Tooth #36",
        quantity: 1,
        unitPrice: 8000,
        total: 8000,
      },
      {
        invoiceId: invoice.id,
        description: "Dental Crown (Zirconia) – Tooth #36",
        quantity: 1,
        unitPrice: 12000,
        total: 12000,
      },
    ],
  });

  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: 10000,
      method: "UPI",
      reference: "UPI-TXN-2024-ABC123",
      notes: "Advance payment",
    },
  });

  // ── 13. Subscription ──────────────────────
  console.log("  → Trial subscription");
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  await prisma.subscription.upsert({
    where: { clinicId: clinic.id },
    update: {},
    create: {
      clinicId: clinic.id,
      plan: "TRIAL",
      status: "TRIALING",
      trialEndsAt: trialEnd,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEnd,
    },
  });

  // ── 14. Audit log entries ─────────────────
  console.log("  → Audit logs");
  await prisma.auditLog.createMany({
    data: [
      { clinicId: clinic.id, userId: owner.id, action: "CLINIC_CREATED", entity: "Clinic", entityId: clinic.id },
      { clinicId: clinic.id, userId: owner.id, action: "PATIENT_CREATED", entity: "Patient", entityId: patients[0].id },
      { clinicId: clinic.id, userId: owner.id, action: "APPOINTMENT_CREATED", entity: "Appointment", entityId: createdAppts[0].id },
    ],
  });

  console.log("\n✅ Seed complete!");
  console.log("   ─────────────────────────────────────");
  console.log("   🔑 Super Admin:   superadmin@dentos.app / SuperAdmin@123");
  console.log("   ─────────────────────────────────────");
  console.log("   Owner login:      owner@dentos.app / Owner@123");
  console.log("   Admin login:      admin@dentos.app / Admin@123");
  console.log("   Dentist login:    dentist@dentos.app / Dentist@123");
  console.log("   Reception login:  reception@dentos.app / Reception@123");
  console.log("   Assistant login:  assistant@dentos.app / Assistant@123");
  console.log("   Accountant login: accountant@dentos.app / Accountant@123");
  console.log("   Clinic slug:      smile-dental-studio");
  console.log("   ─────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
