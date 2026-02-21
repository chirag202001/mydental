"use client";

import { useFormStatus } from "react-dom";
import { inviteMember } from "@/server/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? "Inviting…" : "Send Invite"}
    </Button>
  );
}

export function InviteMemberForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    const result = await inviteMember(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Invite Member</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" name="email" type="email" placeholder="colleague@clinic.com" required />
          </div>
          <div className="w-40 space-y-1">
            <Label htmlFor="roleName" className="text-xs">Role</Label>
            <Select name="roleName" defaultValue="Dentist">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Dentist">Dentist</SelectItem>
                <SelectItem value="Reception">Reception</SelectItem>
                <SelectItem value="Assistant">Assistant</SelectItem>
                <SelectItem value="Accountant">Accountant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SubmitButton />
        </form>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        {success && <p className="text-sm text-green-600 mt-2">Invitation sent!</p>}
      </CardContent>
    </Card>
  );
}
