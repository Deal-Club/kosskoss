"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { PatternBackdrop } from "./pattern-backdrop";
import { CONTACT } from "@/config/brand";

/** Icônes de marque : lucide a retiré les logos déposés, on les redessine. */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M14 8.5V7c0-.8.2-1 1-1h1.5V3.2C16 3.1 14.9 3 13.9 3 11.5 3 10 4.4 10 7v1.5H7.5V11.5H10V21h3v-9.5h2.3l.4-3H13z" />
    </svg>
  );
}

/**
 * Seuls les comptes réellement configurés figurent ici.
 *
 * La maquette montre aussi TikTok, mais aucun compte n'est renseigné dans
 * `src/config/brand.ts` : une icône qui mène à une page vide dit à un visiteur
 * méfiant — la cible décrite par la charte — que la maison est à l'abandon.
 * L'entrée s'ajoutera d'elle-même le jour où le compte existera.
 */
const RESEAUX = [
  {
    nom: `Instagram, @${CONTACT.social.instagram}`,
    href: `https://instagram.com/${CONTACT.social.instagram}`,
    Icone: InstagramIcon,
  },
  {
    nom: `Facebook, ${CONTACT.social.facebook}`,
    href: `https://facebook.com/${CONTACT.social.facebook}`,
    Icone: FacebookIcon,
  },
];

/**
 * Bloc 12 de la structure fournie par le client : « NEWSLETTER — inscription
 * pour conseils · offres exclusives ».
 *
 * C'EST LE SEUL ENDROIT DU SITE QUI PORTE ENCORE LE MOTIF DE MARQUE.
 *
 * La règle posée (voir pattern-backdrop.tsx) est « un seul motif sur tout le
 * parcours, jamais sous du texte courant ». Ce bandeau la respecte : une ligne
 * de titre, une ligne de chapô, un champ. Aucune colonne de liens, aucun
 * paragraphe. Le motif y signe la page sans gêner personne — et le client avait
 * explicitement trouvé notre usage du motif « intéressant », il aurait été
 * dommage de le perdre entièrement.
 */
export function NewsletterBand({ locale = "fr" }: { locale?: string }) {
  const t = useTranslations("newsletter");
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"repos" | "envoi" | "ok" | "erreur">("repos");
  const [message, setMessage] = useState("");

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (etat === "envoi") return;
    setEtat("envoi");
    try {
      const res = await fetch("/api/kk/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, source: "accueil" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? t("errorGeneric"));
        setEtat("erreur");
        return;
      }
      setEtat("ok");
      setEmail("");
    } catch {
      setMessage(t("errorConnection"));
      setEtat("erreur");
    }
  }

  return (
    <section className="section mx-auto max-w-7xl px-6">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-deep text-primary-foreground">
        <PatternBackdrop align="center" />

        <div className="relative flex flex-col gap-6 px-7 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="lg:max-w-md">
            <h2 className="text-primary-foreground">{t("title")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-primary-foreground">{t("text")}</p>
          </div>

          {etat === "ok" ? (
            <p
              // `role="status"` : l'inscription réussie remplace le formulaire.
              // Sans annonce, un lecteur d'écran ne saurait pas où il est passé.
              role="status"
              className="inline-flex items-center gap-2.5 rounded-full bg-primary-foreground/10 px-6 py-3.5 text-sm font-medium text-primary-foreground lg:shrink-0"
            >
              <Check className="h-4 w-4 text-gold" />
              {t("confirmedMessage")}
            </p>
          ) : (
            <form onSubmit={envoyer} className="w-full lg:max-w-md lg:shrink-0">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="newsletter-email" className="sr-only">
                  {t("emailLabel")}
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailLabel")}
                  aria-invalid={etat === "erreur"}
                  aria-describedby={etat === "erreur" ? "newsletter-erreur" : undefined}
                  className="min-w-0 flex-1 rounded-full border border-primary-foreground/25 bg-primary-foreground/[0.08] px-5 py-3.5 text-sm text-primary-foreground placeholder:text-primary-foreground/50 focus:border-gold focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={etat === "envoi"}
                  className="kk-fill kk-fill-deep inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-deep disabled:opacity-60"
                >
                  {etat === "envoi" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("submit")}
                </button>
              </div>

              {etat === "erreur" && (
                <p id="newsletter-erreur" role="alert" className="mt-2.5 text-sm text-gold">
                  {message}
                </p>
              )}

              <p className="mt-2.5 text-xs text-primary-foreground">{t("unsubscribeHint")}</p>
            </form>
          )}

          {/* Comptes sociaux, comme sur la maquette, où ils bordent le champ
              d'inscription. La marque est décrite comme « digital-first, social
              commerce au cœur » : la lettre d'information et les réseaux sont
              les deux faces du même geste d'abonnement. */}
          <ul className="flex items-center gap-3 lg:shrink-0">
            {RESEAUX.map(({ nom, href, Icone }) => (
              <li key={nom}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={nom}
                  className="grid h-10 w-10 place-items-center rounded-full border border-primary-foreground/25 text-primary-foreground transition hover:border-gold hover:text-gold"
                >
                  <Icone className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
