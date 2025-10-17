/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useCart } from "@/contexts/CartContext";

const Cart: React.FC = () => {
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shipping = cartItems.length > 0 ? 2500 : 0;
  const total = subtotal + shipping;

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    updateQuantity(id, newQuantity);

    toast({
      title: t("cart.toast.cartUpdated.title"),
      description: t("cart.toast.cartUpdated.description"),
    });
  };

  const handleRemoveItem = (id: string) => {
    removeFromCart(id);

    toast({
      title: t("cart.toast.itemRemoved.title"),
      description: t("cart.toast.itemRemoved.description"),
    });
  };

  const handleClearCart = () => {
    clearCart();

    toast({
      title: t("cart.toast.cartCleared.title"),
      description: t("cart.toast.cartCleared.description"),
    });
  };

  return (
    <div className="flex-grow">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-cm-forest">
            {t("cart.title")}
          </h1>
          {cartItems.length > 0 && (
            <Button
              variant="outline"
              className="text-sm font-semibold text-cm-red border-cm-red/50 hover:bg-cm-red/5 hover:text-cm-red"
              onClick={handleClearCart}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("cart.clearCart")}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.length > 0 ? (
              cartItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-28 sm:h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => navigate(`/product/${item.id}`)}
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <h3
                            className="font-semibold text-lg text-gray-800 cursor-pointer hover:text-cm-green"
                            onClick={() => navigate(`/product/${item.id}`)}
                          >
                            {item.name}
                          </h3>
                          <p className="font-bold text-lg text-cm-forest whitespace-nowrap">
                            {item.price.toLocaleString()} FCFA
                          </p>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.supplier.name}
                        </p>
                      </div>

                      <div className="mt-4 flex justify-between items-center">
                        <div className="flex items-center border rounded-full">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="px-3 font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-cm-red"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-lg text-gray-600 mb-4">
                    {t("cart.emptyMessage")}
                  </p>
                  <Button
                    onClick={() => navigate("/products")}
                    className="bg-cm-green hover:bg-cm-forest"
                  >
                    {t("cart.continueShopping")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="sticky top-24">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  {t("cart.orderSummary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-md">
                  <span className="text-gray-600">{t("cart.subtotal")}</span>
                  <span className="font-medium">
                    {subtotal.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between text-md">
                  <span className="text-gray-600">{t("cart.shipping")}</span>
                  <span className="font-medium">
                    {shipping.toLocaleString()} FCFA
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>{t("cart.total")}</span>
                  <span className="text-cm-green">
                    {total.toLocaleString()} FCFA
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button
                  size="lg"
                  className="w-full bg-cm-green hover:bg-cm-forest text-base font-bold rounded-full"
                  onClick={() => navigate("/checkout")}
                  disabled={cartItems.length === 0}
                >
                  {t("cart.proceedToCheckout")}
                </Button>
                <div className="flex items-center w-full">
                  <Input
                    placeholder={t("cart.promoCodePlaceholder")}
                    className="rounded-l-full h-11"
                  />
                  <Button className="rounded-r-full h-11 bg-gray-200 text-gray-700 hover:bg-gray-300">
                    {t("cart.apply")}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
