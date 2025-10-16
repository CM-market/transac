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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t("cart.title")}</h1>
          {cartItems.length > 0 && (
            <Button
              variant="outline"
              className="text-red-500"
              onClick={handleClearCart}
            >
              {t("cart.clearCart")}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {cartItems.length > 0 ? (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-24 h-24 bg-gray-100 rounded-md overflow-hidden">
                          <img
                            src={item.images[0]}
                            alt={item.name}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => navigate(`/product/${item.id}`)}
                          />
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h3
                              className="font-semibold cursor-pointer hover:text-cm-green"
                              onClick={() => navigate(`/product/${item.id}`)}
                            >
                              {item.name}
                            </h3>
                            <p className="font-bold text-cm-green">
                              {item.price} FCFA
                            </p>
                          </div>

                          <div className="mt-4 flex justify-between items-center">
                            <div className="flex items-center border rounded-md">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 p-0"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id,
                                    item.quantity - 1,
                                  )
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                className="w-12 h-8 text-center border-0 p-0"
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (!isNaN(value) && value > 0) {
                                    handleUpdateQuantity(item.id, value);
                                  }
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 p-0"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id,
                                    item.quantity + 1,
                                  )
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t("cart.remove")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    {t("cart.emptyMessage")}
                  </p>
                  <Button onClick={() => navigate("/products")}>
                    {t("cart.continueShopping")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t("cart.orderSummary")}</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>{t("cart.subtotal")}</span>
                    <span>{subtotal.toLocaleString()} FCFA</span>
                  </div>

                  <div className="flex justify-between">
                    <span>{t("cart.shipping")}</span>
                    <span>{shipping.toLocaleString()} FCFA</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-bold">
                    <span>{t("cart.total")}</span>
                    <span>{total.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full bg-cm-green hover:bg-cm-forest"
                  onClick={() => navigate("/checkout")}
                  disabled={cartItems.length === 0}
                >
                  {t("cart.proceedToCheckout")}
                </Button>
              </CardFooter>
            </Card>

            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Input
                    placeholder={t("cart.promoCodePlaceholder")}
                    className="rounded-r-none"
                  />
                  <Button className="rounded-l-none">{t("cart.apply")}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
