"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addPatientDocument,
  removePatientDocument,
} from "@/server/actions/patient-details";
import { FileUp, Trash2, FileText, Image, FileIcon } from "lucide-react";

interface DocumentData {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number | null;
  mimeType?: string | null;
  createdAt: Date;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ mimeType }: { mimeType?: string | null }) {
  if (mimeType?.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />;
  if (mimeType?.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

export function DocumentManager({
  patientId,
  documents,
}: {
  patientId: string;
  documents: DocumentData[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    // In a real app, this would upload to S3/R2 first.
    // For now, accept a URL directly (or simulate a file reference).
    const name = fd.get("docName") as string;
    const type = fd.get("docType") as string;
    const url = fd.get("docUrl") as string;

    if (!name || !url) {
      setError("Name and URL are required");
      return;
    }

    startTransition(async () => {
      const result = await addPatientDocument({
        patientId,
        name,
        type: type || "other",
        url,
      });

      if ("error" in result) {
        setError(result.error as string);
      } else {
        setShowForm(false);
      }
    });
  }

  function handleRemove(docId: string) {
    startTransition(async () => {
      await removePatientDocument(docId, patientId);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Documents & Attachments</CardTitle>
        {!showForm && (
          <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
            <FileUp className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {documents.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No documents uploaded</p>
        )}

        {documents.length > 0 && (
          <div className="space-y-2 mb-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 rounded-lg border group hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <DocIcon mimeType={doc.mimeType} />
                  <div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {doc.name}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {doc.type}
                      {doc.size ? ` · ${formatBytes(doc.size)}` : ""}
                      {" · "}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(doc.id)}
                  disabled={isPending}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleAdd} className="space-y-3 pt-2 border-t mt-2">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="doc-name">Document Name *</Label>
                <Input
                  id="doc-name"
                  name="docName"
                  required
                  placeholder="e.g. X-Ray Upper Jaw"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="doc-type">Type</Label>
                <select
                  id="doc-type"
                  name="docType"
                  defaultValue="report"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="xray">X-Ray</option>
                  <option value="report">Report</option>
                  <option value="prescription">Prescription</option>
                  <option value="consent">Consent Form</option>
                  <option value="insurance">Insurance</option>
                  <option value="photo">Photo</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="doc-url">File URL *</Label>
              <Input
                id="doc-url"
                name="docUrl"
                type="url"
                required
                placeholder="https://storage.example.com/file.pdf"
              />
              <p className="text-xs text-muted-foreground">
                Paste the URL from your storage provider (S3, Google Drive, etc.)
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving…" : "Add Document"}
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
