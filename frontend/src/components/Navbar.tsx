import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold">
              {t("navigation.home")}
            </Link>
            <Link to="/products" className="hover:text-primary">
              {t("navigation.products")}
            </Link>
            <Link to="/categories" className="hover:text-primary">
              {t("navigation.categories")}
            </Link>
            <Link to="/about" className="hover:text-primary">
              {t("navigation.about")}
            </Link>
            <Link to="/contact" className="hover:text-primary">
              {t("navigation.contact")}
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            {user ? (
              <>
                <Link to="/cart" className="hover:text-primary">
                  {t("common.cart")}
                </Link>
                <Link to="/profile" className="hover:text-primary">
                  {t("common.profile")}
                </Link>
                <Button variant="ghost" onClick={logout}>
                  {t("common.logout")}
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">{t("common.login")}</Button>
                </Link>
                <Link to="/register">
                  <Button>{t("common.register")}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
