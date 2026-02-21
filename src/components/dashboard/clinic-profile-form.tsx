"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClinicData {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  timezone: string;
}

export function ClinicProfileForm({ clinic }: { clinic: ClinicData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/clinic/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          address: fd.get("address"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          city: fd.get("city"),
          state: fd.get("state"),
          timezone: fd.get("timezone"),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update clinic");
      }
      setSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="name">Clinic Name</Label>
        <Input id="name" name="name" defaultValue={clinic.name} required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={clinic.address ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={clinic.city ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={clinic.state ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={clinic.phone ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={clinic.email ?? ""} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" name="timezone" defaultValue={clinic.timezone} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Clinic updated successfully.</p>}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
