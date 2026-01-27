import jsPDF from "jspdf";
import { format } from "date-fns";

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  patientName: string;
  patientEmail: string;
  providerName: string;
  providerProfession: string;
  providerLocation?: string;
  appointmentDate: string;
  appointmentTime: string;
  isVideoConsultation: boolean;
  amount: number;
  currency: string;
  paymentStatus: string;
  paymentDate?: string;
}

export const generateInvoice = (data: InvoiceData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const textColor: [number, number, number] = [31, 41, 55];
  const mutedColor: [number, number, number] = [107, 114, 128];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 20, 26);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`#${data.invoiceNumber}`, pageWidth - 20, 20, { align: "right" });
  doc.text(`Date: ${format(new Date(data.date), "MMM d, yyyy")}`, pageWidth - 20, 28, { align: "right" });

  // Company Info
  doc.setTextColor(...textColor);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("BookEase", 20, 55);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  doc.text("Professional Appointment Booking Platform", 20, 62);

  // Bill To Section
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 20, 80);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(data.patientName, 20, 88);
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text(data.patientEmail, 20, 95);

  // Provider Info
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PROVIDER:", pageWidth - 80, 80);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(data.providerName, pageWidth - 80, 88);
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text(data.providerProfession, pageWidth - 80, 95);
  if (data.providerLocation) {
    doc.text(data.providerLocation, pageWidth - 80, 102);
  }

  // Line separator
  doc.setDrawColor(229, 231, 235);
  doc.line(20, 115, pageWidth - 20, 115);

  // Invoice Details Table Header
  const tableTop = 125;
  doc.setFillColor(249, 250, 251);
  doc.rect(20, tableTop, pageWidth - 40, 12, "F");
  
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIPTION", 25, tableTop + 8);
  doc.text("DATE", 100, tableTop + 8);
  doc.text("TYPE", 130, tableTop + 8);
  doc.text("AMOUNT", pageWidth - 25, tableTop + 8, { align: "right" });

  // Invoice Details Row
  const rowTop = tableTop + 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Consultation Service", 25, rowTop);
  doc.text(format(new Date(data.appointmentDate), "MMM d, yyyy"), 100, rowTop);
  doc.text(data.isVideoConsultation ? "Video" : "In-Person", 130, rowTop);
  
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: data.currency,
  }).format(data.amount);
  doc.text(formattedAmount, pageWidth - 25, rowTop, { align: "right" });

  // Appointment Time
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text(`Time: ${data.appointmentTime}`, 25, rowTop + 7);

  // Totals Section
  const totalsTop = rowTop + 30;
  doc.setDrawColor(229, 231, 235);
  doc.line(120, totalsTop, pageWidth - 20, totalsTop);

  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.text("Subtotal:", 130, totalsTop + 12);
  doc.text(formattedAmount, pageWidth - 25, totalsTop + 12, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total:", 130, totalsTop + 26);
  doc.setTextColor(...primaryColor);
  doc.text(formattedAmount, pageWidth - 25, totalsTop + 26, { align: "right" });

  // Payment Status Badge
  const statusTop = totalsTop + 45;
  const statusText = data.paymentStatus === "paid" ? "PAID" : "PENDING";
  const statusColor: [number, number, number] = data.paymentStatus === "paid" 
    ? [16, 185, 129] // Green
    : [245, 158, 11]; // Amber
  
  doc.setFillColor(...statusColor);
  doc.roundedRect(20, statusTop, 50, 18, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, 45, statusTop + 12, { align: "center" });

  if (data.paymentDate) {
    doc.setTextColor(...mutedColor);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Payment received: ${format(new Date(data.paymentDate), "MMM d, yyyy")}`, 75, statusTop + 12);
  }

  // Footer
  const footerTop = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(229, 231, 235);
  doc.line(20, footerTop, pageWidth - 20, footerTop);
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for choosing BookEase!", pageWidth / 2, footerTop + 10, { align: "center" });
  doc.text("For questions about this invoice, please contact support.", pageWidth / 2, footerTop + 18, { align: "center" });

  // Save the PDF
  doc.save(`invoice-${data.invoiceNumber}.pdf`);
};

export const generateInvoiceFromAppointment = (appointment: {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time?: string;
  is_video_consultation?: boolean;
  payment_amount?: number | null;
  payment_status?: string | null;
  payment_date?: string | null;
  provider_name?: string | null;
  provider_profession?: string | null;
  provider_location?: string | null;
  user_name?: string | null;
  user_email?: string | null;
}, currency: { code: string } = { code: "USD" }): void => {
  const invoiceData: InvoiceData = {
    invoiceNumber: appointment.id.slice(0, 8).toUpperCase(),
    date: new Date().toISOString(),
    patientName: appointment.user_name || "Patient",
    patientEmail: appointment.user_email || "",
    providerName: appointment.provider_name || "Provider",
    providerProfession: appointment.provider_profession || "Healthcare Professional",
    providerLocation: appointment.provider_location || undefined,
    appointmentDate: appointment.appointment_date,
    appointmentTime: appointment.start_time,
    isVideoConsultation: appointment.is_video_consultation || false,
    amount: appointment.payment_amount || 0,
    currency: currency.code,
    paymentStatus: appointment.payment_status || "pending",
    paymentDate: appointment.payment_date || undefined,
  };

  generateInvoice(invoiceData);
};
