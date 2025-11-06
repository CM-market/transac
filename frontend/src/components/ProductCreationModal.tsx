import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Package,
  DollarSign,
  Hash,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  quantity_available: number;
  store_id: string;
  images?: File[];
}

interface ProductCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (productData: ProductFormData) => Promise<void>;
  storeId: string;
  storeName: string;
}

const ProductCreationModal: React.FC<ProductCreationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  storeId,
  storeName,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: 0,
    quantity_available: 0,
    store_id: storeId,
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "price" || name === "quantity_available"
          ? Number(value)
          : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Limit to 3 images
    if (files.length > 3) {
      alert(t("maxImagesError", "You can only upload up to 3 images"));
      return;
    }

    // Validate file types
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const invalidFiles = files.filter(
      (file) => !validTypes.includes(file.type),
    );

    if (invalidFiles.length > 0) {
      alert(
        t("invalidFileType", "Please select only JPEG, PNG, or WebP images"),
      );
      return;
    }

    // Validate file sizes (max 5MB each)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter((file) => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      alert(t("fileTooLarge", "Each image must be less than 5MB"));
      return;
    }

    setSelectedImages(files);

    // Create preview URLs
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    // Revoke the URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);

    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        store_id: storeId,
        images: selectedImages,
      });
      // Reset form on success
      setFormData({
        name: "",
        description: "",
        price: 0,
        quantity_available: 0,
        store_id: storeId,
      });
      // Clean up image previews
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setSelectedImages([]);
      setImagePreviews([]);
      onClose();
    } catch (error) {
      console.error("Error creating product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t("addProduct", "Add Product")}
              </h2>
              <p className="text-sm text-gray-600">
                {t("addingToStore", "Adding to")} {storeName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("productInformation", "Product Information")}
            </h3>

            {/* Product Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t("productName", "Product Name")} *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("productNamePlaceholder", "Enter product name")}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t("description", "Description")}
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t(
                  "descriptionPlaceholder",
                  "Describe your product",
                )}
              />
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <DollarSign className="w-4 h-4 inline mr-1" />
                {t("price", "Price")} (XAF) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("pricePlaceholder", "0.00")}
              />
            </div>

            {/* Quantity */}
            <div>
              <label
                htmlFor="quantity_available"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Hash className="w-4 h-4 inline mr-1" />
                {t("quantity", "Quantity Available")} *
              </label>
              <input
                type="number"
                id="quantity_available"
                name="quantity_available"
                required
                min="0"
                value={formData.quantity_available}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("quantityPlaceholder", "0")}
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("productImages", "Product Images")}
            </h3>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                <Upload className="w-4 h-4 inline mr-1" />
                {t("uploadImages", "Upload Images")} (
                {t("maxThreeImages", "Max 3 images")})
              </label>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="images"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="images"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {t("clickToUpload", "Click to upload images")}
                  </span>
                  <span className="text-xs text-gray-500">
                    {t("supportedFormats", "JPEG, PNG, WebP (max 5MB each)")}
                  </span>
                </label>
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              {t("cancel", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? t("creating", "Creating...")
                : t("createProduct", "Create Product")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductCreationModal;
