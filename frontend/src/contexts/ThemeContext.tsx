import React from "react";
import { useTheme } from "@/hooks/useTheme";

export const ThemeContext = React.createContext({
  theme: "light",
  isDark: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme, changeTheme, isDark } = useTheme();

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
