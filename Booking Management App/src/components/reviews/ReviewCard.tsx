import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Review } from "@/hooks/useReviews";

interface ReviewCardProps {
  review: Review;
  isProviderView?: boolean;
  onRespond?: (reviewId: string, response: string) => void;
  isResponding?: boolean;
}

const ReviewCard = ({ 
  review, 
  isProviderView = false, 
  onRespond,
  isResponding = false,
}: ReviewCardProps) => {
  const [showResponseInput, setShowResponseInput] = useState(false);
  const [responseText, setResponseText] = useState(review.provider_response || "");

  const handleSubmitResponse = () => {
    if (onRespond && responseText.trim()) {
      onRespond(review.id, responseText.trim());
      setShowResponseInput(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4",
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Avatar>
            <AvatarImage src={review.user_profile?.avatar_url || undefined} />
            <AvatarFallback>
              {review.user_profile?.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("") || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {review.user_profile?.full_name || "Anonymous"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {renderStars(review.rating)}
                  <span className="text-sm text-muted-foreground">
                    {format(parseISO(review.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            {review.review_text && (
              <p className="text-sm text-muted-foreground">{review.review_text}</p>
            )}

            {/* Provider Response */}
            {review.provider_response && (
              <div className="mt-3 pl-4 border-l-2 border-primary/20">
                <p className="text-xs font-medium text-primary mb-1">Provider Response</p>
                <p className="text-sm text-muted-foreground">{review.provider_response}</p>
                {review.provider_response_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(review.provider_response_at), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            )}

            {/* Response Input (Provider View) */}
            {isProviderView && !review.provider_response && (
              <div className="mt-3">
                {showResponseInput ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Write your response..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleSubmitResponse}
                        disabled={!responseText.trim() || isResponding}
                      >
                        {isResponding ? "Sending..." : "Send Response"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setShowResponseInput(false);
                          setResponseText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowResponseInput(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Respond
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewCard;
