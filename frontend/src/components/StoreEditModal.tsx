import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Store, MapPin, MessageCircle } from "lucide-react";

export interface StoreEditData {
  id: string;
  name: string;
  description: string;
  logo_url?: string;
  location: string;
  contact_whatsapp: string;
}

interface StoreEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (storeData: StoreEditData) => Promise<void>;
  store: StoreEditData | null;
}

const StoreEditModal: React.FC<StoreEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  store,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<StoreEditData>({
    id: "",
    name: "",
    description: "",
    logo_url: "",
    location: "",
    contact_whatsapp: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (store) {
      setFormData({
        id: store.id,
        name: store.name || "",
        description: store.description || "",
        logo_url: store.logo_url || "",
        location: store.location || "",
        contact_whatsapp: store.contact_whatsapp || "",
      });
    }
  }, [store]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error updating store:", error);
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
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Store className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t("editStore", "Edit Store")}
            </h2>
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
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("basicInformation", "Basic Information")}
            </h3>
            
            {/* Store Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                {t("storeName", "Store Name")} *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder={t("storeNamePlaceholder", "Enter your store name")}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                {t("description", "Description")}
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder={t("descriptionPlaceholder", "Describe your store and products")}
              />
            </div>

            {/* Logo URL */}
            <div>
              <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-2">
                {t("logoUrl", "Logo URL")}
              </label>
              <input
                type="url"
                id="logo_url"
                name="logo_url"
                value={formData.logo_url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder={t("logoUrlPlaceholder", "https://example.com/logo.png")}
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                {t("location", "Location")} *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                required
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder={t("locationPlaceholder", "e.g., Douala, Cameroon")}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t("contactInformation", "Contact Information")}
            </h3>
            
            {/* WhatsApp */}
            <div>
              <label htmlFor="contact_whatsapp" className="block text-sm font-medium text-gray-700 mb-2">
                <MessageCircle className="w-4 h-4 inline mr-1" />
                {t("whatsappNumber", "WhatsApp Number")} *
              </label>
              <input
                type="tel"
                id="contact_whatsapp"
                name="contact_whatsapp"
                required
                value={formData.contact_whatsapp}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder={t("whatsappPlaceholder", "+237 123 456 789")}
              />
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
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t("updating", "Updating...") : t("updateStore", "Update Store")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreEditModal;
