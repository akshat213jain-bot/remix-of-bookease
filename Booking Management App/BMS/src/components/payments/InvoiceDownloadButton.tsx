import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateInvoiceFromAppointment } from "@/lib/generateInvoice";
import { useCurrencySettings } from "@/hooks/useSystemSettings";
import { useState } from "react";

interface InvoiceDownloadButtonProps {
  appointment: {
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
  };
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  showText?: boolean;
}

export const InvoiceDownloadButton = ({
  appointment,
  variant = "outline",
  size = "sm",
  showIcon = true,
  showText = true,
}: InvoiceDownloadButtonProps) => {
  const currency = useCurrencySettings();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));
      generateInvoiceFromAppointment(appointment, currency);
    } finally {
      setIsGenerating(false);
    }
  };

  // Only show for appointments with payment info
  if (!appointment.payment_amount || appointment.payment_amount <= 0) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <Loader2 className={`h-4 w-4 animate-spin ${showText ? "mr-2" : ""}`} />
      ) : showIcon ? (
        <FileText className={`h-4 w-4 ${showText ? "mr-2" : ""}`} />
      ) : (
        <Download className={`h-4 w-4 ${showText ? "mr-2" : ""}`} />
      )}
      {showText && (isGenerating ? "Generating..." : "Invoice")}
    </Button>
  );
};
