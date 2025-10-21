import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  useReviewsServicePostProductsByIdReviews,
  useReviewsServiceGetProductsByIdReviews,
} from "@/openapi-rq/queries";

const Reviews: React.FC<{ productId: string }> = ({ productId }) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const createReview = useReviewsServicePostProductsByIdReviews();
  const { data: reviews } = useReviewsServiceGetProductsByIdReviews({
    id: productId,
  });

  const totalReviews = reviews?.length || 0;
  const averageRating =
    totalReviews > 0 && reviews
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews
      : 0;

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
  };

  const handleSubmitReview = () => {
    createReview.mutate(
      {
        // @ts-expect-error - This is a workaround for a codegen issue
        id: productId,
        requestBody: {
          rating,
          comment: reviewText,
          user_id: "00000000-0000-0000-0000-000000000000", // TODO: Replace with actual user ID
        },
      },
      {
        onSuccess: () => {
          setRating(0);
          setReviewText("");
        },
      },
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
          <h3 className="text-5xl font-extrabold text-cm-forest">
            {averageRating.toFixed(1)}
          </h3>
          <div className="flex items-center my-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-6 w-6 ${
                  i < Math.round(averageRating)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                fill="currentColor"
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Based on {totalReviews} reviews
          </p>
        </div>
        <div className="col-span-2 space-y-2">
          {/* TODO: Rating distribution */}
        </div>
      </div>
      <div className="mt-8">
        <Button variant="outline">Write a review</Button>
      </div>
      <div className="mt-8 p-6 border border-border rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Leave a Review</h3>
        <div className="flex items-center mb-4">
          <p className="mr-2">Your rating:</p>
          {[...Array(5)].map((_, i) => (
            <button
              key={i}
              aria-label={`Rate ${i + 1} out of 5 stars`}
              onClick={() => handleRatingChange(i + 1)}
            >
              <Star
                className={`h-6 w-6 cursor-pointer ${i < rating ? "text-primary" : "text-muted-foreground"}`}
                fill="currentColor"
              />
            </button>
          ))}
        </div>
        <div className="mb-4">
          <label
            htmlFor="review-text"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Your review:
          </label>
          <Textarea
            id="review-text"
            rows={4}
            className="block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
            placeholder="Share your thoughts about the product..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
        </div>
        <Button
          onClick={handleSubmitReview}
          className="bg-cm-forest text-white hover:bg-cm-forest-dark"
        >
          Submit Review
        </Button>
      </div>
      <div className="mt-8 space-y-6">
        {reviews?.map((review) => (
          <div key={review.id} className="flex gap-4">
            <Avatar>
              <AvatarImage src="/placeholder.svg" alt="User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < review.rating ? "text-primary" : "text-muted-foreground"}`}
                    fill="currentColor"
                  />
                ))}
              </div>
              <p className="mt-2 text-muted-foreground">{review.comment}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reviews;
