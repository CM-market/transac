import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Store, MessageCircle } from "lucide-react";

interface StoreCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (storeData: StoreFormData) => void;
}

export interface StoreFormData {
  name: string;
  contact_whatsapp: string;
}

const StoreCreationModal: React.FC<StoreCreationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<StoreFormData>({
    name: "",
    contact_whatsapp: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        name: "",
        contact_whatsapp: "",
      });
      onClose();
    } catch (error) {
      console.error("Error creating store:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Store className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t("createStore", "Create Store")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Store Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
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

          {/* WhatsApp */}
          <div>
            <label
              htmlFor="contact_whatsapp"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
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
            <p className="text-xs text-gray-500 mt-1">
              {t(
                "whatsappHint",
                "Customers will contact you via WhatsApp for orders",
              )}
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t("cancel", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t("creating", "Creating...")}</span>
                </>
              ) : (
                <>
                  <Store className="w-4 h-4" />
                  <span>{t("createStore", "Create Store")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreCreationModal;
