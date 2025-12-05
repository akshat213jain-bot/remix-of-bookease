
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function UserNav() {
  const { user, role } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };
  
  if (!user) return null;

  const profileLink = role === 'staff' ? '/dashboard/staff/profile' : '/dashboard/customer/profile';
  const isVideo = user.photoURL && user.photoURL.startsWith('data:video');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              {isVideo ? (
                <video src={user.photoURL!} autoPlay loop muted playsInline className="aspect-square h-full w-full object-cover" />
              ) : (
                <AvatarImage src={user?.photoURL ?? "https://picsum.photos/100/100"} alt="@user" data-ai-hint="user avatar" />
              )}
              <AvatarFallback>
                <User />
              </AvatarFallback>
            </Avatar>
          </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName ?? "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email ?? ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href={profileLink} passHref>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
