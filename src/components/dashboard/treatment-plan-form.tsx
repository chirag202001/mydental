"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { createTreatmentPlan, updateTreatmentPlan } from "@/server/actions/treatments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? isEdit
          ? "Saving…"
          : "Creating…"
        : isEdit
        ? "Save Changes"
        : "Create Treatment Plan"}
    </Button>
  );
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

interface TreatmentPlanFormProps {
  patients: Patient[];
  plan?: {
    id: string;
    name: string;
    notes?: string | null;
    patientId: string;
    patient: { firstName: string; lastName: string };
  };
}

export function TreatmentPlanForm({ patients, plan }: TreatmentPlanFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    plan
      ? {
          id: plan.patientId,
          firstName: plan.patient.firstName,
          lastName: plan.patient.lastName,
        }
      : null
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return patients
      .filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          (p.phone && p.phone.includes(q))
      )
      .slice(0, 8);
  }, [searchQuery, patients]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    if (plan) {
      const result = await updateTreatmentPlan(plan.id, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push(`/dashboard/treatments/${plan.id}`);
      }
    } else {
      const result = await createTreatmentPlan(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.planId) {
        router.push(`/dashboard/treatments/${result.planId}`);
      }
    }
  }

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
          <div className="space-y-2">
            <Label>Patient *</Label>
            {selectedPatient ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border px-3 py-2 text-sm bg-muted/30">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </div>
                {!plan && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSearchQuery("");
                    }}
                  >
                    Change
                  </Button>
                )}
                <input type="hidden" name="patientId" value={selectedPatient.id} />
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone…"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />
                {showDropdown && filtered.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-auto">
                    {filtered.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedPatient(p);
                          setShowDropdown(false);
                          setSearchQuery("");
                        }}
                      >
                        {p.firstName} {p.lastName}
                        {p.phone && (
                          <span className="ml-2 text-muted-foreground">
                            {p.phone}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && searchQuery && filtered.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg p-3 text-sm text-muted-foreground">
                    No patients found
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={plan?.name || ""}
              placeholder="e.g. Root Canal + Crown"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={plan?.notes || ""}
              placeholder="Additional notes about this treatment plan…"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <SubmitButton isEdit={!!plan} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
