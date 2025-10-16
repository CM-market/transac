import { useState } from "react";
import { Product } from "@/types/product";

type FormData = Omit<Product, "id" | "images" | "price"> & {
  price: string;
  images: { url: string; file: File }[];
  isUploading: boolean;
};

export const useProductForm = (onProductCreated?: () => void) => {
  const [activeTab, setActiveTab] = useState("details");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: 1,
    images: [],
    tags: [],
    isUploading: false,
    discount: 0,
    supplier: { name: "", isVerified: false },
    rating: 0,
    reviews: 0,
    materials: "",
    dimensions: "",
    returnPolicy: "",
    shippingInfo: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).includes(tag)
        ? (prev.tags || []).filter((t) => t !== tag)
        : [...(prev.tags || []), tag],
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = files.map((file) => ({
        url: URL.createObjectURL(file),
        file,
      }));
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...newImages],
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const saveDraft = async () => {
    setIsSavingDraft(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Draft saved:", formData);
    setIsSavingDraft(false);
  };

  const submitProduct = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Product submitted:", formData);
    setIsSubmitting(false);
    onProductCreated?.();
  };

  return {
    activeTab,
    setActiveTab,
    formData,
    isSubmitting,
    isSavingDraft,
    isPreviewing,
    setIsPreviewing,
    handleInputChange,
    handleSelectChange,
    handleTagToggle,
    handleImageUpload,
    removeImage,
    saveDraft,
    submitProduct,
  };
};
