"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  /** "light" sur fond sombre (barre de service), "dark" sur fond clair. */
  tone?: "light" | "dark";
}

export function LanguageSwitcher({ className, tone = "dark" }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  // Chemin sans préfixe de langue : on reste donc exactement sur la même page
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className={cn("flex items-center gap-1", className)} aria-busy={pending}>
      <Globe className={cn("h-4 w-4 opacity-70", tone === "light" && "text-white")} aria-hidden />
      <span className="sr-only">Choisir la langue / Choose language</span>
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          aria-current={code === locale ? "true" : undefined}
          title={LOCALE_LABELS[code]}
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-xs font-bold uppercase transition-colors",
            tone === "light"
              ? code === locale
                ? "bg-white/15 text-white"
                : "text-white/60 hover:text-white"
              : code === locale
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
