import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="flex-grow flex flex-col justify-center items-center p-4">
      <h1 className="text-4xl font-bold mb-4">{t("notFound.title")}</h1>
      <p className="text-xl mb-8">{t("notFound.subtitle")}</p>
      <p className="text-center text-muted-foreground mb-8 max-w-md">
        {t("notFound.message")}
      </p>
      <Button asChild>
        <Link to="/">{t("notFound.returnToHome")}</Link>
      </Button>
    </div>
  );
};

export default NotFound;
