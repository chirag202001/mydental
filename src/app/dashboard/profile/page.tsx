import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { ProfileForm } from "@/components/dashboard/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const ctx = await getTenantContext();
  if (!ctx) redirect("/onboarding");

  const [user, clinic] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    }),
    db.clinic.findUnique({
      where: { id: ctx.clinicId },
      select: { name: true },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings
        </p>
      </div>

      <ProfileForm
        user={{
          name: user.name ?? "",
          email: user.email,
          phone: user.phone,
          createdAt: user.createdAt.toISOString(),
          roleName: ctx.roleName,
          clinicName: clinic?.name ?? "",
        }}
      />
    </div>
  );
}
