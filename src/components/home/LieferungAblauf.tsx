import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * Livraison : le déroulé et les zones.
 *
 * Les trois étapes sont numérotées parce qu'elles le sont réellement — la
 * commande, le créneau, la dépose se suivent dans cet ordre et l'acheteur a
 * besoin de savoir où il en est. Ailleurs sur la page, rien n'est numéroté.
 */
const schritte = ["bestellung", "termin", "abladen"] as const;

export async function LieferungAblauf() {
  const t = await getTranslations("lieferung");

  return (
    <section className="relative isolate overflow-hidden bg-secondary py-14 text-white sm:py-20">
      {/* La photo reste une texture de fond : assez présente pour rappeler la
          matière, assez discrète pour que le tableau des zones se lise. */}
      <Image
        src="/images/brennholz/lose-schuettung.jpg"
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className="object-cover opacity-20"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/90 to-secondary/70" />

      <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow mb-3 text-primary">{t("eyebrow")}</p>
          <h2 className="font-heading text-3xl leading-tight font-black sm:text-[2.6rem]">
            {t("titel")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/70">{t("einleitung")}</p>
        </div>

        <ol className="grid gap-6 sm:grid-cols-3">
          {schritte.map((schritt, index) => (
            <li key={schritt} className="border-t-2 border-primary/60 pt-4">
              <span className="messwert text-sm font-bold text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-heading text-lg font-bold">{t(`schritte.${schritt}.titel`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {t(`schritte.${schritt}.text`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
