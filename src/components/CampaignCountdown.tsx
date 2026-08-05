"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Compte à rebours d'une vente flash.
 *
 * Le calcul ne peut pas se faire côté serveur : le rendu serait figé au moment
 * de la génération de la page et afficherait « plus que 47 h » pendant des
 * heures. Le composant part donc de la seule date de fin et recalcule
 * localement.
 *
 * Premier rendu volontairement vide : l'horloge du navigateur et celle du
 * serveur ne coïncident jamais à la seconde près, et afficher un écart pendant
 * l'hydratation ferait diverger le balisage.
 */
export function CampaignCountdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const t = useTranslations("campaign");
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    if (!Number.isFinite(target)) return;

    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();

    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  // Rien tant que l'hydratation n'a pas eu lieu, et plus rien une fois l'offre
  // terminée : une horloge à zéro laisserait croire que le prix est encore bon.
  if (remaining === null || remaining <= 0) return null;

  const totalSeconds = Math.floor(remaining / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <p
      className={className ?? "inline-flex items-center gap-2 rounded-sm bg-badge px-3 py-1.5 text-sm font-bold text-badge-foreground"}
      // Le décompte change chaque seconde : sans « off », un lecteur d'écran
      // annoncerait la nouvelle valeur sans arrêt et couvrirait le reste de la
      // page. La date de fin en toutes lettres reste lisible juste à côté.
      aria-live="off"
    >
      <Clock className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        {t("endsIn")}{" "}
        {days > 0 && `${days} ${t("dayShort")} `}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </p>
  );
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
