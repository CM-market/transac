import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Product } from "@/types/product";

interface FavoritesContextType {
  favorites: Product[];
  addFavorite: (product: Product) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined,
);

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({
  children,
}) => {
  const [favorites, setFavorites] = useState<Product[]>(() => {
    try {
      const storedItems = localStorage.getItem("favorites");
      return storedItems ? JSON.parse(storedItems) : [];
    } catch (error) {
      console.error("Error reading favorites from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("favorites", JSON.stringify(favorites));
    } catch (error) {
      console.error("Error saving favorites to localStorage", error);
    }
  }, [favorites]);

  const addFavorite = (product: Product) => {
    setFavorites((prevFavorites) => [...prevFavorites, product]);
  };

  const removeFavorite = (productId: string) => {
    setFavorites((prevFavorites) =>
      prevFavorites.filter((item) => item.id !== productId),
    );
  };

  const isFavorite = (productId: string) => {
    return favorites.some((item) => item.id === productId);
  };

  return (
    <FavoritesContext.Provider
      value={{ favorites, addFavorite, removeFavorite, isFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
