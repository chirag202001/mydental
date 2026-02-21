import { PlanType } from "@prisma/client";

/* ────────────────────────────────────────────────────────────────
   Plan definitions – limits & feature flags per subscription tier
   ──────────────────────────────────────────────────────────────── */

export interface PlanConfig {
  name: string;
  maxUsers: number;
  maxDentists: number;
  maxAppointmentsPerMonth: number;
  maxStorageMB: number;
  features: {
    inventory: boolean;
    advancedReporting: boolean;
    whatsappReminders: boolean;
    documentUploads: boolean;
    treatmentPlans: boolean;
    multiClinic: boolean;
  };
  stripe: {
    monthlyPriceId: string;
    yearlyPriceId: string;
  };
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  TRIAL: {
    name: "Trial",
    maxUsers: 5,
    maxDentists: 2,
    maxAppointmentsPerMonth: 50,
    maxStorageMB: 100,
    features: {
      inventory: false,
      advancedReporting: false,
      whatsappReminders: false,
      documentUploads: true,
      treatmentPlans: true,
      multiClinic: false,
    },
    stripe: { monthlyPriceId: "", yearlyPriceId: "" },
  },
  BASIC: {
    name: "Basic",
    maxUsers: 10,
    maxDentists: 3,
    maxAppointmentsPerMonth: 200,
    maxStorageMB: 500,
    features: {
      inventory: false,
      advancedReporting: false,
      whatsappReminders: false,
      documentUploads: true,
      treatmentPlans: true,
      multiClinic: false,
    },
    stripe: {
      monthlyPriceId: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID ?? "",
      yearlyPriceId: process.env.STRIPE_BASIC_YEARLY_PRICE_ID ?? "",
    },
  },
  PRO: {
    name: "Pro",
    maxUsers: 25,
    maxDentists: 10,
    maxAppointmentsPerMonth: 1000,
    maxStorageMB: 2048,
    features: {
      inventory: true,
      advancedReporting: true,
      whatsappReminders: false,
      documentUploads: true,
      treatmentPlans: true,
      multiClinic: false,
    },
    stripe: {
      monthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
      yearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? "",
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    maxUsers: 999,
    maxDentists: 999,
    maxAppointmentsPerMonth: 99999,
    maxStorageMB: 10240,
    features: {
      inventory: true,
      advancedReporting: true,
      whatsappReminders: true,
      documentUploads: true,
      treatmentPlans: true,
      multiClinic: true,
    },
    stripe: {
      monthlyPriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ?? "",
      yearlyPriceId: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID ?? "",
    },
  },
};

export const TRIAL_DURATION_DAYS = 14;
export const GRACE_PERIOD_DAYS = 7;
