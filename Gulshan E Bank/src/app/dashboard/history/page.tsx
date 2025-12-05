import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

const mockTransactions: any[] = [];

export default function HistoryPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            Showing your transaction history for the last 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTransactions.length > 0 ? (
                mockTransactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{txn.date}</TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant={txn.type === "Credit" ? "default" : "secondary"}
                        className={
                          txn.type === "Credit"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {txn.type}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        txn.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {txn.amount.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Image src="https://picsum.photos/seed/5/300/200" alt="No transactions" width={300} height={200} className="mb-4 rounded-lg" data-ai-hint="piggy bank" />
                        <p className="font-semibold text-lg mt-2">No transactions found.</p>
                        <p className="text-sm">Your recent transactions will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
