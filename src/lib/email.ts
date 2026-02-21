/* ────────────────────────────────────────────────────────────────
   Email service abstraction using Resend (fallback: log-only)
   ──────────────────────────────────────────────────────────────── */

import { Resend } from "resend";
import { logger } from "@/lib/logger";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM ?? "DentOS <noreply@dentos.app>";

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!resend) {
    logger.info("Email (dry-run, no RESEND_API_KEY):", {
      to: input.to,
      subject: input.subject,
    });
    return true;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return true;
  } catch (err) {
    logger.error("Failed to send email", { error: String(err), to: input.to });
    return false;
  }
}

// ─── Predefined templates ──────────────────────────────────────

export function sendClinicInviteEmail(
  email: string,
  clinicName: string,
  inviteUrl: string
) {
  return sendEmail({
    to: email,
    subject: `You've been invited to ${clinicName} on DentOS`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>You're invited!</h2>
        <p>You've been invited to join <strong>${clinicName}</strong> on DentOS.</p>
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;margin:16px 0">
          Accept Invitation
        </a>
        <p style="color:#666;font-size:13px">If you didn't expect this email, you can safely ignore it.</p>
      </div>
    `,
  });
}

export function sendAppointmentReminder(
  email: string,
  patientName: string,
  clinicName: string,
  dateTime: string
) {
  return sendEmail({
    to: email,
    subject: `Appointment Reminder – ${clinicName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Appointment Reminder</h2>
        <p>Dear ${patientName},</p>
        <p>This is a reminder about your appointment at <strong>${clinicName}</strong> on <strong>${dateTime}</strong>.</p>
        <p>Please arrive 10 minutes early. Contact the clinic if you need to reschedule.</p>
      </div>
    `,
  });
}
