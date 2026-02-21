import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminProfileForm } from "@/components/admin/admin-profile-form";

export default async function AdminProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      isSuperAdmin: true,
    },
  });

  if (!user?.isSuperAdmin) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your admin account settings
        </p>
      </div>

      <AdminProfileForm
        user={{
          name: user.name ?? "",
          email: user.email,
          phone: user.phone,
          createdAt: user.createdAt.toISOString(),
        }}
      />
    </div>
  );
}
