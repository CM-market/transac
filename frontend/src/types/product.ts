export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  stock: number;
  discount: number;
  supplier: {
    name: string;
    isVerified: boolean;
  };
  rating: number;
  reviews: number;
  category: string;
  tags?: string[];
  materials?: string;
  dimensions?: string;
  returnPolicy?: string;
  shippingInfo?: string;
  productReviews?: Review[]; // Add an array of reviews to the Product interface
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number; // 1-5 stars
  comment: string;
  date: string; // ISO date string
}
