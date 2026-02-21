import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Building2 } from "lucide-react";
import { SearchForm } from "@/components/admin/search-form";
import { AdminUserActions } from "@/components/admin/admin-user-actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase();

  const allUsers = await db.user.findMany({
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

  // Filter in JS for compatibility
  const users = query
    ? allUsers.filter(
        (u) =>
          u.name?.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      )
    : allUsers;

  // Stats
  const superAdminCount = allUsers.filter((u) => u.isSuperAdmin).length;
  const activeUserCount = allUsers.filter(
    (u) => u.isSuperAdmin || u.memberships.some((m) => m.isActive)
  ).length;
  const suspendedCount = allUsers.filter(
    (u) =>
      !u.isSuperAdmin &&
      u.memberships.length > 0 &&
      u.memberships.every((m) => !m.isActive)
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">
          {users.length === allUsers.length
            ? `${allUsers.length} registered user${allUsers.length !== 1 ? "s" : ""}`
            : `${users.length} of ${allUsers.length} users`}
          {query && ` matching "${params.q}"`}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-gray-50 border">
          <p className="text-2xl font-bold">{allUsers.length}</p>
          <p className="text-xs text-muted-foreground">Total Users</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50 border border-green-100">
          <p className="text-2xl font-bold text-green-700">{activeUserCount}</p>
          <p className="text-xs text-green-600">Active</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
          <p className="text-2xl font-bold text-amber-700">
            {superAdminCount}
          </p>
          <p className="text-xs text-amber-600">Super Admins</p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 border border-red-100">
          <p className="text-2xl font-bold text-red-700">{suspendedCount}</p>
          <p className="text-xs text-red-600">Suspended</p>
        </div>
      </div>

      {/* Search */}
      <SearchForm placeholder="Search by name or email..." defaultValue={params.q ?? ""} />

      {/* Users table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Roles</th>
                  <th className="pb-3 font-medium">Clinics</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Joined</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isActive =
                    user.isSuperAdmin ||
                    user.memberships.some((m) => m.isActive);
                  const isSelf = user.id === session?.user?.id;

                  return (
                    <tr
                      key={user.id}
                      className={`border-b last:border-0 ${
                        !isActive ? "opacity-50" : ""
                      }`}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                            {(user.name ?? user.email)
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">
                                {user.name ?? "Unnamed"}
                              </span>
                              {user.isSuperAdmin && (
                                <Shield className="h-3.5 w-3.5 text-amber-500" />
                              )}
                              {isSelf && (
                                <span className="text-xs text-blue-500">
                                  (you)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.isSuperAdmin && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">
                              Super Admin
                            </Badge>
                          )}
                          {user.memberships.map((m) => (
                            <Badge
                              key={m.id}
                              variant="outline"
                              className={`text-xs ${!m.isActive ? "line-through opacity-60" : ""}`}
                            >
                              {m.role.name}
                            </Badge>
                          ))}
                          {!user.isSuperAdmin &&
                            user.memberships.length === 0 && (
                              <span className="text-xs text-muted-foreground">
                                No role
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.memberships.length > 0
                            ? user.memberships.map((m) => (
                                <span
                                  key={m.id}
                                  className={`text-xs ${!m.isActive ? "line-through text-muted-foreground" : ""}`}
                                >
                                  {m.clinic.name}
                                </span>
                              ))
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="py-3">
                        {isActive ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 text-xs">
                            Suspended
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3">
                        <AdminUserActions
                          userId={user.id}
                          userName={user.name ?? user.email}
                          isSuperAdmin={user.isSuperAdmin}
                          isActive={isActive}
                          isSelf={isSelf}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>
                  {query ? "No users match your search." : "No users yet."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
