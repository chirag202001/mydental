"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminUpdateProfile, adminChangePassword } from "@/server/actions/admin-profile";
import { User, KeyRound, Shield, Mail, Phone, Calendar } from "lucide-react";

interface AdminProfileFormProps {
  user: {
    name: string;
    email: string;
    phone: string | null;
    createdAt: string;
  };
}

export function AdminProfileForm({ user }: AdminProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleProfileSubmit(formData: FormData) {
    startTransition(async () => {
      setProfileMsg(null);
      const result = await adminUpdateProfile(formData);
      if ("error" in result) {
        setProfileMsg({ type: "error", text: result.error ?? "Unknown error" });
      } else {
        setProfileMsg({ type: "success", text: "Profile updated successfully" });
      }
    });
  }

  function handlePasswordSubmit(formData: FormData) {
    startTransition(async () => {
      setPasswordMsg(null);
      const result = await adminChangePassword(formData);
      if ("error" in result) {
        setPasswordMsg({ type: "error", text: result.error ?? "Unknown error" });
      } else {
        setPasswordMsg({
          type: "success",
          text: result.message ?? "Password changed",
        });
        // Clear the form
        const form = document.getElementById("password-form") as HTMLFormElement;
        form?.reset();
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Account Info (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-amber-500" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Account created</p>
                <p className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-muted-foreground text-xs">Role</p>
                <p className="font-medium">Super Admin</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5" />
            Edit Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleProfileSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium mb-1.5"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={user.name}
                required
                minLength={2}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium mb-1.5"
              >
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                placeholder="+91 XXXXX XXXXX"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save Changes"}
              </Button>
              {profileMsg && (
                <p
                  className={`text-sm ${profileMsg.type === "success" ? "text-green-600" : "text-red-600"}`}
                >
                  {profileMsg.text}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="password-form"
            action={handlePasswordSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium mb-1.5"
              >
                Current Password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium mb-1.5"
              >
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={6}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 6 characters
              </p>
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium mb-1.5"
              >
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isPending} variant="outline">
                {isPending ? "Changing…" : "Change Password"}
              </Button>
              {passwordMsg && (
                <p
                  className={`text-sm ${passwordMsg.type === "success" ? "text-green-600" : "text-red-600"}`}
                >
                  {passwordMsg.text}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
