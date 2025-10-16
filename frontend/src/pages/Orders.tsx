/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Badge from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Sample orders data - in a real app this would come from an API
  const sampleOrders = [
    {
      id: "CM2304092",
      date: "April 28, 2025",
      total: 65000,
      status: "processing",
      items: [
        { name: "Hand-woven Bamboo Basket", quantity: 2 },
        { name: "Cameroonian Coffee Beans - 500g", quantity: 1 },
        { name: "Traditional Handmade Jewelry", quantity: 1 },
      ],
    },
    {
      id: "CM2303087",
      date: "April 21, 2025",
      total: 42500,
      status: "delivered",
      items: [
        { name: "Traditional Fabric (3 meters)", quantity: 1 },
        { name: "Carved Wooden Statue", quantity: 1 },
      ],
    },
    {
      id: "CM2302045",
      date: "March 15, 2025",
      total: 37000,
      status: "delivered",
      items: [
        { name: "Spice Mix Collection", quantity: 2 },
        { name: "Handcrafted Leather Wallet", quantity: 1 },
      ],
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processing":
        return (
          <Badge className="bg-blue-500">{t("orders.status.processing")}</Badge>
        );
      case "shipped":
        return (
          <Badge className="bg-orange-500">{t("orders.status.shipped")}</Badge>
        );
      case "delivered":
        return (
          <Badge className="bg-green-500">{t("orders.status.delivered")}</Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-500">{t("orders.status.cancelled")}</Badge>
        );
      default:
        return <Badge>{t("orders.status.unknown")}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t("orders.title")}</h1>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-4 max-w-md">
          <TabsTrigger value="all">{t("orders.tabs.all")}</TabsTrigger>
          <TabsTrigger value="processing">
            {t("orders.tabs.processing")}
          </TabsTrigger>
          <TabsTrigger value="shipped">{t("orders.tabs.shipped")}</TabsTrigger>
          <TabsTrigger value="delivered">
            {t("orders.tabs.delivered")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="space-y-4">
            {sampleOrders.length > 0 ? (
              sampleOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-muted p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">
                          {t("orders.orderId", { id: order.id })}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {t("orders.placedOn", { date: order.date })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(order.status)}
                        <span className="font-semibold">
                          {order.total.toLocaleString()} FCFA
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{item.name}</span>
                          <span className="text-muted-foreground">
                            {t("orders.quantity", { count: item.quantity })}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        {t("orders.viewDetails")}
                      </Button>
                      {order.status === "delivered" && (
                        <Button
                          size="sm"
                          className="bg-cm-green hover:bg-cm-forest"
                        >
                          {t("orders.buyAgain")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    {t("orders.noOrders")}
                  </p>
                  <Button onClick={() => navigate("/products")}>
                    {t("orders.startShopping")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="processing">
          <div className="space-y-4">
            {sampleOrders.filter((order) => order.status === "processing")
              .length > 0 ? (
              sampleOrders
                .filter((order) => order.status === "processing")
                .map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    {/* Similar order card structure as above */}
                    <CardHeader className="bg-muted p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">
                            {t("orders.orderId", { id: order.id })}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {t("orders.placedOn", { date: order.date })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(order.status)}
                          <span className="font-semibold">
                            {order.total.toLocaleString()} FCFA
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.name}</span>
                            <span className="text-muted-foreground">
                              {t("orders.quantity", { count: item.quantity })}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/orders/${order.id}`)}
                        >
                          {t("orders.viewDetails")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {t("orders.noProcessingOrders")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="shipped">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {t("orders.noShippedOrders")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivered">
          <div className="space-y-4">
            {sampleOrders.filter((order) => order.status === "delivered")
              .length > 0 ? (
              sampleOrders
                .filter((order) => order.status === "delivered")
                .map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    {/* Similar order card structure as above */}
                    <CardHeader className="bg-muted p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">
                            {t("orders.orderId", { id: order.id })}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {t("orders.placedOn", { date: order.date })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(order.status)}
                          <span className="font-semibold">
                            {order.total.toLocaleString()} FCFA
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.name}</span>
                            <span className="text-muted-foreground">
                              {t("orders.quantity", { count: item.quantity })}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/orders/${order.id}`)}
                        >
                          {t("orders.viewDetails")}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-cm-green hover:bg-cm-forest"
                        >
                          {t("orders.buyAgain")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {t("orders.noDeliveredOrders")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Orders;
