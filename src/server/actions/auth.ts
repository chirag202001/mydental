"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { registerSchema, loginSchema, createClinicSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { ALL_PERMISSION_CODES, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import { TRIAL_DURATION_DAYS } from "@/lib/plans";
import { logger } from "@/lib/logger";
import { rateLimitAuth } from "@/lib/rate-limit";
import { redirect } from "next/navigation";

// ─── Register ──────────────────────────────────────────────────
export async function registerUser(formData: FormData) {
  const rateLimitError = await rateLimitAuth("register");
  if (rateLimitError) return { error: rateLimitError };

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: { name, email, passwordHash },
  });

  logger.info("User registered", { email });

  // Auto-sign in
  await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  redirect("/onboarding");
}

// ─── Login ─────────────────────────────────────────────────────
export async function loginUser(formData: FormData) {
  const rateLimitError = await rateLimitAuth("login");
  if (rateLimitError) return { error: rateLimitError };

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
    return { error: "Invalid email or password" };
  }

  // Check if Super Admin → redirect to admin panel instead of clinic dashboard
  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { isSuperAdmin: true },
  });

  if (user?.isSuperAdmin) {
    redirect("/admin");
  }

  redirect("/dashboard");
}

// ─── Clinic Onboarding ─────────────────────────────────────────
export async function createClinic(formData: FormData) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    address: formData.get("address") as string,
    city: formData.get("city") as string,
    state: formData.get("state") as string,
    country: (formData.get("country") as string) || "IN",
  };

  const parsed = createClinicSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  let slug = slugify(data.name);

  // Ensure unique slug
  const existingSlug = await db.clinic.findUnique({ where: { slug } });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Create clinic + default roles + permissions + membership + trial subscription in transaction
  const clinic = await db.$transaction(async (tx) => {
    // 1. Create clinic
    const clinic = await tx.clinic.create({
      data: {
        name: data.name,
        slug,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country,
      },
    });

    // 2. Seed all permissions if not yet present
    for (const code of ALL_PERMISSION_CODES) {
      const mod = code.split(":")[0];
      await tx.permission.upsert({
        where: { code },
        create: { code, module: mod, description: code },
        update: {},
      });
    }

    // 3. Create default roles with permissions
    for (const [roleName, permCodes] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const role = await tx.role.create({
        data: {
          clinicId: clinic.id,
          name: roleName,
          isSystem: true,
        },
      });

      for (const code of permCodes) {
        const perm = await tx.permission.findUnique({ where: { code } });
        if (perm) {
          await tx.rolePermission.create({
            data: { roleId: role.id, permissionId: perm.id },
          });
        }
      }
    }

    // 4. Assign creating user as Owner
    const ownerRole = await tx.role.findUnique({
      where: { clinicId_name: { clinicId: clinic.id, name: "Owner" } },
    });

    await tx.clinicMember.create({
      data: {
        clinicId: clinic.id,
        userId: session.user.id,
        roleId: ownerRole!.id,
      },
    });

    // 5. Create trial subscription
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);

    await tx.subscription.create({
      data: {
        clinicId: clinic.id,
        plan: "TRIAL",
        status: "TRIALING",
        trialEndsAt: trialEnd,
      },
    });

    return clinic;
  });

  logger.info("Clinic created", { clinicId: clinic.id, name: clinic.name });

  redirect("/dashboard");
}
