import { useState } from "react";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSatisfactionSurveys, SatisfactionSurvey } from "@/hooks/useSatisfactionSurveys";

interface SatisfactionSurveyDialogProps {
  survey: SatisfactionSurvey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RatingStars = ({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (val: number) => void;
  label: string;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-1 hover:scale-110 transition-transform"
        >
          <Star
            className={cn(
              "h-6 w-6 transition-colors",
              star <= value
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  </div>
);

export const SatisfactionSurveyDialog = ({
  survey,
  open,
  onOpenChange,
}: SatisfactionSurveyDialogProps) => {
  const { submitSurvey, isSubmitting } = useSatisfactionSurveys();
  const [ratings, setRatings] = useState({
    overall_rating: 0,
    communication_rating: 0,
    punctuality_rating: 0,
    value_rating: 0,
  });
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (!survey) return;
    if (
      !ratings.overall_rating ||
      !ratings.communication_rating ||
      !ratings.punctuality_rating ||
      !ratings.value_rating ||
      wouldRecommend === null
    )
      return;

    submitSurvey(
      {
        surveyId: survey.id,
        ratings: {
          ...ratings,
          would_recommend: wouldRecommend,
          feedback: feedback.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setRatings({
            overall_rating: 0,
            communication_rating: 0,
            punctuality_rating: 0,
            value_rating: 0,
          });
          setWouldRecommend(null);
          setFeedback("");
          onOpenChange(false);
        },
      }
    );
  };

  const allRated =
    ratings.overall_rating > 0 &&
    ratings.communication_rating > 0 &&
    ratings.punctuality_rating > 0 &&
    ratings.value_rating > 0 &&
    wouldRecommend !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>How was your appointment?</DialogTitle>
          <DialogDescription>
            Your feedback helps us improve our service and helps other patients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RatingStars
            label="Overall Experience"
            value={ratings.overall_rating}
            onChange={(val) =>
              setRatings((prev) => ({ ...prev, overall_rating: val }))
            }
          />

          <RatingStars
            label="Communication"
            value={ratings.communication_rating}
            onChange={(val) =>
              setRatings((prev) => ({ ...prev, communication_rating: val }))
            }
          />

          <RatingStars
            label="Punctuality"
            value={ratings.punctuality_rating}
            onChange={(val) =>
              setRatings((prev) => ({ ...prev, punctuality_rating: val }))
            }
          />

          <RatingStars
            label="Value for Money"
            value={ratings.value_rating}
            onChange={(val) =>
              setRatings((prev) => ({ ...prev, value_rating: val }))
            }
          />

          <div className="space-y-2">
            <Label>Would you recommend this provider?</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={wouldRecommend === true ? "default" : "outline"}
                onClick={() => setWouldRecommend(true)}
                className="flex-1"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Yes
              </Button>
              <Button
                type="button"
                variant={wouldRecommend === false ? "default" : "outline"}
                onClick={() => setWouldRecommend(false)}
                className="flex-1"
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                No
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Share your experience..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={!allRated || isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
