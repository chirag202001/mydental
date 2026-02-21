"use client";

import { useTransition } from "react";
import { toggleAppointmentReminder } from "@/server/actions/appointments";
import { Mail, MailX } from "lucide-react";

export function ReminderToggle({
  appointmentId,
  reminderEmail,
}: {
  appointmentId: string;
  reminderEmail: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleAppointmentReminder(appointmentId, !reminderEmail);
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors disabled:opacity-50"
    >
      {reminderEmail ? (
        <>
          <Mail className="h-4 w-4 text-green-600" />
          <span>Email reminder <strong className="text-green-700">on</strong></span>
        </>
      ) : (
        <>
          <MailX className="h-4 w-4 text-muted-foreground" />
          <span>Email reminder <strong>off</strong></span>
        </>
      )}
    </button>
  );
}
