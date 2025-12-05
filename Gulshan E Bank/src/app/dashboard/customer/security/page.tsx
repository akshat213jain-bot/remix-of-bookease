
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Smartphone, History, KeyRound, Ban } from "lucide-react";

export default function SecurityPage() {
    return (
        <div className="grid gap-6">
            <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <KeyRound className="h-6 w-6 text-primary" />
                            Change Password
                        </CardTitle>
                        <CardDescription>Update your login password regularly for better security.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input id="current-password" type="password" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input id="new-password" type="password" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input id="confirm-password" type="password" />
                        </div>
                        <Button className="w-full">Update Password</Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="h-6 w-6 text-primary" />
                            Two-Factor Authentication (2FA)
                        </CardTitle>
                        <CardDescription>Add an extra layer of security to your account.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <p className="font-medium">Enable 2FA</p>
                                <p className="text-sm text-muted-foreground">Requires a code from your authenticator app.</p>
                            </div>
                            <Switch />
                        </div>
                         <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <p className="font-medium">SMS Alerts</p>
                                 <p className="text-sm text-muted-foreground">Get an SMS for every login attempt.</p>
                            </div>
                            <Switch checked/>
                        </div>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-6 w-6 text-primary" />
                        Login History
                    </CardTitle>
                    <CardDescription>Review recent login activity on your account.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                        <Ban className="h-12 w-12 mb-4" />
                        <p>No login history found</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
