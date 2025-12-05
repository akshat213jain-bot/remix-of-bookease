"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import Image from "next/image";

export default function LoansPage() {
    return (
        <div className="grid gap-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Loan Overview</h1>
                <Button className="w-full md:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Apply for New Loan
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Your Loans</CardTitle>
                    <CardDescription>You currently have no active loans.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                         <Image src="https://picsum.photos/seed/6/350/250" alt="Loan documents" width={350} height={250} className="mb-4 rounded-lg" data-ai-hint="documents paperwork" />
                        <p className="font-semibold text-lg mt-2">No active loans found</p>
                        <p className="text-sm">Apply for a new loan to get started.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
