
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { 
    Banknote, 
    Landmark, 
    Ban, 
    ArrowUpRight, 
    ArrowRightLeft, 
    Receipt, 
    FileText, 
    MessageSquare,
    ShieldCheck,
    QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const mockTransactions: any[] = [];

const quickLinks = [
    { href: "/dashboard/customer/transfers", label: "Transfer Funds", icon: ArrowRightLeft },
    { href: "/dashboard/customer/payments", label: "Pay Bills", icon: Receipt },
    { href: "/dashboard/customer/scanner", label: "Scan & Pay", icon: QrCode },
    { href: "/dashboard/customer/statements", label: "View Statements", icon: FileText },
]

const recentActivity = [
    { 
        type: 'login',
        description: 'Successful login from new device',
        timestamp: '2 hours ago',
        icon: ShieldCheck
    },
    { 
        type: 'message',
        description: 'New message from your relationship manager',
        timestamp: '1 day ago',
        icon: MessageSquare
    }
];

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="relative">
      <div className="grid gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.displayName ?? "User"}!</h1>
          <p className="text-muted-foreground">Here's a summary of your accounts and recent activity.</p>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-1 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Savings Account</CardTitle>
                  <CardDescription>Account ending in **** 0000</CardDescription>
              </div>
              <Landmark className="h-8 w-8 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-4xl font-bold text-primary">₹0.00</p>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Available Balance</span>
                   <Badge variant="secondary" className="bg-green-200 text-green-800">
                      Active
                  </Badge>
              </div>
            </CardContent>
          </Card>
           <Card className="lg:col-span-1 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Current Account</CardTitle>
                  <CardDescription>Account ending in **** 0000</CardDescription>
              </div>
              <Banknote className="h-8 w-8 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-4xl font-bold text-primary">₹0.00</p>
               <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Available Balance</span>
                   <Badge variant="secondary" className="bg-green-200 text-green-800">
                      Active
                  </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

         <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center">
                  <div className="grid gap-2">
                      <CardTitle>Recent Transactions</CardTitle>
                      <CardDescription>
                      An overview of your most recent transactions.
                      </CardDescription>
                  </div>
                  <Button asChild size="sm" className="ml-auto gap-1 transition-all duration-300 hover:gap-2">
                      <Link href="/dashboard/customer/history">
                      View All
                      <ArrowUpRight className="h-4 w-4" />
                      </Link>
                  </Button>
              </CardHeader>
              <CardContent>
                {mockTransactions.length > 0 ? (
                    <div className="divide-y">
                      {/* Transaction items would go here */}
                    </div>
                ) : (
                      <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg h-full">
                          <Ban className="h-12 w-12 mb-4" />
                          <p>No recent transactions</p>
                          <p className="text-sm">Your latest transactions will appear here.</p>
                      </div>
                )}
              </CardContent>
            </Card>
            <div className="grid gap-6">
               <Card>
                  <CardHeader>
                      <CardTitle>Quick Links</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                      {quickLinks.map((link) => (
                          <Button key={link.href} variant="ghost" className="justify-start" asChild>
                              <Link href={link.href}>
                                  <link.icon className="mr-2 h-4 w-4" />
                                  {link.label}
                              </Link>
                          </Button>
                      ))}
                  </CardContent>
               </Card>
               <Card>
                  <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                      {recentActivity.map((activity, index) => (
                           <div key={index} className="flex items-center gap-4">
                              <div className="bg-secondary p-2 rounded-full">
                                  <activity.icon className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                  <p className="text-sm font-medium">{activity.description}</p>
                                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                              </div>
                           </div>
                      ))}
                  </CardContent>
               </Card>
            </div>
         </div>
      </div>
      
      <div className="fixed bottom-8 right-8 z-50">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button asChild className="rounded-full w-16 h-16 shadow-lg hover:scale-110 transition-transform duration-300">
                        <Link href="/dashboard/customer/scanner">
                            <QrCode className="w-8 h-8" />
                            <span className="sr-only">Scan & Pay</span>
                        </Link>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <p>Scan & Pay</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
