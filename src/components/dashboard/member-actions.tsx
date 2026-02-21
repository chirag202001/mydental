"use client";

import { useState, useTransition } from "react";
import { removeMember, updateMemberRole, reactivateMember } from "@/server/actions/members";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { UserX, RotateCcw, Pencil } from "lucide-react";

interface MemberActionsProps {
  memberId: string;
  memberName: string;
  currentRole: string;
  isActive: boolean;
  isOwner: boolean;
  isSelf: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

const ASSIGNABLE_ROLES = ["Admin", "Dentist", "Reception", "Assistant", "Accountant"];

export function MemberActions({
  memberId,
  memberName,
  currentRole,
  isActive,
  isOwner,
  isSelf,
  canWrite,
  canDelete,
}: MemberActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState(false);

  // Owner and self cannot be modified
  if (isOwner || isSelf) return null;

  // No permissions at all
  if (!canWrite && !canDelete) return null;

  function handleRoleChange(newRole: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRole(memberId, newRole);
      if (result?.error) {
        setError(result.error);
      } else {
        setEditingRole(false);
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeMember(memberId);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleReactivate() {
    setError(null);
    startTransition(async () => {
      const result = await reactivateMember(memberId);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {/* Role change */}
      {canWrite && isActive && (
        <>
          {editingRole ? (
            <Select
              defaultValue={currentRole}
              onValueChange={handleRoleChange}
              disabled={isPending}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingRole(true)}
              disabled={isPending}
              className="h-8 text-xs gap-1"
            >
              <Pencil className="h-3 w-3" />
              Edit Role
            </Button>
          )}
        </>
      )}

      {/* Reactivate */}
      {canWrite && !isActive && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReactivate}
          disabled={isPending}
          className="h-8 text-xs gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          {isPending ? "Reactivating…" : "Reactivate"}
        </Button>
      )}

      {/* Remove / Deactivate */}
      {canDelete && isActive && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              disabled={isPending}
            >
              <UserX className="h-3 w-3" />
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove team member?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate <strong>{memberName}</strong>&apos;s access
                to the clinic. They will no longer be able to log in or access
                any data. You can reactivate them later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isPending ? "Removing…" : "Remove Member"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
