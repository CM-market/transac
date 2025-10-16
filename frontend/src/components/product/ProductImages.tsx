import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface ProductImagesProps {
  formData: {
    images: { url: string; file: File }[];
    isUploading: boolean;
  };
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  isUploading: boolean;
}

export const ProductImages: React.FC<ProductImagesProps> = ({
  formData,
  onImageUpload,
  onRemoveImage,
  isUploading,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label htmlFor="images">{t("product.productImages.productImages")}</Label>
      <Input
        id="images"
        type="file"
        multiple
        onChange={onImageUpload}
        disabled={isUploading}
      />
      <div className="grid grid-cols-3 gap-4">
        {formData.images.map((image, index) => (
          <div key={index} className="relative">
            <img
              src={image.url}
              alt={`Product image ${index + 1}`}
              className="h-24 w-full rounded-md object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-1 top-1 h-6 w-6"
              onClick={() => onRemoveImage(index)}
            >
              <X size={16} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
