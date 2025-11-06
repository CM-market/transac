import { render, screen, fireEvent } from "@testing-library/react";
import Reviews from "../Reviews";
import {
  useReviewsServicePostProductsByIdReviews,
  useReviewsServiceGetProductsByIdReviews,
} from "@/openapi-rq/queries";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/openapi-rq/queries");

const mockMutate = vi.fn();
const mockReviews = [
  { id: "1", rating: 5, comment: "Great product!" },
  { id: "2", rating: 4, comment: "Good product." },
];

describe("Reviews", () => {
  beforeEach(() => {
    (
      useReviewsServiceGetProductsByIdReviews as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      data: mockReviews,
    });
    (
      useReviewsServicePostProductsByIdReviews as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      mutate: mockMutate,
    });
  });

  it("renders the average rating and total reviews", () => {
    render(<Reviews productId="1" />);

    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("Based on 2 reviews")).toBeInTheDocument();
  });

  it("renders the list of reviews", () => {
    render(<Reviews productId="1" />);

    expect(screen.getByText("Great product!")).toBeInTheDocument();
    expect(screen.getByText("Good product.")).toBeInTheDocument();
  });

  it("submits a new review", () => {
    render(<Reviews productId="1" />);

    fireEvent.click(screen.getAllByRole("button", { name: /star/i })[4]); // 5 stars
    fireEvent.change(
      screen.getByPlaceholderText("Share your thoughts about the product..."),
      {
        target: { value: "Amazing!" },
      },
    );
    fireEvent.click(screen.getByText("Submit Review"));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: "1",
        requestBody: {
          rating: 5,
          comment: "Amazing!",
          user_id: "00000000-0000-0000-0000-000000000000",
        },
      },
      expect.any(Object),
    );
  });
});
