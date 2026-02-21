import { Card, CardContent } from "@/components/ui/card";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function AppointmentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>
      <Card>
        <CardContent className="p-4 flex gap-4">
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-16 rounded-md" />
        </CardContent>
      </Card>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="space-y-1 min-w-15">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-3 w-14" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
