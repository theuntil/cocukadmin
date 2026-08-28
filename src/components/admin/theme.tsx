"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { IconSun, IconMoon } from "@/components/ui/icons";

/** FOUC olmadan tema uygulanması — render'dan önce çalışır */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('ct-admin-theme');
if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") ?? "light") as "light" | "dark";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("ct-admin-theme", next); } catch { /* gizli mod */ }
    setTheme(next);
  };

  return (
    <button type="button" onClick={toggle} aria-label="Temayı değiştir"
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-chip hover:text-ink">
      <Icon icon={theme === "dark" ? IconSun : IconMoon} size={17} />
    </button>
  );
}
