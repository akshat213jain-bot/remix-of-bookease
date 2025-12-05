
'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Landmark, PanelLeft } from 'lucide-react';
import Link from 'next/link';

export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside className="hidden h-screen flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      {children}
    </aside>
  );
}

export function SidebarHeader({
  title,
  href = '/dashboard',
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
      <Link href={href} className="flex items-center gap-2 font-semibold">
        <Landmark className="h-6 w-6 text-sidebar-primary" />
        <span className="">{title}</span>
      </Link>
    </div>
  );
}

export function SidebarMenu({ children }: { children: React.ReactNode }) {
  return (
    <nav className="flex flex-col items-center gap-2 px-2 py-4 sm:py-5">
      {children}
    </nav>
  );
}

export function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  return <div className="w-full">{children}</div>;
}

export function SidebarMenuButton({
  children,
  isActive,
  tooltip,
  ...props
}: {
  children: React.ReactNode;
  isActive?: boolean;
  tooltip?: string;
} & React.ComponentProps<typeof Button>) {
  const isMobile = useIsMobile();
  const buttonContent = (
    <Button
      {...props}
      variant="ghost"
      className={cn(
        'h-12 w-full justify-start gap-2 bg-sidebar font-serif text-sidebar-primary transition-colors duration-300 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:bg-sidebar-accent focus:text-sidebar-accent-foreground focus:ring-sidebar-ring',
        {
          'bg-sidebar-accent text-sidebar-accent-foreground': isActive,
        },
        props.className
      )}
    >
      {children}
    </Button>
  );

  if (isMobile) {
    return buttonContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent side="right">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SidebarTrigger({ children }: { children: React.ReactNode }) {
  return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          {children}
        </SheetContent>
      </Sheet>
  );
}
