import { getClinicMembers } from "@/server/actions/members";
import { requireTenantContext, hasPermissions } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Plus, ShieldAlert } from "lucide-react";
import { InviteMemberForm } from "@/components/dashboard/invite-member-form";
import { redirect } from "next/navigation";

export default async function MembersPage() {
  const ctx = await requireTenantContext();

  // Require members:read permission
  if (!hasPermissions(ctx, [PERMISSIONS.MEMBERS_READ])) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Team Members</h1>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6 flex items-center gap-4">
            <ShieldAlert className="h-8 w-8 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Access Denied</p>
              <p className="text-sm text-amber-700 mt-1">
                You don&apos;t have permission to manage team members. Contact your
                clinic owner or admin for access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const members = await getClinicMembers();
  const canWrite = hasPermissions(ctx, [PERMISSIONS.MEMBERS_WRITE]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Members</h1>
      </div>

      {/* Only show invite form if user has members:write */}
      {canWrite && <InviteMemberForm />}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(m.user.name ?? m.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{m.user.name ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{m.user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.role.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.isActive ? "success" : "secondary"}>
                      {m.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(m.joinedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
