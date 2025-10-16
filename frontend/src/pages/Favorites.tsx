import React from "react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import ProductCard from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Favorites: React.FC = () => {
  const { favorites } = useFavorites();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex-grow">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{t("favorites.title")}</h1>
        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {favorites.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              {t("favorites.emptyMessage")}
            </p>
            <Button onClick={() => navigate("/products")}>
              {t("favorites.browseProducts")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
