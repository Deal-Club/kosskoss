"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { categoryGroups } from "@/data/categoryNav";

export function CategoryMenu() {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-sm bg-muted px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-border"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        <span className="hidden sm:inline">{t("categories")}</span>
      </button>

      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 absolute top-full left-0 z-50 mt-2 w-[calc(100vw-1.5rem)] max-w-xl rounded-sm border border-border bg-white p-4 text-foreground shadow-lg duration-200 sm:w-[480px]">
          <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
            {categoryGroups.map((group) => (
              <div key={group.slug}>
                <Link
                  href={group.href}
                  onClick={() => setOpen(false)}
                  className="mb-2 block text-sm font-black text-primary hover:underline"
                >
                  {t(`groupNames.${group.slug}`)}
                </Link>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-2 rounded-sm px-1 py-1 text-sm text-foreground transition-colors hover:bg-muted hover:text-primary"
                      >
                        <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-border">
                          <Image
                            src={item.image}
                            alt=""
                            fill
                            sizes="24px"
                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        </span>
                        {t(`categoryNames.${item.slug}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
