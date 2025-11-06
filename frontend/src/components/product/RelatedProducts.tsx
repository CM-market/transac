import ProductCard from "@/components/product/ProductCard";
import { useCart } from "@/hooks/useCart";
import { Product } from "@/types/product";
import React from "react";

interface RelatedProductsProps {
  products: Product[];
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ products }) => {
  const { addToCart } = useCart();
  return (
    <div className="mt-20">
      <h2 className="text-3xl font-bold text-foreground mb-8">
        Related Products
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={addToCart}
          />
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
