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

      // Notifications (seller)
      notifications: "Notifications",
      noNotifications: "No notifications yet.",
      markAllRead: "Mark all read",
      markRead: "Mark as read",
      notificationsLoadError: "Unable to load notifications.",

      // Buyer order placement
      quantity: "Quantity",
      placeOrder: "Place order",
      placing: "Placing...",
      orderPlaced: "Order placed! The seller has been notified.",
      orderFailed: "Unable to place order. Please try again.",

      // Buyer product details
      loadingProduct: "Loading product...",
      productNotFound: "Product not found.",
      productLoadError: "Unable to load this product.",
      goBack: "Go back",
      inStock: "{{count}} in stock",
      outOfStock: "Out of stock",
      addToCart: "Add to Cart",
      addedToCart: "Added to cart!",
      sellerInfo: "Seller",
      verified: "Verified",
      contactSeller: "Contact seller on WhatsApp",

      // Cart
      back: "Back",
      yourCart: "Your Cart",
      clearCart: "Clear cart",
      cartEmpty: "Your cart is empty",
      cartEmptyDesc: "Add some products to get started.",
      browseProducts: "Browse products",
      continueShopping: "Continue shopping",
      decreaseQty: "Decrease quantity",
      increaseQty: "Increase quantity",
      removeItem: "Remove item",
      cartCount: "{{count}} item(s)",

      // Product browser / search
      browseTitle: "Browse Products",
      searchPlaceholder: "Search products...",
      filterTitle: "Filters",
      filterCategory: "Category",
      filterMinPrice: "Min price (FCFA)",
      filterMaxPrice: "Max price (FCFA)",
      filterLocation: "Location",
      allCategories: "All categories",
      applyFilters: "Apply",
      resetFilters: "Reset",
      noResults: "No products match your filters.",
      browseLoadError: "Unable to load products. Please try again.",
      resultsSummary: "{{total}} product(s)",
      pageLabel: "Page {{page}} of {{totalPages}}",
      previousPage: "Previous",
      nextPage: "Next",

      // Buyer dashboard
      dashboardTitle: "Dashboard",
      dashboardLoadError: "Unable to load the dashboard. Please try again.",
      featuredCategories: "Featured Categories",
      storesTitle: "Stores",
      noStores: "No stores yet.",
      trendingTitle: "Trending Products",
      productsCount: "{{count}} products",
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
