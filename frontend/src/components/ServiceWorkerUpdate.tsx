import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export const ServiceWorkerUpdate = () => {
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;

          newWorker?.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New content is available, show update prompt
              toast({
                title: t("serviceWorker.update.title"),
                description: t("serviceWorker.update.description"),
                action: (
                  <button
                    onClick={() => {
                      newWorker.postMessage({ type: "SKIP_WAITING" });
                      window.location.reload();
                    }}
                  >
                    {t("serviceWorker.update.button")}
                  </button>
                ),
              });
            }
          });
        });
      });

      // Handle controller change
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, [toast, t]);

  return null;
};
