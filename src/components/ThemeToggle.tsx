"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Sprawdź zapisaną preferencję lub użyj systemowej
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    let initialTheme: Theme;

    if (savedTheme === "dark" || savedTheme === "light") {
      initialTheme = savedTheme;
    } else {
      // Jeśli nie ma zapisanej preferencji, użyj systemowej
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      initialTheme = systemPrefersDark ? "dark" : "light";
    }

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;

    if (newTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const toggleTheme = (checked: boolean) => {
    const newTheme: Theme = checked ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  // Zapobiegaj flash of wrong theme - nie renderuj dopóki nie jest zamontowany
  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Sun className="size-4 text-muted-foreground" />
        <Switch checked={false} disabled aria-label="Toggle theme" />
        <Moon className="size-4 text-muted-foreground" />
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Sun className={cn("size-4 transition-colors", isDark ? "text-muted-foreground" : "text-foreground")} />
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        title={`Current: ${theme} mode`}
      />
      <Moon className={cn("size-4 transition-colors", isDark ? "text-foreground" : "text-muted-foreground")} />
    </div>
  );
}
