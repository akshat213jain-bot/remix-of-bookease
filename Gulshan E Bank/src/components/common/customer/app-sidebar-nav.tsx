
"use client";

import {
  ArrowRightLeft,
  Bot,
  Calculator,
  CreditCard,
  FileText,
  History,
  LayoutGrid,
  ShieldCheck,
  User,
  Wallet,
  Receipt,
  FileDown,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard/customer", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/customer/balance", label: "Accounts", icon: Wallet },
  { href: "/dashboard/customer/transfers", label: "Transfers", icon: ArrowRightLeft },
  { href: "/dashboard/customer/payments", label: "Bill Payments", icon: Receipt },
  { href: "/dashboard/customer/history", label: "Transactions", icon: History },
  { href: "/dashboard/customer/statements", label: "Statements", icon: FileDown },
  { href: "/dashboard/customer/cards", label: "Cards", icon: CreditCard },
  { href: "/dashboard/customer/loans", label: "Loans", icon: FileText },
  { href: "/dashboard/customer/assistant", label: "AI Assistant", icon: Bot },
  { href: "/dashboard/customer/security", label: "Security", icon: ShieldCheck },
  { href: "/dashboard/customer/calculator", label: "Calculator", icon: Calculator },
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
              isActive={pathname.startsWith(link.href) && (link.href !== '/dashboard/customer' || pathname === '/dashboard/customer')}
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
