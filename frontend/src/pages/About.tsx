/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Store, Truck, Globe2, Shield, Users, Package } from "lucide-react";
import { useTranslation } from "react-i18next";

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-primary">
              {t("about.title")}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t("about.subtitle")}
            </p>
          </div>

          {/* Mission Statement */}
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <p className="text-lg leading-relaxed">
                {t("about.missionStatement")}
              </p>
            </CardContent>
          </Card>

          {/* Key Features */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Store className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">
                    {t("about.features.onlineStores.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  {t("about.features.onlineStores.description")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Globe2 className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">
                    {t("about.features.importSimple.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  {t("about.features.importSimple.description")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">
                    {t("about.features.nationwideDelivery.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  {t("about.features.nationwideDelivery.description")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">
                    {t("about.features.supportingLocal.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  {t("about.features.supportingLocal.description")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Package className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">
                    {t("about.features.dualMarketplace.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  {t("about.features.dualMarketplace.description")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">
                    {t("about.features.trustedSecure.title")}
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  {t("about.features.trustedSecure.description")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Value Propositions */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">
                  {t("about.valuePropositions.forSellers.title")}
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  {t("about.valuePropositions.forSellers.points", {
                    returnObjects: true,
                  }).map((point, index) => (
                    <li key={index}>• {point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-secondary/5">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">
                  {t("about.valuePropositions.forBuyers.title")}
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  {t("about.valuePropositions.forBuyers.points", {
                    returnObjects: true,
                  }).map((point, index) => (
                    <li key={index}>• {point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">
              {t("about.callToAction.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("about.callToAction.description")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
