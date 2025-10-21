import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ProductDescriptionProps {
  description: string;
}

const ProductDescription: React.FC<ProductDescriptionProps> = ({
  description,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">
        {t("product.productDescription.productDetails")}
      </h2>
      <Accordion
        type="single"
        collapsible
        defaultValue="description"
        className="w-full"
      >
        <AccordionItem value="description">
          <AccordionTrigger className="text-lg font-semibold hover:text-cm-green">
            {t("product.productDescription.description")}
          </AccordionTrigger>
          <AccordionContent className="text-base text-muted-foreground">
            {description}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="specifications">
          <AccordionTrigger className="text-lg font-semibold hover:text-cm-green">
            {t("product.productDescription.specifications")}
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc list-inside space-y-2 text-base text-muted-foreground">
              <li>
                <span className="font-semibold">
                  {t("product.productDescription.weight")}:
                </span>{" "}
                1.2kg
              </li>
              <li>
                <span className="font-semibold">
                  {t("product.productDescription.dimensions")}:
                </span>{" "}
                10cm x 20cm x 5cm
              </li>
              <li>
                <span className="font-semibold">
                  {t("product.productDescription.material")}:
                </span>{" "}
                Mahogany Wood
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="in-the-box">
          <AccordionTrigger className="text-lg font-semibold hover:text-cm-green">
            {t("product.productDescription.whatsInTheBox")}
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc list-inside space-y-2 text-base text-muted-foreground">
              <li>{t("product.productDescription.handcraftedBowl")}</li>
              <li>{t("product.productDescription.careInstructions")}</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ProductDescription;
