"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DentalChart } from "@/components/dashboard/dental-chart";
import {
  upsertToothCondition,
  removeToothCondition,
  addToothNote,
} from "@/server/actions/patient-details";
import { Save, Trash2, MessageSquarePlus } from "lucide-react";

interface ToothConditionData {
  id: string;
  toothNum: number;
  condition: string;
  surface?: string | null;
  notes?: string | null;
}

interface ToothNoteData {
  id: string;
  toothNum: number;
  note: string;
  createdAt: Date;
}

const CONDITION_OPTIONS = [
  { value: "healthy", label: "Healthy" },
  { value: "cavity", label: "Cavity / Caries" },
  { value: "filling", label: "Filling" },
  { value: "crown", label: "Crown" },
  { value: "root_canal", label: "Root Canal" },
  { value: "extraction", label: "Extraction" },
  { value: "implant", label: "Implant" },
  { value: "bridge", label: "Bridge" },
  { value: "missing", label: "Missing" },
];

const SURFACE_OPTIONS = [
  { value: "", label: "— None —" },
  { value: "mesial", label: "Mesial (M)" },
  { value: "distal", label: "Distal (D)" },
  { value: "buccal", label: "Buccal (B)" },
  { value: "lingual", label: "Lingual (L)" },
  { value: "occlusal", label: "Occlusal (O)" },
  { value: "incisal", label: "Incisal (I)" },
  { value: "MOD", label: "MOD" },
  { value: "MO", label: "MO" },
  { value: "DO", label: "DO" },
];

export function DentalChartEditor({
  patientId,
  conditions,
  toothNotes,
}: {
  patientId: string;
  conditions: ToothConditionData[];
  toothNotes: ToothNoteData[];
}) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const selectedCondition = selectedTooth
    ? conditions.find((c) => c.toothNum === selectedTooth)
    : null;

  const selectedNotes = selectedTooth
    ? toothNotes.filter((n) => n.toothNum === selectedTooth)
    : [];

  function handleToothClick(toothNum: number) {
    setSelectedTooth(toothNum);
    setError(null);
    setShowNoteForm(false);
  }

  function handleSaveCondition(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTooth) return;
    setError(null);

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await upsertToothCondition({
        patientId,
        toothNum: selectedTooth,
        condition: fd.get("condition") as string,
        surface: fd.get("surface") as string,
        notes: fd.get("notes") as string,
      });

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleRemoveCondition() {
    if (!selectedCondition) return;
    startTransition(async () => {
      await removeToothCondition(selectedCondition.id, patientId);
    });
  }

  function handleAddNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTooth) return;
    setError(null);

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addToothNote({
        patientId,
        toothNum: selectedTooth,
        note: fd.get("toothNote") as string,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        setShowNoteForm(false);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dental Chart</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DentalChart
          conditions={conditions}
          onToothClick={handleToothClick}
        />

        {/* Tooth editor panel */}
        {selectedTooth && (
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tooth #{selectedTooth}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTooth(null)}
              >
                Close
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Condition form */}
            <form onSubmit={handleSaveCondition} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="tc-condition">Condition</Label>
                  <select
                    id="tc-condition"
                    name="condition"
                    defaultValue={selectedCondition?.condition ?? "healthy"}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CONDITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tc-surface">Surface</Label>
                  <select
                    id="tc-surface"
                    name="surface"
                    defaultValue={selectedCondition?.surface ?? ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {SURFACE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tc-notes">Condition Notes</Label>
                <Input
                  id="tc-notes"
                  name="notes"
                  defaultValue={selectedCondition?.notes ?? ""}
                  placeholder="Additional details…"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  {isPending ? "Saving…" : "Save Condition"}
                </Button>
                {selectedCondition && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveCondition}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                )}
              </div>
            </form>

            {/* Tooth notes section */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">
                  Clinical Notes ({selectedNotes.length})
                </p>
                {!showNoteForm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNoteForm(true)}
                  >
                    <MessageSquarePlus className="h-4 w-4 mr-1" /> Add Note
                  </Button>
                )}
              </div>

              {selectedNotes.length > 0 && (
                <div className="space-y-2 mb-3">
                  {selectedNotes.map((n) => (
                    <div
                      key={n.id}
                      className="text-sm p-2 rounded bg-muted/50"
                    >
                      <p className="whitespace-pre-wrap">{n.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {showNoteForm && (
                <form onSubmit={handleAddNote} className="space-y-2">
                  <Textarea
                    name="toothNote"
                    rows={2}
                    required
                    placeholder="Add clinical note for this tooth…"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={isPending}>
                      {isPending ? "Saving…" : "Save Note"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNoteForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
