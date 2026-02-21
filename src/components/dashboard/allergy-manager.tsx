"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addAllergy, removeAllergy } from "@/server/actions/patient-details";
import { Plus, X, AlertTriangle } from "lucide-react";

interface AllergyData {
  id: string;
  name: string;
  severity: string;
  notes?: string | null;
}

export function AllergyManager({
  patientId,
  allergies,
}: {
  patientId: string;
  allergies: AllergyData[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addAllergy({
        patientId,
        name: fd.get("name") as string,
        severity: fd.get("severity") as string,
        notes: fd.get("notes") as string,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        setShowForm(false);
      }
    });
  }

  function handleRemove(allergyId: string) {
    startTransition(async () => {
      await removeAllergy(allergyId, patientId);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Allergies
        </CardTitle>
        {!showForm && (
          <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {allergies.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No known allergies</p>
        )}

        {allergies.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {allergies.map((a) => (
              <div
                key={a.id}
                className="group flex items-center gap-1"
              >
                <Badge
                  variant={
                    a.severity === "severe"
                      ? "destructive"
                      : a.severity === "moderate"
                      ? "warning"
                      : "secondary"
                  }
                  title={a.notes || undefined}
                >
                  {a.name} ({a.severity})
                  <button
                    type="button"
                    onClick={() => handleRemove(a.id)}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isPending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleAdd} className="space-y-3 pt-2 border-t mt-2">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="allergy-name">Allergy *</Label>
                <Input
                  id="allergy-name"
                  name="name"
                  required
                  placeholder="e.g. Penicillin"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="allergy-severity">Severity</Label>
                <select
                  id="allergy-severity"
                  name="severity"
                  defaultValue="mild"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="allergy-notes">Notes (optional)</Label>
              <Input
                id="allergy-notes"
                name="notes"
                placeholder="Reaction details…"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Adding…" : "Add Allergy"}
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
        )}
      </CardContent>
    </Card>
  );
}
