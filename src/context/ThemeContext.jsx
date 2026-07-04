// src/context/ThemeContext.jsx
import { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../api/supabase";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const { data: theme, isLoading } = useQuery({
    queryKey: ["theme"],
    queryFn: async () => {
      const { data } = await supabase
        .from("themes")
        .select("*")
        .eq("org_id", 1)
        .single();
      return data;
    },
    staleTime: Infinity,  // theme rarely changes
  });

  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.primary_color);
    root.style.setProperty("--color-primary-light", theme.primary_light_color);
    root.style.setProperty("--color-primary-dark", theme.primary_dark_color);
    root.style.setProperty("--color-accent", theme.accent_color);
    root.style.setProperty("--color-accent-light", theme.accent_light_color);
    root.style.setProperty("--color-accent-dark", theme.accent_dark_color);
    root.style.setProperty("--font-heading", theme.font_heading);
    root.style.setProperty("--font-body", theme.font_body);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}