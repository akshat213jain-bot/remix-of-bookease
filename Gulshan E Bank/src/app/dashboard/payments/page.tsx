"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplets, Lightbulb, Smartphone, Tv } from "lucide-react";


export default function PaymentsPage() {
    return (
        <div className="grid gap-6">
            <h1 className="text-3xl font-bold tracking-tight">Bill Payments</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Pay Your Bills</CardTitle>
                    <CardDescription>Select a category to pay your bills instantly.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="recharge">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                            <TabsTrigger value="recharge"><Smartphone className="mr-2" />Recharge</TabsTrigger>
                            <TabsTrigger value="dth"><Tv className="mr-2" />DTH</TabsTrigger>
                            <TabsTrigger value="electricity"><Lightbulb className="mr-2" />Electricity</TabsTrigger>
                            <TabsTrigger value="water"><Droplets className="mr-2" />Water</TabsTrigger>
                        </TabsList>
                        <TabsContent value="recharge" className="mt-6">
                            <BillPaymentForm service="Mobile Recharge" fieldLabel="Mobile Number" />
                        </TabsContent>
                        <TabsContent value="dth" className="mt-6">
                             <BillPaymentForm service="DTH Recharge" fieldLabel="Subscriber ID" />
                        </TabsContent>
                        <TabsContent value="electricity" className="mt-6">
                            <BillPaymentForm service="Electricity Bill" fieldLabel="Consumer Number" />
                        </TabsContent>
                         <TabsContent value="water" className="mt-6">
                             <BillPaymentForm service="Water Bill" fieldLabel="Connection ID" />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}

function BillPaymentForm({service, fieldLabel}: {service: string, fieldLabel: string}) {
    return (
        <form className="space-y-6 max-w-sm mx-auto">
            <h3 className="text-lg font-medium">{service}</h3>
            <div className="space-y-2">
                <Label htmlFor="identifier">{fieldLabel}</Label>
                <Input id="identifier" placeholder={`Enter ${fieldLabel}`} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" placeholder="Enter Amount" />
            </div>
            <Button className="w-full">Proceed to Pay</Button>
        </form>
    )
}
