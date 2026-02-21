import { requireTenantContext } from "@/lib/tenant";
import {
  getOwnerDashboardStats,
  getDentistDashboardStats,
  getReceptionDashboardStats,
  getAssistantDashboardStats,
  getAccountantDashboardStats,
} from "@/server/actions/dashboard";
import { OwnerDashboard } from "@/components/dashboard/role-dashboards/owner-dashboard";
import { DentistDashboard } from "@/components/dashboard/role-dashboards/dentist-dashboard";
import { ReceptionDashboard } from "@/components/dashboard/role-dashboards/reception-dashboard";
import { AssistantDashboard } from "@/components/dashboard/role-dashboards/assistant-dashboard";
import { AccountantDashboard } from "@/components/dashboard/role-dashboards/accountant-dashboard";

export default async function DashboardPage() {
  const ctx = await requireTenantContext();
  const role = ctx.roleName;

  // Route to role-specific dashboard
  switch (role) {
    case "Dentist": {
      const stats = await getDentistDashboardStats();
      return <DentistDashboard stats={stats} />;
    }

    case "Reception": {
      const stats = await getReceptionDashboardStats();
      return <ReceptionDashboard stats={stats} />;
    }

    case "Assistant": {
      const stats = await getAssistantDashboardStats();
      return <AssistantDashboard stats={stats} />;
    }

    case "Accountant": {
      const stats = await getAccountantDashboardStats();
      return <AccountantDashboard stats={stats} />;
    }

    // Owner & Admin get the full management dashboard
    default: {
      const stats = await getOwnerDashboardStats();
      return <OwnerDashboard stats={stats} />;
    }
  }
}
