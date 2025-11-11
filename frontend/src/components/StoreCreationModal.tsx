import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Store,
  X,
  Save,
  AlertCircle,
  Type,
  FileText,
  MapPin,
  Phone,
} from "lucide-react";

export interface StoreFormData {
  name: string;
  description: string;
  location: string;
  contact_phone: string;
}

interface StoreCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StoreFormData) => Promise<void>;
}

const StoreCreationModal: React.FC<StoreCreationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<StoreFormData>({
    name: "",
    description: "",
    location: "",
    contact_phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        name: "",
        description: "",
        location: "",
        contact_phone: "",
      });
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(formData);
      onClose(); // Close modal on successful submission
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unknown error occurred. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-100 dark:bg-emerald-900 p-2 rounded-full">
                <Store className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {t("createStore.title", "Create a New Store")}
              </h2>
            </div>
            <button
              onClick={onClose}
              title={t("createStore.close", "Close")}
              aria-label={t("createStore.close", "Close")}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative flex items-center space-x-3">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
            {/* Form Fields with Labels */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t("createStore.nameLabel", "Store Name")}
              </label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder={t(
                    "createStore.namePlaceholder",
                    "My Awesome Store",
                  )}
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="pl-10 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t("createStore.descriptionLabel", "Description")}
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
                <textarea
                  id="description"
                  name="description"
                  placeholder={t(
                    "createStore.descriptionPlaceholder",
                    "A brief description of your store...",
                  )}
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="pl-10 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t("createStore.locationLabel", "Location")}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="location"
                  name="location"
                  placeholder={t(
                    "createStore.locationPlaceholder",
                    "e.g., Douala, Cameroon",
                  )}
                  value={formData.location}
                  onChange={handleChange}
                  className="pl-10 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="contact_phone"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t("createStore.phoneLabel", "Contact Phone")}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  id="contact_phone"
                  name="contact_phone"
                  placeholder={t(
                    "createStore.phonePlaceholder",
                    "e.g., +237 600 000 000",
                  )}
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="pl-10 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-offset-gray-800 disabled:opacity-50 transition-transform transform hover:scale-105"
              >
                {t("createStore.cancel", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 border border-transparent rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 transition-transform transform hover:scale-105"
              >
                {isSubmitting ? (
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                <span>
                  {isSubmitting
                    ? t("createStore.submitting", "Creating...")
                    : t("createStore.submit", "Create Store")}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreCreationModal;
