"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { LocalizedLink as Link } from "@/components/kk/localized-link";

/**
 * Ce que voit un visiteur quand une page de la boutique échoue.
 *
 * ── POURQUOI CETTE PAGE EXISTE ──────────────────────────────────────────────
 *
 * Sans elle, Next.js affiche son propre écran : anglais, sans en-tête, sans
 * pied de page, sans un mot de la marque, et sans la moindre issue. Un visiteur
 * qui tombe dessus au milieu d'un achat n'a plus qu'à fermer l'onglet.
 *
 * ── CE QU'ELLE NE MONTRE PAS ────────────────────────────────────────────────
 *
 * Jamais le message d'erreur brut. Il porte des noms de fichiers, parfois des
 * fragments de requête, et il n'apprend rien à qui n'écrit pas le code. Le
 * visiteur reçoit une phrase claire et une issue ; le détail part dans les
 * journaux du serveur, où il sert vraiment.
 *
 * L'empreinte, elle, est affichée : c'est le seul mot que le visiteur puisse
 * nous citer pour qu'on retrouve son incident dans les journaux.
 */
export default function ErreurBoutique({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("erreur");

  useEffect(() => {
    // La frontière d'erreur est un composant client : le signalement passe donc
    // par une route, seule façon d'atteindre les journaux du serveur depuis le
    // navigateur. Un échec du signalement ne doit rien changer à l'affichage.
    void fetch("/api/incident", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contexte: "boutique",
        message: error.message,
        empreinte: error.digest,
        chemin: typeof window === "undefined" ? undefined : window.location.pathname,
      }),
    }).catch(() => {
      /* Le visiteur voit déjà une page en défaut : on n'en rajoute pas. */
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <h1 className="text-deep">{t("titre")}</h1>
      <p className="lead mt-4">{t("texte")}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="kk-fill rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground"
        >
          {t("reessayer")}
        </button>
        <Link
          href="/"
          className="rounded-full border border-border px-7 py-3.5 text-sm font-semibold text-deep"
        >
          {t("accueil")}
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-8 text-xs text-muted-foreground">
          {t("reference", { empreinte: error.digest })}
        </p>
      ) : null}
    </main>
  );
}
