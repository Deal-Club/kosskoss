import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "danger" | "success";

// Une action réduite à son icône n'est lisible que si le nom reste accessible :
// title pour l'infobulle au survol, aria-label pour les lecteurs d'écran.
const TONES: Record<Tone, string> = {
  neutral: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "text-muted-foreground hover:bg-primary/10 hover:text-primary",
  success: "text-muted-foreground hover:bg-[#16a34a]/10 hover:text-[#16a34a]",
};

const BASE =
  "inline-flex h-8 w-8 items-center justify-center rounded-sm border border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40";

interface IconActionProps {
  label: string;
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
  className?: string;
}

export function IconActionLink({
  href,
  label,
  icon: Icon,
  tone = "neutral",
  className,
}: IconActionProps & { href: string }) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(BASE, TONES[tone], className)}
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}

export function IconActionButton({
  label,
  icon: Icon,
  tone = "neutral",
  className,
  onClick,
  disabled,
  type = "button",
  children,
}: IconActionProps & {
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  children?: ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(BASE, TONES[tone], className)}
    >
      {children ?? <Icon className="h-4 w-4" />}
    </button>
  );
}
