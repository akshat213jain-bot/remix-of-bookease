"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown } from "lucide-react";

export default function StatementsPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Statements & Reports</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Download Account Statement</CardTitle>
          <CardDescription>
            Select your account and desired format to download your statement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <Select>
                  <SelectTrigger id="account">
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">
                      Savings Account (**** 0000)
                    </SelectItem>
                    <SelectItem value="current">
                      Current Account (**** 0000)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">Time Period</Label>
                <Select>
                  <SelectTrigger id="period">
                    <SelectValue placeholder="Select a time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="6m">Last 6 months</SelectItem>
                    <SelectItem value="1y">Last 1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <Select>
                  <SelectTrigger id="format">
                    <SelectValue placeholder="Select file format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel (XLSX)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              Download Statement
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
