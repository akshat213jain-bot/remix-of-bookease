
"use client";

import {
  Users,
  FileCheck,
  CreditCard,
  Handshake,
  MessageSquare,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const links = [
  { href: "/dashboard/staff", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/staff/customers", label: "Customer Management", icon: Users },
  { href: "/dashboard/staff/accounts", label: "Account Management", icon: Handshake },
  { href: "/dashboard/staff/requests", label: "Service Requests", icon: CreditCard },
  { href: "/dashboard/staff/transactions", label: "Transaction Processing", icon: FileCheck },
  { href: "/dashboard/staff/kyc", label: "KYC & Compliance", icon: FileCheck },
  { href: "/dashboard/staff/messaging", label: "Internal Messaging", icon: MessageSquare },
];

export function AppSidebarNav() {
  const pathname = usePathname();
  return (
     <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <Link href={link.href} className="w-full">
            <SidebarMenuButton
              size="lg"
              isActive={pathname.startsWith(link.href) && (link.href !== '/dashboard/staff' || pathname === '/dashboard/staff')}
              tooltip={link.label}
              className="w-full justify-start"
            >
              <link.icon className="size-6" />
              <span>{link.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
