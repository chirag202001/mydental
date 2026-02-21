import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        include: {
          clinic: { select: { name: true } },
          role: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">
          {users.length} registered user{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Clinic(s)</th>
                  <th className="pb-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {user.name ?? "Unnamed"}
                        </span>
                        {user.isSuperAdmin && (
                          <Shield className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{user.email}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.isSuperAdmin && (
                          <Badge className="bg-amber-100 text-amber-700">
                            Super Admin
                          </Badge>
                        )}
                        {user.memberships.map((m) => (
                          <Badge key={m.id} variant="outline">
                            {m.role.name}
                          </Badge>
                        ))}
                        {!user.isSuperAdmin && user.memberships.length === 0 && (
                          <span className="text-muted-foreground text-xs">
                            No role
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {user.memberships.length > 0
                        ? user.memberships
                            .map((m) => m.clinic.name)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No users yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
