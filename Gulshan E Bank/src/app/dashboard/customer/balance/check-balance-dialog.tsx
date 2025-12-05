
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface CheckBalanceDialogProps {
  children: React.ReactNode;
  onCorrectPin: () => void;
}

const MOCK_ATM_PIN = "1234";

export function CheckBalanceDialog({ children, onCorrectPin }: CheckBalanceDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin === MOCK_ATM_PIN) {
      toast({
        title: "PIN Verified",
        description: "Your balance is now visible.",
      });
      onCorrectPin();
      setIsOpen(false);
      setPin("");
    } else {
      setError("Incorrect PIN. Please try again.");
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state on close
      setPin("");
      setError(null);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter PIN</DialogTitle>
          <DialogDescription>
            Please enter your 4-digit ATM PIN to view your balance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleVerifyPin} className="space-y-4 py-4">
           {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="pin" className="sr-only">
              PIN
            </Label>
            <Input
              id="pin"
              type="password"
              maxLength={4}
              placeholder="****"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-2xl tracking-[1rem]"
              required
            />
          </div>
           <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">
                 Cancel
                </Button>
            </DialogClose>
            <Button type="submit">Verify PIN</Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
