
"use client";

import { Bell } from "lucide-react";
import { UserNav } from "./user-nav";
import { Button } from "../ui/button";

export function AppBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
        {children}
        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <UserNav />
        </div>
    </header>
  );
}
