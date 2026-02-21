"use client";

import { useState, useTransition } from "react";
import { addAppointmentNote } from "@/server/actions/appointments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus } from "lucide-react";

export function AddNoteForm({ appointmentId }: { appointmentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const note = fd.get("note") as string;
    if (!note.trim()) return;

    startTransition(async () => {
      const result = await addAppointmentNote(appointmentId, note);
      if (result.success) {
        setShowForm(false);
      } else {
        setError("Failed to add note");
      }
    });
  }

  if (!showForm) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
        <MessageSquarePlus className="h-4 w-4 mr-1" /> Add Note
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Textarea name="note" rows={3} required placeholder="Enter clinical note…" />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save Note"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
