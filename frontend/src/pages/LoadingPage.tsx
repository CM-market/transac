import React from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { useTranslation } from "react-i18next";

interface LoadingPageProps {
  message?: string;
}

const LoadingPage: React.FC<LoadingPageProps> = ({ message }) => {
  const { t } = useTranslation();
  const displayMessage = message || t("loadingPage.defaultMessage");

  return <LoadingSpinner message={displayMessage} />;
};

export default LoadingPage;
