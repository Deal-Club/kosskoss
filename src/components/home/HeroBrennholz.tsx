import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowDown, Phone } from "lucide-react";
import { COMPANY } from "@/content/legal";

// Même source que l'en-tête et les mentions légales : un seul numéro à changer.
const TEL_HREF = `tel:+${COMPANY.phone.replace(/\D/g, "")}`;

/**
 * Ouverture de la page d'accueil.
 *
 * Pas de carrousel : un marchand de bois n'a qu'une chose à prouver dès la
 * première seconde — que son bois est sec et qu'il arrive vite. Le titre le
 * dit, les trois chiffres le mesurent.
 */
export async function HeroBrennholz() {
  const t = await getTranslations("hero");

  return (
    <section className="relative isolate overflow-hidden bg-secondary">
      <Image
        src="/images/brennholz/hero-holzstapel.jpg"
        alt={t("bildAlt")}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Deux voiles : un dégradé horizontal pour tenir le texte, un voile
          global pour que la photo ne concurrence pas le message. */}
      <div className="absolute inset-0 bg-secondary/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/85 to-secondary/20" />

      <div className="relative mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:py-20">
        <div className="flex flex-col">
          <p className="eyebrow mb-5 text-primary">{t("eyebrow")}</p>

          <h1 className="font-heading text-[2.3rem] leading-[1.03] font-black text-white sm:text-[3.1rem] lg:text-[3.9rem]">
            {t("titel")}
            <span className="block text-primary">{t("titelAkzent")}</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-[1.08rem]">
            {t("beschreibung")}
          </p>

          {/* Deux issues, pas trois : parcourir le catalogue ou appeler. Dans
              ce métier, un acheteur qui hésite sur la quantité décroche son
              téléphone — le numéro est donc un bouton, pas une mention. */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#catalogue"
              className="group inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3.5 font-heading text-base font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("ctaCatalogue")}
              <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
            </a>

            <a
              href={TEL_HREF}
              className="inline-flex items-center justify-center gap-2.5 rounded-md border border-white/30 px-6 py-3.5 transition-colors hover:border-primary hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <span className="messwert text-base font-bold text-white">{COMPANY.phone}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
