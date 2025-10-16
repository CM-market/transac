import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Grid, List, ShoppingCart, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { dummyProducts, Product } from "@/constants/dummyProducts";
import ProductCard from "@/components/product/ProductCard";
import FilterSidebar from "@/components/product/FilterSidebar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import "./ProductList.css";
import { useTranslation } from "react-i18next";

interface CartItem extends Product {
  quantity: number;
}

const ProductList: React.FC = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState<number[]>([0, 50000]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    // Get search query from URL
    const params = new URLSearchParams(location.search);
    const search = params.get("search") || "";
    setSearchQuery(search);

    return () => clearTimeout(timer);
  }, [location.search]);

  const products: Product[] = dummyProducts;

  const handleAddToCart = (product: Product) => {
    const existingItem = cartItems.find((item) => item.id === product.id);

    if (existingItem) {
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCartItems((prevItems) => [...prevItems, { ...product, quantity: 1 }]);
    }

    toast({
      title: t("productDetails.toast.addedToCart.title"),
      description: t("productDetails.toast.addedToCart.description", {
        quantity: 1,
        productName: product.name,
      }),
    });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const resetFilters = () => {
    setPriceRange([0, 50000]);
    setSelectedCategories([]);
    setVerifiedOnly(false);
    setSortBy("newest");
  };

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const price = Number(product.price);
      const inPriceRange = price >= priceRange[0] && price <= priceRange[1];
      const inCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category);
      const isVerified = !verifiedOnly || product.supplier.isVerified;
      const matchesSearch = searchQuery
        ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return inPriceRange && inCategory && isVerified && matchesSearch;
    });

    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
      default:
        // Assuming the original list is sorted by newest
        break;
    }

    return filtered;
  }, [
    products,
    priceRange,
    selectedCategories,
    verifiedOnly,
    sortBy,
    searchQuery,
  ]);

  const renderProductGrid = () => (
    <div
      className={
        viewMode === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8"
          : "space-y-6"
      }
    >
      {filteredAndSortedProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  );

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex flex-col space-y-3">
          <Skeleton className="h-[250px] w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex-grow bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Filters sidebar for Desktop */}
          <aside className="hidden lg:block w-full lg:w-80 shrink-0">
            <FilterSidebar
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              selectedCategories={selectedCategories}
              handleCategoryChange={handleCategoryChange}
              verifiedOnly={verifiedOnly}
              setVerifiedOnly={setVerifiedOnly}
              sortBy={sortBy}
              setSortBy={setSortBy}
              resetFilters={resetFilters}
            />
          </aside>

          {/* Products grid/list */}
          <main className="flex-grow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h1 className="text-4xl font-extrabold text-cm-forest tracking-tight">
                  {t("productList.title")}
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  {t("productList.subtitle")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Mobile Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="lg:hidden flex items-center gap-2"
                    >
                      <Menu className="h-5 w-5" />
                      <span>{t("productList.filters")}</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="w-full sm:w-[400px] overflow-y-auto"
                  >
                    <SheetHeader>
                      <SheetTitle className="sr-only">
                        {t("productList.filters")}
                      </SheetTitle>
                      <SheetDescription className="sr-only">
                        {t("productList.filterAndSort")}
                      </SheetDescription>
                    </SheetHeader>
                    <FilterSidebar
                      priceRange={priceRange}
                      setPriceRange={setPriceRange}
                      selectedCategories={selectedCategories}
                      handleCategoryChange={handleCategoryChange}
                      verifiedOnly={verifiedOnly}
                      setVerifiedOnly={setVerifiedOnly}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      resetFilters={resetFilters}
                    />
                  </SheetContent>
                </Sheet>
                <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className="rounded-md"
                  >
                    <Grid className="h-5 w-5" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className="rounded-md"
                  >
                    <List className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {isLoading ? (
              renderSkeletons()
            ) : filteredAndSortedProducts.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-lg shadow-sm">
                <ShoppingCart className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-4 text-xl font-semibold text-gray-800">
                  {t("productList.noProductsFound")}
                </h3>
                <p className="mt-2 text-md text-gray-500">
                  {t("productList.noProductsFoundMessage")}
                </p>
              </div>
            ) : (
              renderProductGrid()
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
