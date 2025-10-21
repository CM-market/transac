import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { changeTheme, isDark } = useTheme();
  const { t } = useTranslation();

  const toggleTheme = () => {
    changeTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-11 w-11 text-gray-700 hover:bg-gray-100"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span className="sr-only">{t("themeToggle.toggle")}</span>
    </Button>
  );
}
