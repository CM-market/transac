import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ProductTagsProps {
  formData: {
    tags: string[];
  };
  onTagToggle: (tag: string) => void;
}

const availableTags = ["new", "featured", "sale", "bestseller"];

export const ProductTags: React.FC<ProductTagsProps> = ({
  formData,
  onTagToggle,
}) => {
  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <Button
            key={tag}
            type="button"
            variant={formData.tags.includes(tag) ? "default" : "outline"}
            onClick={() => onTagToggle(tag)}
          >
            {tag}
          </Button>
        ))}
      </div>
    </div>
  );
};
