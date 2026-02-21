/**
 * WhatsApp integration utilities.
 *
 * Uses the wa.me deep-link which works on both desktop and mobile.
 * Phone numbers are normalised to E.164 (digits only, with country code).
 */

/**
 * Normalise an Indian phone number to digits-only format with country code.
 * Handles common formats:  +91 98765 43210, 09876543210, 9876543210, etc.
 */
export function normalisePhone(phone: string): string | null {
  if (!phone) return null;

  // Strip everything except digits and leading +
  let digits = phone.replace(/[^0-9+]/g, "");

  // Remove leading +
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  // Already has country code (91 + 10 digits)
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  // Starts with 0 (trunk prefix) → remove 0, add 91
  if (digits.startsWith("0") && digits.length === 11) {
    return "91" + digits.slice(1);
  }

  // Plain 10-digit Indian number
  if (digits.length === 10) {
    return "91" + digits;
  }

  // If it already looks like a valid international number (10+ digits), return as-is
  if (digits.length >= 10) {
    return digits;
  }

  return null;
}

/**
 * Build a wa.me URL to open a WhatsApp chat.
 */
export function getWhatsAppUrl(
  phone: string,
  message?: string
): string | null {
  const normalised = normalisePhone(phone);
  if (!normalised) return null;

  let url = `https://wa.me/${normalised}`;
  if (message) {
    url += `?text=${encodeURIComponent(message)}`;
  }
  return url;
}

// ─── Pre-built message templates ───────────────────────────────

export interface MessageTemplateParams {
  patientName: string;
  clinicName?: string;
  date?: string;
  time?: string;
  invoiceNumber?: string;
  amount?: string;
  balanceDue?: string;
  dentistName?: string;
}

export type TemplateKey =
  | "greeting"
  | "appointment_reminder"
  | "appointment_confirmation"
  | "payment_reminder"
  | "payment_receipt"
  | "followup"
  | "custom";

export interface MessageTemplate {
  key: TemplateKey;
  label: string;
  getMessage: (params: MessageTemplateParams) => string;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    key: "greeting",
    label: "General Greeting",
    getMessage: (p) =>
      `Hi ${p.patientName}, this is ${p.clinicName ?? "your dental clinic"}. How can we help you today?`,
  },
  {
    key: "appointment_reminder",
    label: "Appointment Reminder",
    getMessage: (p) =>
      `Hi ${p.patientName}, this is a reminder for your appointment${p.date ? ` on ${p.date}` : ""}${p.time ? ` at ${p.time}` : ""}${p.dentistName ? ` with Dr. ${p.dentistName}` : ""} at ${p.clinicName ?? "our clinic"}. Please confirm your availability. Thank you!`,
  },
  {
    key: "appointment_confirmation",
    label: "Appointment Confirmation",
    getMessage: (p) =>
      `Hi ${p.patientName}, your appointment has been confirmed for${p.date ? ` ${p.date}` : ""}${p.time ? ` at ${p.time}` : ""}${p.dentistName ? ` with Dr. ${p.dentistName}` : ""} at ${p.clinicName ?? "our clinic"}. See you soon!`,
  },
  {
    key: "payment_reminder",
    label: "Payment Reminder",
    getMessage: (p) =>
      `Hi ${p.patientName}, this is a gentle reminder regarding your pending payment${p.invoiceNumber ? ` for invoice ${p.invoiceNumber}` : ""}${p.balanceDue ? ` of ₹${p.balanceDue}` : ""}. Please make the payment at your earliest convenience. Thank you!`,
  },
  {
    key: "payment_receipt",
    label: "Payment Received",
    getMessage: (p) =>
      `Hi ${p.patientName}, we have received your payment${p.amount ? ` of ₹${p.amount}` : ""}${p.invoiceNumber ? ` for invoice ${p.invoiceNumber}` : ""}. Thank you for choosing ${p.clinicName ?? "our clinic"}!`,
  },
  {
    key: "followup",
    label: "Follow-up",
    getMessage: (p) =>
      `Hi ${p.patientName}, we hope you're doing well after your recent visit to ${p.clinicName ?? "our clinic"}. If you have any concerns or questions, feel free to reach out. Take care!`,
  },
];
