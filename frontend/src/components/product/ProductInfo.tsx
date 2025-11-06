import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types/product";
import {
  Check,
  Heart,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

interface ProductInfoProps {
  product: Product;
  quantity: number;
  onQuantityChange: (delta: number) => void;
  onAddToCart: () => void;
  onWishlistClick: () => void;
  isWishlisted: boolean;
}

const ProductInfo: React.FC<ProductInfoProps> = ({
  product,
  quantity,
  onQuantityChange,
  onAddToCart,
  onWishlistClick,
  isWishlisted,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <Badge className="bg-primary text-primary-foreground font-semibold mb-3 w-fit">
          {product.category}
        </Badge>
        <h1 className="text-4xl font-extrabold text-cm-forest mb-3">
          {product.name}
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${i < Math.round(product.rating) ? "text-primary" : "text-muted-foreground"}`}
                fill="currentColor"
              />
            ))}
          </div>
          <span className="text-md text-muted-foreground">
            {t("product.productInfo.reviews", { count: product.reviews })}
          </span>
        </div>
      </div>

      <p className="text-muted-foreground text-lg leading-relaxed">
        {product.description}
      </p>

      <div>
        <span className="text-4xl font-extrabold text-cm-forest">
          {(product.price * (1 - product.discount / 100)).toLocaleString()} FCFA
        </span>
        {product.discount > 0 && (
          <span className="ml-3 text-2xl text-muted-foreground line-through">
            {product.price.toLocaleString()} FCFA
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-lg font-semibold">
        {product.stock > 0 ? (
          <>
            <Check size={20} className="text-green-600" />
            <span className="text-green-600">
              {t("product.productInfo.inStock")}
            </span>
          </>
        ) : (
          <span className="text-red-600">
            {t("product.productInfo.outOfStock")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center border border-border rounded-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onQuantityChange(-1)}
            disabled={quantity <= 1}
          >
            <Minus size={16} />
          </Button>
          <span className="mx-4 w-8 text-center font-bold text-lg">
            {quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onQuantityChange(1)}
            disabled={quantity >= product.stock}
          >
            <Plus size={16} />
          </Button>
        </div>
        <Button
          size="lg"
          onClick={onAddToCart}
          className="flex-1 bg-cm-green text-white hover:bg-cm-forest font-bold text-lg rounded-lg"
        >
          <ShoppingCart className="mr-2" size={20} />
          {t("product.productInfo.addToCart")}
        </Button>
        <Button size="icon" variant="outline" onClick={onWishlistClick}>
          <Heart
            className={`h-5 w-5 ${isWishlisted ? "text-destructive fill-current" : "text-muted-foreground"}`}
          />
        </Button>
        <Button size="icon" variant="outline">
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      <Card className="bg-card border-border rounded-lg">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <ShieldCheck className="h-8 w-8 text-cm-green" />
            <div>
              <h4 className="font-semibold">
                {t("product.productInfo.verifiedSeller")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("product.productInfo.verifiedSellerDescription")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Truck className="h-8 w-8 text-cm-green" />
            <div>
              <h4 className="font-semibold">
                {t("product.productInfo.fastDelivery")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("product.productInfo.fastDeliveryDescription")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductInfo;
