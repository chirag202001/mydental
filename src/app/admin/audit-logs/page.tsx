import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchForm } from "@/components/admin/search-form";
import { ScrollText } from "lucide-react";
import Link from "next/link";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase();
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const perPage = 50;
  const skip = (page - 1) * perPage;

  const [allLogs, totalCount] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
      include: {
        clinic: { select: { name: true } },
      },
    }),
    db.auditLog.count(),
  ]);

  // Filter in JS if search query provided
  const logs = query
    ? allLogs.filter(
        (l) =>
          l.action.toLowerCase().includes(query) ||
          l.entity.toLowerCase().includes(query) ||
          l.clinic.name.toLowerCase().includes(query) ||
          l.metadata?.toLowerCase().includes(query)
      )
    : allLogs;

  const totalPages = Math.ceil(totalCount / perPage);

  function getActionColor(action: string) {
    const a = action.toLowerCase();
    if (a.includes("create") || a.includes("add")) return "bg-green-100 text-green-700";
    if (a.includes("update") || a.includes("edit") || a.includes("change"))
      return "bg-blue-100 text-blue-700";
    if (a.includes("delete") || a.includes("remove") || a.includes("deactivate"))
      return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Platform-wide activity log · {totalCount.toLocaleString("en-IN")}{" "}
          total entries
        </p>
      </div>

      <SearchForm placeholder="Search by action, entity, or clinic..." defaultValue={params.q ?? ""} />

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">Clinic</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Entity</th>
                  <th className="pb-3 font-medium">Entity ID</th>
                  <th className="pb-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3">
                      <Badge variant="outline" className="text-xs">
                        {log.clinic.name}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge className={`text-xs ${getActionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 font-medium">{log.entity}</td>
                    <td className="py-3 font-mono text-xs text-muted-foreground">
                      {log.entityId ? log.entityId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="py-3 text-xs text-muted-foreground max-w-[250px] truncate">
                      {log.metadata ? (
                        <span title={log.metadata}>
                          {log.metadata.length > 80
                            ? log.metadata.slice(0, 80) + "…"
                            : log.metadata}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">
                  {query
                    ? "No audit logs match your search."
                    : "No audit logs recorded yet."}
                </p>
                <p className="text-xs mt-1">
                  Audit logs are created when users perform actions in their
                  clinics.
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/audit-logs?page=${page - 1}${query ? `&q=${encodeURIComponent(params.q!)}` : ""}`}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    ← Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/audit-logs?page=${page + 1}${query ? `&q=${encodeURIComponent(params.q!)}` : ""}`}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
