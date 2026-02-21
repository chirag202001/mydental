import { PlanType } from "@prisma/client";

/* ────────────────────────────────────────────────────────────────
   Plan definitions – limits & feature flags per subscription tier
   ──────────────────────────────────────────────────────────────── */

export interface PlanConfig {
  name: string;
  /** Price in INR paise (e.g. 99900 = ₹999) */
  priceInPaise: number;
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
  razorpay: {
    /** Razorpay Plan ID – created via Razorpay Dashboard or API */
    planId: string;
  };
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  TRIAL: {
    name: "Trial",
    priceInPaise: 0,
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
    razorpay: { planId: "" },
  },
  BASIC: {
    name: "Basic",
    priceInPaise: 99900,
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
    razorpay: {
      planId: process.env.RAZORPAY_BASIC_PLAN_ID ?? "",
    },
  },
  PRO: {
    name: "Pro",
    priceInPaise: 249900,
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
    razorpay: {
      planId: process.env.RAZORPAY_PRO_PLAN_ID ?? "",
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    priceInPaise: 499900,
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
    razorpay: {
      planId: process.env.RAZORPAY_ENTERPRISE_PLAN_ID ?? "",
    },
  },
};

export const TRIAL_DURATION_DAYS = 14;
export const GRACE_PERIOD_DAYS = 7;
