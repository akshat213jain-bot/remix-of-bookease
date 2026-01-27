import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2 } from "lucide-react";
import { usePublicProviderReviews } from "@/hooks/useReviews";
import ReviewCard from "./ReviewCard";
import { cn } from "@/lib/utils";

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
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderReviewsList;
