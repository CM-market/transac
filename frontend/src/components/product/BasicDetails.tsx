import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface BasicDetailsProps {
  formData: {
    name: string;
    description: string;
    price: string;
    category: string;
  };
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onSelectChange: (value: string) => void;
}

export const BasicDetails: React.FC<BasicDetailsProps> = ({
  formData,
  onInputChange,
  onSelectChange,
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("product.basicDetails.name")}</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={onInputChange}
          placeholder={t("product.basicDetails.namePlaceholder")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">
          {t("product.basicDetails.description")}
        </Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={onInputChange}
          placeholder={t("product.basicDetails.descriptionPlaceholder")}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">{t("product.basicDetails.price")}</Label>
          <Input
            id="price"
            name="price"
            type="number"
            value={formData.price}
            onChange={onInputChange}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">{t("product.basicDetails.category")}</Label>
          <Select onValueChange={onSelectChange} value={formData.category}>
            <SelectTrigger>
              <SelectValue
                placeholder={t("product.basicDetails.selectCategory")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="electronics">
                {t("product.basicDetails.categories.electronics")}
              </SelectItem>
              <SelectItem value="clothing">
                {t("product.basicDetails.categories.clothing")}
              </SelectItem>
              <SelectItem value="home">
                {t("product.basicDetails.categories.home")}
              </SelectItem>
              <SelectItem value="books">
                {t("product.basicDetails.categories.books")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
