/* ────────────────────────────────────────────────────────────────
   Permission constants – every server action checks these.
   Format: "module:action"
   ──────────────────────────────────────────────────────────────── */

export const PERMISSIONS = {
  // Patients
  PATIENTS_READ: "patients:read",
  PATIENTS_WRITE: "patients:write",
  PATIENTS_DELETE: "patients:delete",

  // Appointments
  APPOINTMENTS_READ: "appointments:read",
  APPOINTMENTS_WRITE: "appointments:write",
  APPOINTMENTS_DELETE: "appointments:delete",

  // Treatment Plans
  TREATMENTS_READ: "treatments:read",
  TREATMENTS_WRITE: "treatments:write",
  TREATMENTS_APPROVE: "treatments:approve",

  // Billing
  BILLING_READ: "billing:read",
  BILLING_WRITE: "billing:write",
  BILLING_REFUND: "billing:refund",

  // Inventory
  INVENTORY_READ: "inventory:read",
  INVENTORY_WRITE: "inventory:write",

  // Reports
  REPORTS_READ: "reports:read",
  REPORTS_EXPORT: "reports:export",

  // Settings
  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write",

  // Members
  MEMBERS_READ: "members:read",
  MEMBERS_WRITE: "members:write",
  MEMBERS_DELETE: "members:delete",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** All permission codes as flat array */
export const ALL_PERMISSION_CODES = Object.values(PERMISSIONS);

/** Default role → permission mapping used when seeding a new clinic */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  Owner: [...ALL_PERMISSION_CODES],
  Admin: [...ALL_PERMISSION_CODES],
  Dentist: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.APPOINTMENTS_READ,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.TREATMENTS_READ,
    PERMISSIONS.TREATMENTS_WRITE,
    PERMISSIONS.TREATMENTS_APPROVE,
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.REPORTS_READ,
  ],
  Reception: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.APPOINTMENTS_READ,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_WRITE,
  ],
  Assistant: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.APPOINTMENTS_READ,
    PERMISSIONS.TREATMENTS_READ,
    PERMISSIONS.INVENTORY_READ,
  ],
  Accountant: [
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_WRITE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_EXPORT,
  ],
};
