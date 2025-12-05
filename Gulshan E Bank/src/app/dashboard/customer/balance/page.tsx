
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { CheckBalanceDialog } from "./check-balance-dialog";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export default function BalancePage() {
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(false);

  const handleCorrectPin = () => {
    setShowBalance(true);
  };

  const toggleBalanceVisibility = () => {
    setShowBalance((prev) => !prev);
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Account Balance</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
            <CardDescription>Your primary checking account.</CardDescription>
          </CardHeader>
          <CardContent>
            {showBalance ? (
              <div className="flex items-center gap-4">
                 <p className="text-4xl font-bold text-primary">₹0.00</p>
                 <Button variant="ghost" size="icon" onClick={toggleBalanceVisibility}>
                    <EyeOff className="h-6 w-6" />
                    <span className="sr-only">Hide Balance</span>
                 </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
                <p className="text-muted-foreground">Balance is hidden</p>
                <CheckBalanceDialog onCorrectPin={handleCorrectPin}>
                  <Button>
                    <Eye className="mr-2 h-4 w-4" /> Check Balance
                  </Button>
                </CheckBalanceDialog>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Account ending in **** 0000</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Type:</span>
              <span>Checking</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="secondary" className="bg-green-200 text-green-800">
                Active
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Holder:</span>
              <span>{user?.displayName ?? "User"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
