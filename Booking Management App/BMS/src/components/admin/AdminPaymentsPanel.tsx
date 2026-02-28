import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminPayments } from "@/hooks/useAdminPayments";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Search,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";

import { formatCurrency } from "@/lib/currency";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "succeeded":
      return <Badge className="bg-primary/10 text-primary">Succeeded</Badge>;
    case "pending":
    case "processing":
      return <Badge className="bg-chart-4/10 text-chart-4">Processing</Badge>;
    case "requires_payment_method":
    case "requires_confirmation":
      return <Badge variant="secondary">Pending</Badge>;
    case "canceled":
      return <Badge variant="outline">Canceled</Badge>;
    case "requires_action":
      return <Badge className="bg-accent text-accent-foreground">Action Required</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const AdminPaymentsPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    paymentIntentId: string;
    amount: number;
    reason: string;
  }>({
    open: false,
    paymentIntentId: "",
    amount: 0,
    reason: "requested_by_customer",
  });

  const {
    transactions,
    isLoadingTransactions,
    revenue,
    isLoadingRevenue,
    balance,
    isLoadingBalance,
    refund,
    isRefunding,
  } = useAdminPayments();

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.id.toLowerCase().includes(query) ||
      tx.customer_email?.toLowerCase().includes(query) ||
      tx.appointment?.user_name?.toLowerCase().includes(query) ||
      tx.appointment?.provider_name?.toLowerCase().includes(query)
    );
  });

  const handleRefund = () => {
    refund({
      paymentIntentId: refundDialog.paymentIntentId,
      reason: refundDialog.reason,
    });
    setRefundDialog({ open: false, paymentIntentId: "", amount: 0, reason: "requested_by_customer" });
  };

  const isLoading = isLoadingTransactions || isLoadingRevenue || isLoadingBalance;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(revenue?.daily.total || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {revenue?.daily.count || 0} transactions
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(revenue?.weekly.total || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {revenue?.weekly.count || 0} transactions
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(revenue?.monthly.total || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {revenue?.monthly.count || 0} transactions
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(balance?.available[0]?.amount || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending: {formatCurrency(balance?.pending[0]?.amount || 0)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Transactions
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.slice(0, 25).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div>
                          <p className="font-mono text-xs truncate max-w-[120px]">
                            {tx.id}
                          </p>
                          {tx.appointment && (
                            <p className="text-xs text-muted-foreground">
                              Appt: {format(new Date(tx.appointment.appointment_date), "MMM d")}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {tx.appointment?.user_name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.appointment?.user_email || tx.customer_email || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {tx.appointment?.provider_name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.appointment?.provider_profession || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {tx.status === "succeeded" ? (
                            <ArrowUpRight className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="font-medium">
                            {formatCurrency(tx.amount)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {format(new Date(tx.created * 1000), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created * 1000), "h:mm a")}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        {tx.status === "succeeded" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRefundDialog({
                                open: true,
                                paymentIntentId: tx.id,
                                amount: tx.amount,
                                reason: "requested_by_customer",
                              })
                            }
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Refund
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund Dialog */}
      <Dialog open={refundDialog.open} onOpenChange={(open) => setRefundDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              This will refund {formatCurrency(refundDialog.amount)} to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Refund Reason</label>
              <Select
                value={refundDialog.reason}
                onValueChange={(value) => setRefundDialog(prev => ({ ...prev, reason: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested_by_customer">Customer Request</SelectItem>
                  <SelectItem value="duplicate">Duplicate Payment</SelectItem>
                  <SelectItem value="fraudulent">Fraudulent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button onClick={handleRefund} disabled={isRefunding}>
              {isRefunding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentsPanel;
