import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";

export async function Topbar() {
  const session = await auth();

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-10">
      <div />
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="View profile"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(session?.user?.name ?? "U")}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:inline">
            {session?.user?.name ?? session?.user?.email}
          </span>
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button variant="ghost" size="icon" type="submit" title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
