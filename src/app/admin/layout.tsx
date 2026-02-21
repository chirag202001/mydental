import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      isSuperAdmin: true,
      email: true,
      name: true,
      memberships: {
        take: 1,
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  if (!user?.isSuperAdmin) redirect("/dashboard");

  const hasClinic = (user.memberships?.length ?? 0) > 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminNav
        email={user.email}
        userName={user.name ?? ""}
        hasClinic={hasClinic}
        logoutButton={<AdminLogoutButton />}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
