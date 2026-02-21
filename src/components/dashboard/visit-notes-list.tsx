"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Calendar } from "lucide-react";
import Link from "next/link";

interface VisitNote {
  id: string;
  appointmentId: string;
  note: string;
  createdBy: string | null;
  createdAt: Date | string;
}

interface Visit {
  id: string;
  startTime: Date | string;
  type: string | null;
  status: string;
  dentistProfile: {
    clinicMember: { user: { name: string | null } };
  } | null;
  appointmentNotes: VisitNote[];
}

interface VisitNotesListProps {
  visits: Visit[];
}

export function VisitNotesList({ visits }: VisitNotesListProps) {
  if (visits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="h-5 w-5" /> Visit Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No visit notes recorded yet. Notes added during appointments will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Stethoscope className="h-5 w-5" /> Visit Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {visits.map((visit) => {
          const dateStr = new Date(visit.startTime).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          const timeStr = new Date(visit.startTime).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const dentistName =
            visit.dentistProfile?.clinicMember?.user?.name || "Unknown";

          return (
            <div
              key={visit.id}
              className="border rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Link
                  href={`/dashboard/appointments/${visit.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Calendar className="h-4 w-4" />
                  {dateStr} at {timeStr}
                </Link>
                <div className="flex items-center gap-2">
                  {visit.type && (
                    <Badge variant="secondary" className="text-xs">
                      {visit.type}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Dr. {dentistName}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 pl-6">
                {visit.appointmentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="text-sm text-muted-foreground bg-muted/30 rounded p-2"
                  >
                    <p className="whitespace-pre-wrap">{note.note}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(note.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
