"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { loginUser } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRef, useState } from "react";
import {
  Crown,
  ShieldCheck,
  Stethoscope,
  PhoneCall,
  HandHelping,
  Calculator,
  Shield,
} from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    role: "Super Admin",
    email: "superadmin@dentos.app",
    password: "SuperAdmin@123",
    icon: Shield,
    color: "text-red-600 bg-red-50 border-red-200",
    desc: "Platform-wide system admin",
  },
  {
    role: "Owner",
    email: "owner@dentos.app",
    password: "Owner@123",
    icon: Crown,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    desc: "Full access",
  },
  {
    role: "Admin",
    email: "admin@dentos.app",
    password: "Admin@123",
    icon: ShieldCheck,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    desc: "Full access",
  },
  {
    role: "Dentist",
    email: "dentist@dentos.app",
    password: "Dentist@123",
    icon: Stethoscope,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    desc: "Patients, appointments, treatments",
  },
  {
    role: "Reception",
    email: "reception@dentos.app",
    password: "Reception@123",
    icon: PhoneCall,
    color: "text-green-600 bg-green-50 border-green-200",
    desc: "Patients, appointments, billing",
  },
  {
    role: "Assistant",
    email: "assistant@dentos.app",
    password: "Assistant@123",
    icon: HandHelping,
    color: "text-teal-600 bg-teal-50 border-teal-200",
    desc: "Read-only patients, inventory",
  },
  {
    role: "Accountant",
    email: "accountant@dentos.app",
    password: "Accountant@123",
    icon: Calculator,
    color: "text-orange-600 bg-orange-50 border-orange-200",
    desc: "Billing, reports",
  },
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign In"}
    </Button>
  );
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await loginUser(formData);
    if (result?.error) setError(result.error);
  }

  function fillAndSubmit(email: string, password: string) {
    if (emailRef.current) emailRef.current.value = email;
    if (passwordRef.current) passwordRef.current.value = password;
    setError(null);
    // Submit the form after a tick so the values are set
    setTimeout(() => formRef.current?.requestSubmit(), 50);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4 py-8">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6 items-start">
        {/* Login form */}
        <Card className="w-full lg:w-105 shrink-0">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">D</span>
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your DentOS account</CardDescription>
          </CardHeader>
          <form ref={formRef} action={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@clinic.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type="password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <SubmitButton />
              <p className="text-sm text-muted-foreground text-center">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Demo credentials panel */}
        <div className="w-full lg:flex-1">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Demo Accounts
            </h3>
            <p className="text-xs text-muted-foreground">
              Click any card to auto-fill &amp; sign in
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillAndSubmit(acc.email, acc.password)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${acc.color}`}
                >
                  <div className="mt-0.5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm">{acc.role}</div>
                    <div className="text-xs opacity-80 truncate">
                      {acc.email}
                    </div>
                    <div className="text-xs opacity-60 mt-0.5">{acc.desc}</div>
                  </div>
                  <div className="text-[10px] font-mono opacity-50 mt-0.5 shrink-0">
                    {acc.password}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
