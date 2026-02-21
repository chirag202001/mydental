import { NextRequest, NextResponse } from "next/server";
import { processAppointmentReminders } from "@/server/actions/appointments";

/**
 * Cron endpoint for processing appointment email reminders.
 * Protect with CRON_SECRET in production.
 *
 * Example Vercel cron config (vercel.json):
 * { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }] }
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processAppointmentReminders();
  return NextResponse.json(result);
}
