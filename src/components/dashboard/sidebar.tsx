"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  Receipt,
  Package,
  BarChart3,
  Settings,
  Lock,
  Shield,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TenantContext } from "@/lib/tenant";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Permission required to see this item */
  permission?: string;
  /** If true, item requires the "inventory" plan feature */
  requiresFeature?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/dashboard/patients",
    label: "Patients",
    icon: Users,
    permission: "patients:read",
  },
  {
    href: "/dashboard/appointments",
    label: "Appointments",
    icon: Calendar,
    permission: "appointments:read",
  },
  {
    href: "/dashboard/treatments",
    label: "Treatments",
    icon: ClipboardList,
    permission: "treatments:read",
  },
  {
    href: "/dashboard/billing",
    label: "Billing",
    icon: Receipt,
    permission: "billing:read",
  },
  {
    href: "/dashboard/inventory",
    label: "Inventory",
    icon: Package,
    permission: "inventory:read",
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: BarChart3,
    permission: "reports:read",
  },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, permission: "settings:read" },
];

interface SidebarProps {
  activeMembership: TenantContext;
  isSuperAdmin?: boolean;
}

export function Sidebar({ activeMembership, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();

  // Filter nav items by permissions
  const visibleItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return activeMembership.permissions.includes(item.permission);
  });

  return (
    <aside className="w-64 border-r bg-background flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">D</span>
          </div>
          <span className="text-lg font-bold">DentOS</span>
        </Link>
      </div>

      {/* Role badge */}
      <div className="px-6 py-3 text-xs text-muted-foreground border-b">
        Role: <span className="font-medium text-foreground">{activeMembership.roleName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t space-y-1">
        <Link
          href="/dashboard/profile"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard/profile"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <UserCog className="h-4 w-4" />
          Profile
        </Link>
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Shield className="h-4 w-4" />
            System Admin
          </Link>
        )}
        <div className="px-3 py-1 text-xs text-muted-foreground">
          DentOS v1.0
        </div>
      </div>
    </aside>
  );
}
