
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ban, Bell, ShieldCheck, Gift, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const notifications = [
    {
        icon: ShieldCheck,
        color: "text-green-500",
        title: "Security Alert: New Login",
        message: "A new device has logged into your account. If this wasn't you, please secure your account immediately.",
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    },
    {
        icon: Gift,
        color: "text-primary",
        title: "You've Earned a Reward!",
        message: "Congratulations! You have received 500 reward points for your recent transaction.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
    {
        icon: Megaphone,
        color: "text-accent",
        title: "New Feature: EMI Calculator",
        message: "Plan your finances better with our new in-app EMI calculator. Check it out now!",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    },
    {
        icon: Bell,
        color: "text-muted-foreground",
        title: "Reminder: Bill Payment Due",
        message: "Your credit card bill is due in 3 days. Pay now to avoid late fees.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    }
];

export default function NotificationsPage() {
    return (
        <div className="grid gap-6">
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Alerts & Announcements</CardTitle>
                    <CardDescription>Stay updated with the latest information from the bank.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {notifications.length > 0 ? (
                        notifications.map((notification, index) => (
                             <div key={index} className="flex items-start gap-4 rounded-lg border p-4 transition-all hover:bg-secondary">
                                <notification.icon className={cn("h-6 w-6 mt-1 flex-shrink-0", notification.color)} />
                                <div className="grid gap-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold">{notification.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                        </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                         <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                            <Ban className="h-12 w-12 mb-4" />
                            <p>No notifications</p>
                            <p className="text-sm">You're all caught up!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
