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
}

export const dummyProducts: Product[] = [
  {
    id: "1",
    name: "Handcrafted Wooden Bowl",
    description:
      "A beautiful bowl handcrafted from locally sourced mahogany. Perfect for salads or as a decorative centerpiece.",
    price: 12500,
    images: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
    stock: 15,
    discount: 10,
    supplier: {
      name: "Artisan Woodworks",
      isVerified: true,
    },
    rating: 4.8,
    reviews: 120,
    category: "Crafts",
  },
  {
    id: "2",
    name: "Organic Arabica Coffee",
    description:
      "Rich and aromatic 100% Arabica coffee beans, grown in the volcanic soils of Cameroon's western highlands.",
    price: 7500,
    images: ["/placeholder.svg", "/placeholder.svg"],
    stock: 50,
    discount: 0,
    supplier: {
      name: "Highland Farms",
      isVerified: true,
    },
    rating: 4.9,
    reviews: 350,
    category: "Food",
  },
  {
    id: "3",
    name: "Kente Pattern Scarf",
    description:
      "Vibrant and colorful scarf made with traditional Kente patterns. A stylish accessory for any outfit.",
    price: 5000,
    images: ["/placeholder.svg"],
    stock: 30,
    discount: 20,
    supplier: {
      name: "AfroChic Textiles",
      isVerified: false,
    },
    rating: 4.5,
    reviews: 85,
    category: "Textiles",
  },
  {
    id: "4",
    name: "Bronze Abstract Sculpture",
    description:
      "A unique and captivating abstract sculpture cast in solid bronze. A true conversation starter.",
    price: 45000,
    images: ["/placeholder.svg", "/placeholder.svg"],
    stock: 5,
    discount: 0,
    supplier: {
      name: "Modern Art Foundry",
      isVerified: true,
    },
    rating: 4.7,
    reviews: 45,
    category: "Art",
  },
  {
    id: "5",
    name: "Beaded Maasai Necklace",
    description:
      "Intricate and colorful beaded necklace, handmade by Maasai artisans. A beautiful piece of wearable art.",
    price: 9000,
    images: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
    stock: 25,
    discount: 15,
    supplier: {
      name: "Tribal Treasures",
      isVerified: true,
    },
    rating: 4.9,
    reviews: 210,
    category: "Jewelry",
  },
  {
    id: "6",
    name: "Woven Raffia Placemats",
    description:
      "Set of 4 placemats, hand-woven from natural raffia palm fibers. Adds a rustic charm to your dining table.",
    price: 6000,
    images: ["/placeholder.svg"],
    stock: 40,
    discount: 0,
    supplier: {
      name: "Artisan Woodworks",
      isVerified: true,
    },
    rating: 4.7,
    reviews: 95,
    category: "Crafts",
  },
  {
    id: "7",
    name: "Spicy Penja Pepper",
    description:
      "White Penja pepper, a rare and sought-after spice from Cameroon with a unique and intense flavor.",
    price: 4500,
    images: ["/placeholder.svg"],
    stock: 100,
    discount: 0,
    supplier: {
      name: "Highland Farms",
      isVerified: true,
    },
    rating: 4.9,
    reviews: 250,
    category: "Food",
  },
  {
    id: "8",
    name: "Ebony Wood Sculpture",
    description:
      "A striking sculpture of a lion, hand-carved from a single piece of ebony wood.",
    price: 55000,
    images: ["/placeholder.svg", "/placeholder.svg"],
    stock: 3,
    discount: 10,
    supplier: {
      name: "Modern Art Foundry",
      isVerified: true,
    },
    rating: 4.8,
    reviews: 22,
    category: "Art",
  },
];
