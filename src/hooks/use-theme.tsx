import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useDeputyProfile } from "@/hooks/use-deputy-profile";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  primaryColor: string;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
  primaryColor: "#2d5a3d",
});

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function generatePalette(hex: string, isDark: boolean) {
  const hsl = hexToHSL(hex);
  if (!hsl) return null;
  const { h, s } = hsl;

  if (isDark) {
    return {
      primary: `${h} ${Math.min(s + 10, 100)}% 40%`,
      ring: `${h} ${Math.min(s + 10, 100)}% 40%`,
      sidebarBg: `${h} ${Math.max(s - 5, 10)}% 8%`,
      sidebarFg: `${h} 10% 85%`,
      sidebarPrimary: `${h} ${Math.min(s + 10, 100)}% 40%`,
      sidebarAccent: `${h} 12% 14%`,
      sidebarBorder: `${h} 12% 16%`,
    };
  }
  return {
    primary: `${h} ${s}% ${Math.max(hsl.l, 18)}%`,
    ring: `${h} ${s}% ${Math.max(hsl.l, 18)}%`,
    sidebarBg: `${h} ${Math.max(s - 5, 15)}% ${Math.max(hsl.l - 6, 12)}%`,
    sidebarFg: `${h} 15% 90%`,
    sidebarPrimary: `${h} ${Math.min(s + 15, 100)}% 55%`,
    sidebarAccent: `${h} ${Math.max(s - 10, 15)}% ${Math.max(hsl.l, 18)}%`,
    sidebarBorder: `${h} ${Math.max(s - 15, 10)}% ${Math.max(hsl.l + 2, 20)}%`,
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useDeputyProfile();
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("mandatogov-theme") as Theme) || "light";
    }
    return "light";
  });

  const primaryColor = profile?.primary_color || "#2d5a3d";

  // Apply dark/light class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("mandatogov-theme", theme);
  }, [theme]);

  // Apply primary color palette
  useEffect(() => {
    const palette = generatePalette(primaryColor, theme === "dark");
    if (!palette) return;
    const root = document.documentElement;
    root.style.setProperty("--primary", palette.primary);
    root.style.setProperty("--ring", palette.ring);
    root.style.setProperty("--sidebar-background", palette.sidebarBg);
    root.style.setProperty("--sidebar-foreground", palette.sidebarFg);
    root.style.setProperty("--sidebar-primary", palette.sidebarPrimary);
    root.style.setProperty("--sidebar-accent", palette.sidebarAccent);
    root.style.setProperty("--sidebar-border", palette.sidebarBorder);
  }, [primaryColor, theme]);

  const toggleTheme = () => setThemeState((t) => (t === "light" ? "dark" : "light"));
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, primaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
