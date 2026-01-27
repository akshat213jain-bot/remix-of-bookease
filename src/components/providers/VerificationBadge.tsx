import { BadgeCheck, ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  isVerified: boolean;
  verificationType?: string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const VerificationBadge = ({
  isVerified,
  verificationType,
  size = "md",
  showLabel = false,
}: VerificationBadgeProps) => {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const getVerificationLabel = () => {
    switch (verificationType) {
      case "license":
        return "Licensed Professional";
      case "credentials":
        return "Credentials Verified";
      case "background":
        return "Background Checked";
      case "identity":
        return "Identity Verified";
      default:
        return "Verified Provider";
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center gap-1 text-primary",
            showLabel && "bg-primary/10 px-2 py-1 rounded-full"
          )}
        >
          <BadgeCheck className={cn(sizeClasses[size], "fill-primary/20")} />
          {showLabel && (
            <span className="text-xs font-medium">{getVerificationLabel()}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span>{getVerificationLabel()}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This provider's credentials have been verified by our team.
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
