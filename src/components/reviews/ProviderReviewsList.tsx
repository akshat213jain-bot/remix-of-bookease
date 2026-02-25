import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2 } from "lucide-react";
import { usePublicProviderReviews, PublicReview } from "@/hooks/useReviews";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface ProviderReviewsListProps {
  providerId: string;
  averageRating?: number | null;
  totalReviews?: number;
}

const ProviderReviewsList = ({ 
  providerId, 
  averageRating, 
  totalReviews = 0 
}: ProviderReviewsListProps) => {
  const { reviews, isLoading } = usePublicProviderReviews(providerId);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-5 w-5",
              star <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Patient Reviews</span>
          {averageRating && averageRating > 0 && (
            <div className="flex items-center gap-2">
              {renderStars(averageRating)}
              <span className="text-lg font-bold">{averageRating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to leave a review after your appointment
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={cn("h-4 w-4", star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">{format(parseISO(review.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  {review.review_text && <p className="text-sm text-muted-foreground mt-2">{review.review_text}</p>}
                  {review.provider_response && (
                    <div className="mt-3 pl-4 border-l-2 border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">Provider Response</p>
                      <p className="text-sm text-muted-foreground">{review.provider_response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderReviewsList;
