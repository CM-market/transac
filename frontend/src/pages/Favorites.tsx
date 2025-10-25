import React from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { useCart } from "@/hooks/useCart";
import ProductCard from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { type Product } from "@/types/product";

const Favorites: React.FC = () => {
  const { favorites } = useFavorites();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex-grow">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-cm-forest mb-8">
          {t("favorites.title")}
        </h1>
        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
            {favorites.map((product: Product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm">
            <p className="text-xl text-gray-600 mb-4">
              {t("favorites.emptyMessage")}
            </p>
            <Button
              onClick={() => navigate("/products")}
              className="bg-cm-green hover:bg-cm-forest"
            >
              {t("favorites.browseProducts")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
