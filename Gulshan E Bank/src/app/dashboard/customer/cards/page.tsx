"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import Image from "next/image";

export default function CardsPage() {
    return (
        <div className="grid gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Cards Management</h1>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Request New Card
                </Button>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Your Cards</CardTitle>
                        <CardDescription>You currently have no cards associated with your account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                           <Image src="https://picsum.photos/seed/2/400/250" alt="Credit Card" width={400} height={250} className="mb-4 rounded-lg" data-ai-hint="credit card" />
                           <p className="font-semibold text-lg mt-2">No cards found</p>
                           <p className="text-sm">Request a new card to get started.</p>
                       </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
