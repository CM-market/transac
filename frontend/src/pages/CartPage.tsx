import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "../contexts/CartContext";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
  }).format(price);
}

export const CartPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clear, totalCount, totalPrice } =
    useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t("cartEmpty", "Your cart is empty")}
          </h1>
          <p className="text-gray-600 mb-6">
            {t("cartEmptyDesc", "Add some products to get started.")}
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            {t("browseProducts", "Browse products")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto p-4 max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("back", "Back")}</span>
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("yourCart", "Your Cart")}
          </h1>
          <button
            onClick={clear}
            data-testid="clear-cart"
            className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t("clearCart", "Clear cart")}</span>
          </button>
        </div>

        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.productId}
              data-testid={`cart-item-${item.productId}`}
              className="bg-white rounded-2xl shadow p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">{item.name}</h2>
                <p className="text-sm text-gray-600">
                  {formatPrice(item.price)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateQuantity(item.productId, item.quantity - 1)
                  }
                  disabled={item.quantity <= 1}
                  aria-label={t("decreaseQty", "Decrease quantity")}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span
                  data-testid={`cart-qty-${item.productId}`}
                  className="w-10 text-center font-medium"
                >
                  {item.quantity}
                </span>
                <button
                  onClick={() =>
                    updateQuantity(item.productId, item.quantity + 1)
                  }
                  aria-label={t("increaseQty", "Increase quantity")}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeItem(item.productId)}
                  aria-label={t("removeItem", "Remove item")}
                  data-testid={`remove-${item.productId}`}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="font-semibold text-gray-900 sm:w-28 sm:text-right">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-6 bg-white rounded-2xl shadow p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {t("cartCount", "{{count}} item(s)", { count: totalCount })}
            </p>
            <p
              data-testid="cart-total"
              className="text-2xl font-bold text-gray-900"
            >
              {formatPrice(totalPrice)}
            </p>
          </div>
          <Link
            to="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            {t("continueShopping", "Continue shopping")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
