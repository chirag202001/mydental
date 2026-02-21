import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Search } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-6 max-w-md">
        <Search className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold">Not Found</h1>
        <p className="text-muted-foreground">
          The resource you&apos;re looking for doesn&apos;t exist or you don&apos;t have
          permission to view it.
        </p>
        <Link href="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
