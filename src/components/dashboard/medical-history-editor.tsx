"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { upsertMedicalHistory } from "@/server/actions/patient-details";
import { Pencil, Save, X } from "lucide-react";

interface MedicalHistoryData {
  conditions?: string | null;
  medications?: string | null;
  surgeries?: string | null;
  familyHistory?: string | null;
  smokingStatus?: string | null;
  alcoholConsumption?: string | null;
  notes?: string | null;
}

export function MedicalHistoryEditor({
  patientId,
  data,
}: {
  patientId: string;
  data: MedicalHistoryData | null;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await upsertMedicalHistory({
        patientId,
        conditions: fd.get("conditions") as string,
        medications: fd.get("medications") as string,
        surgeries: fd.get("surgeries") as string,
        familyHistory: fd.get("familyHistory") as string,
        smokingStatus: fd.get("smokingStatus") as string,
        alcoholConsumption: fd.get("alcoholConsumption") as string,
        notes: fd.get("notes") as string,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Medical History</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {!data ? (
            <p className="text-muted-foreground">No medical history recorded</p>
          ) : (
            <>
              {data.conditions && (
                <div>
                  <span className="text-muted-foreground">Conditions:</span>
                  <p className="whitespace-pre-wrap">{data.conditions}</p>
                </div>
              )}
              {data.medications && (
                <div>
                  <span className="text-muted-foreground">Medications:</span>
                  <p className="whitespace-pre-wrap">{data.medications}</p>
                </div>
              )}
              {data.surgeries && (
                <div>
                  <span className="text-muted-foreground">Surgeries:</span>
                  <p className="whitespace-pre-wrap">{data.surgeries}</p>
                </div>
              )}
              {data.familyHistory && (
                <div>
                  <span className="text-muted-foreground">Family History:</span>
                  <p className="whitespace-pre-wrap">{data.familyHistory}</p>
                </div>
              )}
              {data.smokingStatus && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Smoking:</span>
                  <span className="capitalize">{data.smokingStatus}</span>
                </div>
              )}
              {data.alcoholConsumption && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alcohol:</span>
                  <span className="capitalize">{data.alcoholConsumption}</span>
                </div>
              )}
              {data.notes && (
                <div>
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="whitespace-pre-wrap">{data.notes}</p>
                </div>
              )}
              {!data.conditions &&
                !data.medications &&
                !data.surgeries &&
                !data.familyHistory && (
                  <p className="text-muted-foreground">No details recorded yet</p>
                )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Medical History</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-3">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-1">
            <Label htmlFor="conditions">Conditions</Label>
            <Textarea
              id="conditions"
              name="conditions"
              rows={2}
              defaultValue={data?.conditions ?? ""}
              placeholder="Diabetes, hypertension, heart disease…"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="medications">Current Medications</Label>
            <Textarea
              id="medications"
              name="medications"
              rows={2}
              defaultValue={data?.medications ?? ""}
              placeholder="Metformin 500mg, Amlodipine 5mg…"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="surgeries">Past Surgeries</Label>
            <Textarea
              id="surgeries"
              name="surgeries"
              rows={2}
              defaultValue={data?.surgeries ?? ""}
              placeholder="Appendectomy (2019)…"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="familyHistory">Family History</Label>
            <Textarea
              id="familyHistory"
              name="familyHistory"
              rows={2}
              defaultValue={data?.familyHistory ?? ""}
              placeholder="Father: diabetes; Mother: hypertension…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="smokingStatus">Smoking</Label>
              <select
                id="smokingStatus"
                name="smokingStatus"
                defaultValue={data?.smokingStatus ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Not recorded</option>
                <option value="never">Never</option>
                <option value="former">Former</option>
                <option value="current">Current</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="alcoholConsumption">Alcohol</Label>
              <select
                id="alcoholConsumption"
                name="alcoholConsumption"
                defaultValue={data?.alcoholConsumption ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Not recorded</option>
                <option value="none">None</option>
                <option value="occasional">Occasional</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={data?.notes ?? ""}
            />
          </div>

          <Button type="submit" disabled={isPending} size="sm">
            <Save className="h-4 w-4 mr-1" />
            {isPending ? "Saving…" : "Save Medical History"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
