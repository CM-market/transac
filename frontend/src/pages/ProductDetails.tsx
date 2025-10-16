import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { dummyProducts } from "@/constants/dummyProducts";
import { Product } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Skeleton } from "@/components/ui/skeleton";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductDescription from "@/components/product/ProductDescription";
import SellerInfo from "@/components/product/SellerInfo";
import Reviews from "@/components/product/Reviews";
import RelatedProducts from "@/components/product/RelatedProducts";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const foundProduct = dummyProducts.find((p) => p.id === id);
      setProduct(foundProduct || null);
      setIsLoading(false);
    }, 1000);
  }, [id]);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity);
    toast({
      title: t("productDetails.toast.addedToCart.title"),
      description: t("productDetails.toast.addedToCart.description", {
        quantity,
        productName: product.name,
      }),
    });
  };

  const handleWishlistClick = () => {
    if (!product) return;
    if (isFavorite(product.id)) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  if (isLoading) {
    return <ProductDetailsSkeleton />;
  }

  if (!product) {
    return (
      <div className="flex-grow flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {t("productDetails.productNotFound")}
          </h2>
          <p className="text-gray-600 mb-6">
            {t("productDetails.productNotFoundMessage")}
          </p>
          <Button
            onClick={() => navigate("/products")}
            className="bg-cm-green hover:bg-cm-forest"
          >
            <ArrowLeft size={16} className="mr-2" />{" "}
            {t("productDetails.backToProducts")}
          </Button>
        </div>
      </div>
    );
  }

  const relatedProducts = dummyProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="flex-grow bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">{t("navigation.home")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/products">{t("navigation.products")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <ProductImageGallery
              images={product.images}
              productName={product.name}
            />
          </div>
          <div className="lg:col-span-3">
            <ProductInfo
              product={product}
              quantity={quantity}
              onQuantityChange={handleQuantityChange}
              onAddToCart={handleAddToCart}
              onWishlistClick={handleWishlistClick}
              isWishlisted={product ? isFavorite(product.id) : false}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mt-12">
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                <ProductDescription description={product.description} />
                <Separator className="my-8" />
                <Reviews productId={product.id} />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <SellerInfo seller={product.supplier} />
          </div>
        </div>

        <RelatedProducts products={relatedProducts} />
      </div>

      {/* Sticky Add to Cart Bar for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-lg">
        <Button
          size="lg"
          onClick={handleAddToCart}
          className="w-full bg-cm-green text-white hover:bg-cm-forest font-bold text-lg rounded-lg"
        >
          <ShoppingCart className="mr-2" size={20} />
          {t("productDetails.addToCart")}
        </Button>
      </div>
    </div>
  );
};

const ProductDetailsSkeleton: React.FC = () => (
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
    <Skeleton className="h-8 w-64 mb-8" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div>
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="grid grid-cols-5 gap-3 mt-4">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="aspect-square w-full rounded-lg" />
        </div>
      </div>
      <div className="space-y-6">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-1/3" />
        <div className="flex gap-4">
          <Skeleton className="h-14 w-32" />
          <Skeleton className="h-14 flex-1" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  </div>
);

export default ProductDetails;
