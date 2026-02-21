"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Lock, CreditCard, ShieldX, PackageX } from "lucide-react";
import Link from "next/link";

const ERROR_CONFIG: Record<
  string,
  {
    icon: typeof AlertTriangle;
    title: string;
    description: string;
    action?: { label: string; href: string };
  }
> = {
  NOT_FOUND: {
    icon: PackageX,
    title: "Not Found",
    description: "The resource you were looking for could not be found.",
  },
  FORBIDDEN: {
    icon: ShieldX,
    title: "Access Denied",
    description:
      "You don't have permission to access this resource. Contact your clinic administrator.",
  },
  SUBSCRIPTION_INACTIVE: {
    icon: CreditCard,
    title: "Subscription Inactive",
    description:
      "Your clinic subscription is inactive. Please renew to continue.",
    action: { label: "Manage Billing", href: "/dashboard/settings/billing" },
  },
  FEATURE_NOT_AVAILABLE: {
    icon: Lock,
    title: "Feature Not Available",
    description:
      "This feature is not available on your current plan. Upgrade to unlock it.",
    action: { label: "Upgrade Plan", href: "/dashboard/settings/billing" },
  },
  UNAUTHORIZED: {
    icon: Lock,
    title: "Not Authenticated",
    description: "Please log in to access this page.",
    action: { label: "Log In", href: "/login" },
  },
};

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  const config = ERROR_CONFIG[error.message] ?? {
    icon: AlertTriangle,
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
  };

  const Icon = config.icon;

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{config.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {config.description}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
            {config.action ? (
              <Link href={config.action.href}>
                <Button>{config.action.label}</Button>
              </Link>
            ) : (
              <Button onClick={reset}>Try Again</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
