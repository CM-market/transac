import React from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SlidersHorizontal,
  Tag,
  DollarSign,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface FilterSidebarProps {
  priceRange: number[];
  setPriceRange: (value: number[]) => void;
  selectedCategories: string[];
  handleCategoryChange: (category: string) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (value: boolean) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  resetFilters: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  priceRange,
  setPriceRange,
  selectedCategories,
  handleCategoryChange,
  verifiedOnly,
  setVerifiedOnly,
  sortBy,
  setSortBy,
  resetFilters,
}) => {
  const { t } = useTranslation();
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

  return (
    <Card className="sticky top-24 shadow-lg border-border rounded-xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-6 w-6 text-cm-green" />
            <h2 className="text-2xl font-bold text-cm-forest">
              {t("product.filterSidebar.title")}
            </h2>
          </div>
          <Button
            variant="link"
            className="text-sm font-semibold text-cm-red p-0 h-auto hover:no-underline"
            onClick={resetFilters}
          >
            {t("product.filterSidebar.clearAll")}
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-md font-semibold text-foreground mb-2 block">
              {t("product.filterSidebar.sortBy")}
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full h-12 text-md rounded-lg border-border focus:ring-ring focus:border-primary">
                <SelectValue
                  placeholder={t("product.filterSidebar.selectSorting")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  {t("product.filterSidebar.newest")}
                </SelectItem>
                <SelectItem value="price-asc">
                  {t("product.filterSidebar.priceAsc")}
                </SelectItem>
                <SelectItem value="price-desc">
                  {t("product.filterSidebar.priceDesc")}
                </SelectItem>
                <SelectItem value="rating">
                  {t("product.filterSidebar.rating")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Accordion
            type="multiple"
            defaultValue={["categories", "price"]}
            className="w-full"
          >
            <AccordionItem value="categories">
              <AccordionTrigger className="text-md font-semibold text-foreground">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />{" "}
                  {t("product.filterSidebar.categories")}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.name}
                      onClick={() => handleCategoryChange(category.name)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center gap-3 text-lg font-medium ${
                        selectedCategories.includes(category.name)
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-card hover:bg-muted"
                      }`}
                    >
                      <span className="text-2xl">{category.emoji}</span>
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="price">
              <AccordionTrigger className="text-md font-semibold text-foreground">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />{" "}
                  {t("product.filterSidebar.priceRange")}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <Slider
                  value={priceRange}
                  min={0}
                  max={50000}
                  step={1000}
                  onValueChange={setPriceRange}
                  className="my-4 [&>span:first-child]:h-2 [&>span:first-child>span]:bg-cm-green"
                />
                <div className="flex justify-between text-sm font-medium text-muted-foreground">
                  <span>{priceRange[0].toLocaleString()} FCFA</span>
                  <span>{priceRange[1].toLocaleString()} FCFA</span>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="region">
              <AccordionTrigger className="text-md font-semibold text-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />{" "}
                  {t("product.filterSidebar.region")}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <Select defaultValue="all">
                  <SelectTrigger className="w-full h-12 text-md rounded-lg border-border focus:ring-ring focus:border-primary">
                    <SelectValue
                      placeholder={t("product.filterSidebar.selectRegion")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("product.filterSidebar.allRegions")}
                    </SelectItem>
                    <SelectItem value="west">
                      {t("product.filterSidebar.west")}
                    </SelectItem>
                    <SelectItem value="center">
                      {t("product.filterSidebar.center")}
                    </SelectItem>
                    <SelectItem value="littoral">
                      {t("product.filterSidebar.littoral")}
                    </SelectItem>
                    <SelectItem value="north">
                      {t("product.filterSidebar.north")}
                    </SelectItem>
                    <SelectItem value="south">
                      {t("product.filterSidebar.south")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex items-center justify-between pt-4 border-t">
            <Label
              htmlFor="verified-seller"
              className="flex items-center gap-2 text-md font-semibold text-foreground"
            >
              <ShieldCheck className="h-5 w-5" />{" "}
              {t("product.filterSidebar.verifiedSeller")}
            </Label>
            <Switch
              id="verified-seller"
              checked={verifiedOnly}
              onCheckedChange={setVerifiedOnly}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterSidebar;
