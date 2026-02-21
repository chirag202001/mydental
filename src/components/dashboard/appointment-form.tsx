"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createAppointment,
  updateAppointment,
} from "@/server/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface PatientOption {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

interface DentistOption {
  id: string;
  clinicMember: { user: { name: string | null } };
  color?: string | null;
}

interface AppointmentData {
  id: string;
  patientId: string;
  dentistProfileId?: string | null;
  title?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  type?: string | null;
  status: string;
  notes?: string | null;
  reminderEmail?: boolean;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function toLocalDatetime(d: Date | string): string {
  const date = new Date(d);
  const off = date.getTimezoneOffset();
  const local = new Date(date.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

const APPOINTMENT_TYPES = [
  "Checkup",
  "Cleaning",
  "Filling",
  "Root Canal",
  "Extraction",
  "Crown",
  "Bridge",
  "Implant",
  "Orthodontics",
  "Whitening",
  "X-Ray",
  "Consultation",
  "Follow Up",
  "Emergency",
  "Other",
];

export function AppointmentForm({
  patients,
  dentists,
  appointment,
}: {
  patients: PatientOption[];
  dentists: DentistOption[];
  appointment?: AppointmentData;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(
    appointment?.patientId ?? ""
  );

  const isEdit = !!appointment;

  // Find selected patient name for display
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients.slice(0, 20);
    const q = patientSearch.toLowerCase();
    return patients
      .filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.phone?.includes(q)
      )
      .slice(0, 20);
  }, [patientSearch, patients]);

  async function handleSubmit(formData: FormData) {
    setError(null);

    let result;
    if (isEdit) {
      result = await updateAppointment(appointment.id, formData);
    } else {
      result = await createAppointment(formData);
    }

    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/dashboard/appointments");
    }
  }

  // Default start = next rounded hour, end = +30 min
  const defaultStart = useMemo(() => {
    if (appointment) return toLocalDatetime(appointment.startTime);
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return toLocalDatetime(now);
  }, [appointment]);

  const defaultEnd = useMemo(() => {
    if (appointment) return toLocalDatetime(appointment.endTime);
    const now = new Date();
    now.setHours(now.getHours() + 1, 30, 0, 0);
    return toLocalDatetime(now);
  }, [appointment]);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
              {error}
            </div>
          )}

          {/* Patient selector */}
          <div className="space-y-2 relative">
            <Label htmlFor="patientSearch">Patient *</Label>
            {selectedPatient && (
              <div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-2">
                <span className="font-medium">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </span>
                {selectedPatient.phone && (
                  <span className="text-muted-foreground">
                    · {selectedPatient.phone}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientId("");
                    setPatientSearch("");
                  }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Change
                </button>
              </div>
            )}
            {!selectedPatient && (
              <>
                <Input
                  id="patientSearch"
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by name or phone…"
                  autoComplete="off"
                />
                {showDropdown && filteredPatients.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setShowDropdown(false);
                          setPatientSearch("");
                        }}
                      >
                        <span className="font-medium">
                          {p.firstName} {p.lastName}
                        </span>
                        {p.phone && (
                          <span className="text-muted-foreground ml-2">
                            {p.phone}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && filteredPatients.length === 0 && patientSearch && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
                    No patients found
                  </div>
                )}
              </>
            )}
            <input type="hidden" name="patientId" value={selectedPatientId} />
          </div>

          {/* Dentist selector */}
          <div className="space-y-2">
            <Label htmlFor="dentistProfileId">Dentist</Label>
            <select
              id="dentistProfileId"
              name="dentistProfileId"
              defaultValue={appointment?.dentistProfileId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Unassigned —</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.clinicMember.user.name ?? "Unknown"}
                </option>
              ))}
            </select>
          </div>

          {/* Date/time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                name="startTime"
                type="datetime-local"
                required
                defaultValue={defaultStart}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                name="endTime"
                type="datetime-local"
                required
                defaultValue={defaultEnd}
              />
            </div>
          </div>

          {/* Type & title */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                defaultValue={appointment?.type ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Select —</option>
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                name="title"
                defaultValue={appointment?.title ?? ""}
                placeholder="Auto-generated if empty"
              />
            </div>
          </div>

          {/* Status (only visible on edit) */}
          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={appointment.status}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="ARRIVED">Arrived</option>
                <option value="IN_TREATMENT">In Treatment</option>
                <option value="COMPLETED">Completed</option>
                <option value="NO_SHOW">No Show</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}
          {!isEdit && <input type="hidden" name="status" value="SCHEDULED" />}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={appointment?.notes ?? ""}
            />
          </div>

          {/* Email reminder toggle */}
          <div className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              id="reminderEmail"
              name="reminderEmail"
              defaultChecked={appointment?.reminderEmail ?? true}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="reminderEmail" className="font-normal cursor-pointer">
              Send email reminder to patient (24 hours before)
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <SubmitButton label={isEdit ? "Save Changes" : "Schedule Appointment"} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
