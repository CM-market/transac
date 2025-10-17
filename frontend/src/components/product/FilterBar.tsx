import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SlidersHorizontal,
  Tag,
  DollarSign,
  MapPin,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface FilterBarProps {
  priceRange: number[];
  setPriceRange: (value: number[]) => void;
  selectedCategories: string[];
  handleCategoryChange: (category: string) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (value: boolean) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  resetFilters: () => void;
  productCount: number;
}

const categories = [
  { name: "Crafts", emoji: "🏺" },
  { name: "Food", emoji: "🍲" },
  { name: "Textiles", emoji: "🧵" },
  { name: "Art", emoji: "🎨" },
  { name: "Jewelry", emoji: "💍" },
  { name: "Home Goods", emoji: "🏠" },
  { name: "Fashion", emoji: "👗" },
  { name: "Beauty", emoji: "💅" },
  { name: "Books", emoji: "📚" },
  { name: "Electronics", emoji: "🔌" },
  { name: "Toys", emoji: "🧸" },
  { name: "Health", emoji: "💊" },
];

const FilterBar: React.FC<FilterBarProps> = ({
  priceRange,
  setPriceRange,
  selectedCategories,
  handleCategoryChange,
  verifiedOnly,
  setVerifiedOnly,
  sortBy,
  setSortBy,
  resetFilters,
  productCount,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-card p-6 rounded-xl shadow-lg mb-8 space-y-6">
      {/* Categories Section */}
      <div>
        <Label className="text-lg font-bold text-cm-forest mb-4 block">
          {t("product.filterBar.categories")}
        </Label>
        <div className="flex flex-wrap items-center gap-4">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => handleCategoryChange(category.name)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-3 text-md font-medium ${
                selectedCategories.includes(category.name)
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-muted border-border hover:border-primary/50"
              }`}
            >
              <span className="text-2xl">{category.emoji}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Other filters and sort */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pt-6 border-t border-border">
        <div className="flex flex-wrap items-center gap-6">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 text-md h-11"
              >
                <DollarSign className="h-5 w-5" />
                <span>{t("product.filterBar.price")}</span>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4">
              <Slider
                value={priceRange}
                min={0}
                max={50000}
                step={1000}
                onValueChange={setPriceRange}
                className="my-4"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{priceRange[0].toLocaleString()} FCFA</span>
                <span>{priceRange[1].toLocaleString()} FCFA</span>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-3">
            <Switch
              id="verified-seller-bar"
              checked={verifiedOnly}
              onCheckedChange={setVerifiedOnly}
            />
            <Label
              htmlFor="verified-seller-bar"
              className="text-md font-medium text-foreground"
            >
              {t("product.filterBar.verifiedSeller")}
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label
            htmlFor="sort-by"
            className="text-md font-medium text-foreground whitespace-nowrap"
          >
            {t("product.filterBar.sortBy")}
          </Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-52 h-11 text-md rounded-lg">
              <SelectValue placeholder={t("product.filterBar.selectSorting")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                {t("product.filterBar.newest")}
              </SelectItem>
              <SelectItem value="price-asc">
                {t("product.filterBar.priceAsc")}
              </SelectItem>
              <SelectItem value="price-desc">
                {t("product.filterBar.priceDesc")}
              </SelectItem>
              <SelectItem value="rating">
                {t("product.filterBar.rating")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <div className="text-md font-medium text-foreground">
          {t("product.filterBar.productCount", { count: productCount })}
        </div>
        <Button
          variant="link"
          onClick={resetFilters}
          className="text-md font-semibold text-cm-red p-0 h-auto hover:no-underline"
        >
          {t("product.filterBar.clearAll")}
        </Button>
      </div>
    </div>
  );
};

export default FilterBar;
