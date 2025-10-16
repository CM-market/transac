import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, CheckCircle, Heart } from "lucide-react";
import { Product } from "@/types/product";
import { useFavorites } from "@/contexts/FavoritesContext";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const getImageUrl = (key: string) => key; // Placeholder

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const { t } = useTranslation();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();

  const isWishlisted = isFavorite(product.id);

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onAddToCart(product);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isWishlisted) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  return (
    <Link to={`/product/${product.id}`} className="block">
      <Card className="overflow-hidden group transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 border-gray-200 rounded-lg w-full">
        <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
          <img
            src={getImageUrl(product.images[0])}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-3 right-3 bg-white/70 hover:bg-white rounded-full h-9 w-9"
            onClick={handleWishlistClick}
          >
            <Heart
              className={`h-5 w-5 ${isWishlisted ? "text-red-500 fill-current" : "text-gray-600"}`}
            />
          </Button>
          {product.discount > 0 && (
            <Badge className="absolute top-3 left-3 bg-cm-red text-white font-bold text-sm">
              -{product.discount}%
            </Badge>
          )}
        </div>
        <CardContent className="p-4 bg-white">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-md font-bold text-gray-800 truncate pr-2 group-hover:text-cm-green">
              {product.name}
            </h3>
            <Badge
              variant={product.supplier.isVerified ? "default" : "secondary"}
              className="bg-green-100 text-cm-forest text-xs font-semibold shrink-0"
            >
              {product.supplier.isVerified && (
                <CheckCircle className="h-3 w-3 mr-1" />
              )}
              {product.supplier.name}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mb-3 h-10 overflow-hidden">
            {product.description}
          </p>
          <div className="flex items-center mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < Math.round(product.rating) ? "text-cm-yellow" : "text-gray-300"}`}
                  fill="currentColor"
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 ml-2">
              {t("product.productCard.reviews", { count: product.reviews })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-lg font-extrabold text-cm-forest">
                {(
                  product.price *
                  (1 - product.discount / 100)
                ).toLocaleString()}{" "}
                FCFA
              </span>
              {product.discount > 0 && (
                <span className="text-sm text-gray-500 line-through">
                  {product.price.toLocaleString()} FCFA
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleAddToCartClick}
              className="bg-cm-green text-white hover:bg-cm-forest font-semibold rounded-full"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {t("product.productCard.addToCart")}
            </Button>
          </div>
          <div className="mt-3 text-xs font-medium">
            {product.stock > 10 ? (
              <span className="text-green-600">
                {t("product.productCard.inStock")}
              </span>
            ) : product.stock > 0 ? (
              <span className="text-yellow-600">
                {t("product.productCard.limitedStock", {
                  count: product.stock,
                })}
              </span>
            ) : (
              <span className="text-red-600">
                {t("product.productCard.outOfStock")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;
