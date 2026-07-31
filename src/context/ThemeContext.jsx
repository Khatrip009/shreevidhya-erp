// src/context/ThemeContext.jsx
import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../api/supabase";
import { useOrg } from "./OrganizationContext";

// Provide a fallback so useTheme() never returns undefined
const ThemeContext = createContext({
  theme: null,
  isLoading: false,
});

function getLightTint(hex) {
  return hex + "20";
}

export function ThemeProvider({ children }) {
  const { org } = useOrg();
  const orgId = org?.id;

  const themeQueryKey = useMemo(() => ["theme", orgId], [orgId]);

  const { data: theme, isLoading } = useQuery({
    queryKey: themeQueryKey,
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from("themes")
        .select("*")
        .eq("org_id", orgId)
        .maybeSingle();
      return data;
    },
    enabled: !!orgId,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty("--theme-primary", theme.primary_color);
    root.style.setProperty("--theme-primary-light", theme.primary_light_color);
    root.style.setProperty("--theme-primary-dark", theme.primary_dark_color);
    root.style.setProperty("--theme-accent", theme.accent_color);
    root.style.setProperty("--theme-accent-light", theme.accent_light_color);
    root.style.setProperty("--theme-accent-dark", theme.accent_dark_color);
    root.style.setProperty("--theme-primary-bg", getLightTint(theme.primary_color));
    root.style.setProperty("--theme-accent-bg", getLightTint(theme.accent_color));
    root.style.setProperty("--font-heading", theme.font_heading);
    root.style.setProperty("--font-body", theme.font_body);
  }, [theme]);

  const value = useMemo(() => ({ theme, isLoading }), [theme, isLoading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  // Optional debug guard (can be removed later)
  if (!context) {
    throw new Error(
      "useTheme must be used within a ThemeProvider. Ensure <ThemeProvider> wraps the component tree."
    );
  }
  return context;
}