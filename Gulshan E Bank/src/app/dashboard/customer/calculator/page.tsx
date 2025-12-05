
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import React, { useState, useMemo } from "react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];

export default function CalculatorPage() {
  // Simple/Compound Interest State
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(5);
  const [time, setTime] = useState(2);
  const [compoundingFrequency, setCompoundingFrequency] = useState(12);
  const [interest, setInterest] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  // EMI Calculator State
  const [loanAmount, setLoanAmount] = useState(100000);
  const [loanRate, setLoanRate] = useState(8);
  const [loanTenure, setLoanTenure] = useState(5); // in years
  const [emi, setEmi] = useState<number | null>(null);
  const [totalInterestPayable, setTotalInterestPayable] = useState<number | null>(null);
  const [totalPayment, setTotalPayment] = useState<number | null>(null);


  const [activeTab, setActiveTab] = useState("simple");

  const handleCalculate = () => {
    if (activeTab === "simple" || activeTab === "compound") {
        const p = principal;
        const r = rate / 100;
        const t = time;

        if (activeTab === "simple") {
        const calculatedInterest = p * r * t;
        setInterest(calculatedInterest);
        setTotal(p + calculatedInterest);
        } else {
        const n = compoundingFrequency;
        const compoundInterest = p * Math.pow(1 + r / n, n * t) - p;
        setInterest(compoundInterest);
        setTotal(p + compoundInterest);
        }
    } else if (activeTab === "emi") {
        const p = loanAmount;
        const r = loanRate / 12 / 100; // monthly rate
        const n = loanTenure * 12; // tenure in months

        if (p > 0 && r > 0 && n > 0) {
            const calculatedEmi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            const calculatedTotalPayment = calculatedEmi * n;
            const calculatedTotalInterest = calculatedTotalPayment - p;

            setEmi(calculatedEmi);
            setTotalPayment(calculatedTotalPayment);
            setTotalInterestPayable(calculatedTotalInterest);
        } else {
            setEmi(0);
            setTotalPayment(p);
            setTotalInterestPayable(0);
        }
    }
  };

  const interestChartData = useMemo(() => {
    if (total === null || interest === null) return [];
    return [
      { name: "Principal", value: principal },
      { name: "Interest", value: interest },
    ];
  }, [total, interest, principal]);
  
  const emiChartData = useMemo(() => {
    if (totalPayment === null || totalInterestPayable === null) return [];
    return [
      { name: "Principal", value: loanAmount },
      { name: "Total Interest", value: totalInterestPayable },
    ];
  }, [totalPayment, totalInterestPayable, loanAmount]);


  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Interest Calculator</h1>
      <Card>
        <CardHeader>
          <CardTitle>Financial Calculators</CardTitle>
          <CardDescription>
            Estimate simple/compound interest or calculate loan EMIs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
              <TabsTrigger value="simple">Simple Interest</TabsTrigger>
              <TabsTrigger value="compound">Compound Interest</TabsTrigger>
              <TabsTrigger value="emi">Loan EMI</TabsTrigger>
            </TabsList>

            <TabsContent value="simple">
                 <div className="mt-6 space-y-8">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                        <div className="space-y-3">
                            <Label htmlFor="principal-simple">Principal Amount (₹)</Label>
                            <Input id="principal-simple" type="number" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="text-lg"/>
                            <Slider value={[principal]} onValueChange={(value) => setPrincipal(value[0])} max={100000} step={1000} />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="rate-simple">Annual Interest Rate (%)</Label>
                            <Input id="rate-simple" type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="text-lg" />
                            <Slider value={[rate]} onValueChange={(value) => setRate(value[0])} max={20} step={0.5}/>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="time-simple">Time (Years)</Label>
                            <Input id="time-simple" type="number" value={time} onChange={(e) => setTime(Number(e.target.value))} className="text-lg" />
                            <Slider value={[time]} onValueChange={(value) => setTime(value[0])} max={30} step={1} />
                        </div>
                    </div>
                     <div className="text-center">
                        <Button onClick={handleCalculate} size="lg">Calculate</Button>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="compound">
                 <div className="mt-6 space-y-8">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                        <div className="space-y-3">
                            <Label htmlFor="principal-compound">Principal Amount (₹)</Label>
                            <Input id="principal-compound" type="number" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="text-lg" />
                            <Slider value={[principal]} onValueChange={(value) => setPrincipal(value[0])} max={100000} step={1000} />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="rate-compound">Annual Interest Rate (%)</Label>
                            <Input id="rate-compound" type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="text-lg" />
                            <Slider value={[rate]} onValueChange={(value) => setRate(value[0])} max={20} step={0.5} />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="time-compound">Time (Years)</Label>
                            <Input id="time-compound" type="number" value={time} onChange={(e) => setTime(Number(e.target.value))} className="text-lg" />
                            <Slider value={[time]} onValueChange={(value) => setTime(value[0])} max={30} step={1} />
                        </div>
                    </div>
                     <div className="space-y-3 max-w-xs mx-auto">
                        <Label htmlFor="compounding">Compounding Frequency</Label>
                        <Select value={String(compoundingFrequency)} onValueChange={(value) => setCompoundingFrequency(Number(value))}>
                            <SelectTrigger id="compounding"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Annually</SelectItem>
                                <SelectItem value="2">Semi-Annually</SelectItem>
                                <SelectItem value="4">Quarterly</SelectItem>
                                <SelectItem value="12">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="text-center">
                        <Button onClick={handleCalculate} size="lg">Calculate</Button>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="emi">
                <div className="mt-6 space-y-8">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                        <div className="space-y-3">
                            <Label htmlFor="loan-amount">Loan Amount (₹)</Label>
                            <Input id="loan-amount" type="number" value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))} className="text-lg" />
                            <Slider value={[loanAmount]} onValueChange={(value) => setLoanAmount(value[0])} max={10000000} step={10000} />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="loan-rate">Annual Interest Rate (%)</Label>
                            <Input id="loan-rate" type="number" value={loanRate} onChange={(e) => setLoanRate(Number(e.target.value))} className="text-lg" />
                            <Slider value={[loanRate]} onValueChange={(value) => setLoanRate(value[0])} max={20} step={0.1} />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="loan-tenure">Loan Tenure (Years)</Label>
                            <Input id="loan-tenure" type="number" value={loanTenure} onChange={(e) => setLoanTenure(Number(e.target.value))} className="text-lg" />
                            <Slider value={[loanTenure]} onValueChange={(value) => setLoanTenure(value[0])} max={30} step={1} />
                        </div>
                    </div>
                    <div className="text-center">
                        <Button onClick={handleCalculate} size="lg">Calculate EMI</Button>
                    </div>
                </div>
            </TabsContent>

            {(activeTab === 'simple' || activeTab === 'compound') && interest !== null && total !== null && (
                <div className="mt-8 pt-8 border-t">
                <h3 className="text-2xl font-semibold mb-6 text-center">Calculation Results</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center rounded-lg bg-secondary p-4">
                        <span className="font-medium">Principal Amount</span>
                        <span className="text-xl font-bold">
                            {principal.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                        </span>
                        </div>
                        <div className="flex justify-between items-center rounded-lg bg-secondary p-4">
                        <span className="font-medium">Total Interest</span>
                        <span className="text-xl font-bold text-primary">
                            {interest.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                        </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center rounded-lg bg-card p-4">
                        <span className="text-lg font-medium">Total Amount</span>
                        <span className="text-3xl font-bold text-primary">
                            {total.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                        </span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                            <Tooltip
                                cursor={{ fill: "hsl(var(--muted))" }}
                                contentStyle={{
                                    background: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "var(--radius)",
                                }}
                            />
                            <Pie data={interestChartData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" stroke="hsl(var(--background))" strokeWidth={2}>
                                {interestChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div>Principal</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-muted"></div>Interest</div>
                        </div>
                    </div>
                </div>
                </div>
            )}

            {activeTab === 'emi' && emi !== null && totalPayment !== null && totalInterestPayable !== null && (
                 <div className="mt-8 pt-8 border-t">
                    <h3 className="text-2xl font-semibold mb-6 text-center">EMI Calculation Results</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                         <div className="space-y-4">
                             <div className="flex justify-between items-center rounded-lg bg-secondary p-4">
                                <span className="font-medium">Loan Amount</span>
                                <span className="text-xl font-bold">
                                    {loanAmount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </span>
                             </div>
                             <div className="flex justify-between items-center rounded-lg bg-secondary p-4">
                                <span className="font-medium">Total Interest Payable</span>
                                <span className="text-xl font-bold text-primary">
                                    {totalInterestPayable.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </span>
                             </div>
                             <div className="flex justify-between items-center rounded-lg bg-card p-4">
                                <span className="text-lg font-medium">Total Payment</span>
                                <span className="text-xl font-bold text-primary">
                                    {totalPayment.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </span>
                             </div>
                            <Separator />
                             <div className="flex justify-between items-center rounded-lg bg-card p-4">
                                <span className="text-lg font-medium">Monthly EMI</span>
                                <span className="text-3xl font-bold text-primary">
                                    {emi.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </span>
                             </div>
                         </div>
                         <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                <Tooltip
                                    cursor={{ fill: "hsl(var(--muted))" }}
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "var(--radius)",
                                    }}
                                />
                                <Pie data={emiChartData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" stroke="hsl(var(--background))" strokeWidth={2}>
                                    {emiChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-4 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div>Principal</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-muted"></div>Total Interest</div>
                            </div>
                        </div>
                     </div>
                 </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

    