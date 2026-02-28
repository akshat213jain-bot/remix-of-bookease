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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    AlertCircle,
    Loader2,
    Mail,
    Clock,
    Calendar,
    User,
    RefreshCw,
    Video,
} from "lucide-react";
import { useProviderPendingPayments } from "@/hooks/useProviderPendingPayments";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/currency";

const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case "pending":
            return <Badge variant="secondary">Pending Approval</Badge>;
        case "approved":
            return <Badge className="bg-green-500/10 text-green-600 border-green-200">Approved</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
};

const getPaymentStatusBadge = (status: string) => {
    switch (status) {
        case "unpaid":
            return <Badge variant="destructive">Unpaid</Badge>;
        case "pending":
            return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200">Payment Pending</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
};

export const PendingPaymentsPanel = () => {
    const {
        pendingPayments,
        summary,
        isLoading,
        refetch,
        sendReminder,
        isSendingReminder,
    } = useProviderPendingPayments();

    const [selectedPayment, setSelectedPayment] = useState<{
        id: string;
        consumerName: string;
        consumerEmail: string;
        amount: number;
        date: string;
    } | null>(null);
    const [customMessage, setCustomMessage] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleSendReminderClick = (payment: typeof pendingPayments[0]) => {
        setSelectedPayment({
            id: payment.id,
            consumerName: payment.consumer_name,
            consumerEmail: payment.consumer_email,
            amount: payment.amount,
            date: payment.appointment_date,
        });
        setCustomMessage("");
        setDialogOpen(true);
    };

    const handleConfirmSendReminder = () => {
        if (selectedPayment) {
            sendReminder({
                appointmentId: selectedPayment.id,
                customMessage: customMessage.trim() || undefined,
            });
            setDialogOpen(false);
            setSelectedPayment(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Pending</p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {formatCurrency(summary?.total_pending || 0)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-orange-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Unpaid Appointments</p>
                                <p className="text-2xl font-bold">{summary?.count || 0}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <Clock className="h-6 w-6 text-muted-foreground" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Payments Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        Pending Payments
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent>
                    {pendingPayments.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Consumer</TableHead>
                                    <TableHead>Appointment</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingPayments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{payment.consumer_name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {payment.consumer_email}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm">
                                                            {format(parseISO(payment.appointment_date), "MMM d, yyyy")}
                                                        </p>
                                                        {payment.is_video_consultation && (
                                                            <Badge variant="outline" className="text-xs">
                                                                <Video className="h-3 w-3 mr-1" />
                                                                Video
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatTime(payment.start_time)} - {formatTime(payment.end_time)}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-semibold text-orange-600">
                                                {formatCurrency(payment.amount || 0)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {getPaymentStatusBadge(payment.payment_status)}
                                                <div>{getStatusBadge(payment.appointment_status)}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleSendReminderClick(payment)}
                                                disabled={isSendingReminder}
                                            >
                                                <Mail className="h-4 w-4 mr-2" />
                                                Send Reminder
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No Pending Payments</p>
                            <p className="text-sm">All your appointments are paid or completed!</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Send Reminder Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Payment Reminder</DialogTitle>
                        <DialogDescription>
                            Send a reminder email to{" "}
                            <span className="font-medium">{selectedPayment?.consumerName}</span> (
                            {selectedPayment?.consumerEmail}) for their pending payment of{" "}
                            <span className="font-medium text-orange-600">
                                {formatCurrency(selectedPayment?.amount || 0)}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="custom-message">Custom Message (Optional)</Label>
                            <Textarea
                                id="custom-message"
                                placeholder="Add a personal message to the reminder email..."
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave blank to send the default reminder message.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmSendReminder}
                            disabled={isSendingReminder}
                        >
                            {isSendingReminder && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            <Mail className="h-4 w-4 mr-2" />
                            Send Reminder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PendingPaymentsPanel;
