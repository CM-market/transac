import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // Welcome page
      marketplaceWelcomeTitle: "Welcome to Transac",
      marketplaceWelcomeSubtitle: "B2B Marketplace for Cameroon",
      buyButton: "Buy Products",
      sellButton: "Sell Products",
      backButton: "Back",
      marketplaceFeaturesTitle: "For Businesses in Cameroon",
      featureB2B: "Connect with trusted B2B partners",
      featureSecure: "Secure transactions and verification",
      featureLocal: "Local market focused on Cameroon businesses",
      marketplaceFooter: "Transac - Powering B2B commerce in Cameroon",

      // Common
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      update: "Update",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
