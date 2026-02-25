import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePaymentHistory } from "@/hooks/usePaymentHistory";
import {
  CreditCard,
  Receipt,
  Download,
  Loader2,
  Banknote,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Video,
  MapPin,
} from "lucide-react";
import { format, parseISO } from "date-fns";

import { formatCurrency } from "@/lib/currency";

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    case "refunded":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          <RotateCcw className="h-3 w-3 mr-1" />
          Refunded
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status || "Unknown"}</Badge>;
  }
};

interface PaymentTransaction {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  payment_status: string;
  payment_amount: number | null;
  payment_date: string | null;
  provider_id: string;
  status: string;
  is_video_consultation: boolean;
  provider_name?: string;
  provider_profession?: string;
}

const PaymentHistoryPanel = () => {
  const { payments, isLoading, getTotals } = usePaymentHistory();
  const [receiptDialog, setReceiptDialog] = useState<{
    open: boolean;
    payment: PaymentTransaction | null;
  }>({
    open: false,
    payment: null,
  });

  const totals = getTotals();

  const handleViewReceipt = (payment: PaymentTransaction) => {
    setReceiptDialog({ open: true, payment });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(totals.totalPaid)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{totals.transactionCount}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Refunded</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(totals.totalRefunded)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No payment history yet</p>
              <p className="text-sm mt-1">Your payment transactions will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Appointment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {payment.payment_date
                              ? format(parseISO(payment.payment_date), "MMM d, yyyy")
                              : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.payment_date
                              ? format(parseISO(payment.payment_date), "h:mm a")
                              : ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {payment.provider_name || "Provider"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.provider_profession}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm">
                              {format(parseISO(payment.appointment_date), "MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(payment.start_time)}
                            </p>
                          </div>
                          {payment.is_video_consultation && (
                            <Badge variant="outline" className="text-xs h-5">
                              <Video className="h-3 w-3 mr-1" />
                              Video
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {formatCurrency(payment.payment_amount || 0)}
                        </span>
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(payment.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewReceipt(payment)}
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog.open} onOpenChange={(open) => setReceiptDialog({ open, payment: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Receipt
            </DialogTitle>
            <DialogDescription>
              Transaction details for your records
            </DialogDescription>
          </DialogHeader>

          {receiptDialog.payment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium">{receiptDialog.payment.provider_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span>{receiptDialog.payment.provider_profession}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Appointment Date</span>
                  <span>
                    {format(parseISO(receiptDialog.payment.appointment_date), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>
                    {formatTime(receiptDialog.payment.start_time)} - {formatTime(receiptDialog.payment.end_time)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="flex items-center gap-1">
                    {receiptDialog.payment.is_video_consultation ? (
                      <>
                        <Video className="h-4 w-4" />
                        Video Consultation
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4" />
                        In-Person
                      </>
                    )}
                  </span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Date</span>
                  <span>
                    {receiptDialog.payment.payment_date
                      ? format(parseISO(receiptDialog.payment.payment_date), "MMM d, yyyy 'at' h:mm a")
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {getPaymentStatusBadge(receiptDialog.payment.payment_status)}
                </div>
                <hr className="border-border" />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(receiptDialog.payment.payment_amount || 0)}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Transaction ID: {receiptDialog.payment.id.slice(0, 8)}...
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentHistoryPanel;
