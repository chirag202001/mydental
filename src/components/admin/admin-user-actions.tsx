"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  adminResetPassword,
  adminToggleSuperAdmin,
  adminDeactivateUser,
  adminReactivateUser,
} from "@/server/actions/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { KeyRound, Shield, ShieldOff, Ban, UserCheck } from "lucide-react";

interface AdminUserActionsProps {
  userId: string;
  userName: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  isSelf: boolean;
}

export function AdminUserActions({
  userId,
  userName,
  isSuperAdmin,
  isActive,
  isSelf,
}: AdminUserActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  function handleResetPassword() {
    if (!newPassword || newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      return;
    }
    startTransition(async () => {
      const result = await adminResetPassword(userId, newPassword);
      if ("error" in result) {
        setMessage({ type: "error", text: result.error ?? "Unknown error" });
      } else {
        setMessage({ type: "success", text: "Password reset successfully" });
        setNewPassword("");
        setShowResetPassword(false);
      }
    });
  }

  function handleToggleAdmin() {
    startTransition(async () => {
      const result = await adminToggleSuperAdmin(userId);
      if ("error" in result) {
        setMessage({ type: "error", text: result.error ?? "Unknown error" });
      } else {
        setMessage({
          type: "success",
          text: `${result.userName} is ${result.newStatus ? "now" : "no longer"} a Super Admin`,
        });
      }
    });
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = isActive
        ? await adminDeactivateUser(userId)
        : await adminReactivateUser(userId);
      if ("error" in result) {
        setMessage({ type: "error", text: result.error ?? "Unknown error" });
      } else {
        setMessage({
          type: "success",
          text: isActive ? "User suspended successfully" : "User reactivated",
        });
      }
    });
  }

  if (isSelf) {
    return (
      <span className="text-xs text-muted-foreground italic">Current user</span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {/* Reset Password */}
        <AlertDialog open={showResetPassword} onOpenChange={setShowResetPassword}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              <KeyRound className="h-3 w-3 mr-1" />
              Reset Pwd
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Reset Password for {userName}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Enter a new password. The user will need to use this on their
                next login.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetPassword}
                disabled={isPending}
              >
                {isPending ? "Resetting…" : "Reset Password"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Toggle Super Admin */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              className={isSuperAdmin ? "text-amber-600" : ""}
            >
              {isSuperAdmin ? (
                <>
                  <ShieldOff className="h-3 w-3 mr-1" />
                  Revoke Admin
                </>
              ) : (
                <>
                  <Shield className="h-3 w-3 mr-1" />
                  Make Admin
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isSuperAdmin
                  ? "Remove Super Admin Access"
                  : "Promote to Super Admin"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isSuperAdmin
                  ? `This will remove system admin access from ${userName}. They will only retain their clinic-level roles.`
                  : `This will give ${userName} full system admin access to manage all clinics, users, and platform settings.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleToggleAdmin}
                className={
                  isSuperAdmin ? "" : "bg-amber-600 hover:bg-amber-700"
                }
              >
                {isPending
                  ? "Processing…"
                  : isSuperAdmin
                    ? "Remove Admin"
                    : "Make Admin"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Suspend / Reactivate */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              className={isActive ? "text-red-600" : "text-green-600"}
            >
              {isActive ? (
                <>
                  <Ban className="h-3 w-3 mr-1" />
                  Suspend
                </>
              ) : (
                <>
                  <UserCheck className="h-3 w-3 mr-1" />
                  Reactivate
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isActive ? "Suspend User" : "Reactivate User"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isActive
                  ? `This will deactivate all clinic memberships for ${userName}. They won't be able to access any clinic dashboard.`
                  : `This will reactivate all clinic memberships for ${userName}, restoring their access.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleToggleActive}
                className={
                  isActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }
              >
                {isPending
                  ? "Processing…"
                  : isActive
                    ? "Suspend User"
                    : "Reactivate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {message && (
        <p
          className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
