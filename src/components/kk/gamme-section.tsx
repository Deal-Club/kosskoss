import Image from "next/image";
import { LocalizedLink as Link } from "./localized-link";
import { ArrowRight, Sparkles } from "lucide-react";
import { PREOCCUPATIONS } from "@/lib/kk/besoins";

/**
 * « Une gamme pour chaque problème » — la section qui relie les préoccupations
 * au catalogue.
 *
 * ── Ce qu'elle fait, que les autres ne font pas ───────────────────────────
 * L'accueil dit ailleurs ce que la maison est (« Notre raison d'être ») et ce
 * qu'elle vend (routines, best-sellers). Celle-ci fait le lien entre les deux :
 * elle NOMME les problèmes, et montre qu'à chacun correspond une réponse
 * disponible. C'est le raccourci pour le visiteur qui sait ce qui le gêne mais
 * pas quoi acheter.
 *
 * ── D'où viennent les entrées ─────────────────────────────────────────────
 * Des préoccupations réelles du diagnostic (`src/lib/kk/besoins.ts`), celles-là
 * mêmes qui filtrent le catalogue. Chaque pastille ouvre donc un rayon qui
 * contient effectivement des produits — vérifié à la mise en place, de 5 à 37
 * références selon le besoin. Rien n'est écrit en dur ici.
 *
 * ── Le bouton ─────────────────────────────────────────────────────────────
 * Le diagnostic est la porte pour qui ne sait pas se situer. Il vient APRÈS
 * les pastilles, pas avant : on laisse d'abord la chance de se reconnaître
 * dans un problème nommé, on propose l'accompagnement ensuite.
 */
export function GammeSection() {
  return (
    <section className="relative overflow-hidden bg-deep text-primary-foreground">
      {/* La photo couvre TOUTE la section, bord à bord.
          Elle était bornée au deux tiers droits, ce qui laissait un aplat de
          fond nu à gauche et une couture visible là où l'image commençait.
          Sa composition s'y prête : les flacons sont cadrés à droite et le vert
          sombre s'étend sur toute la moitié gauche — c'est ce vert-là qui porte
          le texte, et non un aplat rapporté. */}
      <div className="absolute inset-0">
        <Image
          src="/images/editorial/gamme-nubiance.webp"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="object-cover object-right"
        />
        {/* Voile noir, comme sur le hero : il assombrit sans déplacer les
            teintes de la photo. Dense à gauche sous le texte, léger à droite
            où les produits doivent rester nets.

            RENFORCÉ. Chaque arrêt a été remonté, et la fin de course ne tombe
            plus à zéro :

              gauche  0,82 → 0,88     55 %  0,45 → 0,62
              30 %    0,72 → 0,82     78 %  0,15 → 0,34
                                     droite 0    → 0,12

            Deux raisons. D'abord la photo elle-même : ses zones claires — les
            reflets sur les flacons, le fond dégradé — remontaient sous le
            texte, et un voile à 45 % au milieu de la course n'y suffisait pas
            pour du blanc.

            Ensuite et surtout le MOBILE. Le bloc de texte est borné à 36 rem,
            mais sous 576 px il occupe toute la largeur : la fin de chaque
            ligne tombait alors dans la zone où le voile s'éteignait, c'est-à-
            dire sur la photo nue. D'où le plancher de 0,12 au bord droit — il
            ne coûte presque rien à la lisibilité des produits sur grand écran,
            et il évite qu'un mot se perde sur un reflet au téléphone. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgb(0 0 0 / 0.88) 0%, rgb(0 0 0 / 0.82) 30%, rgb(0 0 0 / 0.62) 55%, rgb(0 0 0 / 0.34) 78%, rgb(0 0 0 / 0.12) 100%)",
          }}
        />
      </div>

      <div className="section-wide relative mx-auto max-w-7xl px-6">
        <div className="max-w-xl">
          <p className="eyebrow eyebrow-on-dark">Notre gamme</p>

          <h2 className="mt-3 font-display text-3xl leading-tight text-white sm:text-4xl">
            Un problème,{" "}
            <span className="title-soft text-white/75">une réponse qui existe.</span>
          </h2>

          <p className="mt-5 leading-relaxed text-white/85">
            Taches qui persistent, boutons qui reviennent, teint qui s&rsquo;éteint,
            peau qui tire : chacune de ces gênes a ses causes, et chacune a ses
            soins. Nous avons construit le catalogue autour d&rsquo;elles plutôt
            qu&rsquo;autour des marques — pour que vous partiez de ce que vous
            vivez, pas d&rsquo;un nom de flacon.
          </p>

          {/* Les préoccupations, cliquables : chacune ouvre son rayon filtré. */}
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {PREOCCUPATIONS.map((besoin) => (
              <li key={besoin.tag}>
                <Link
                  href={`/soins-visage?besoin=${besoin.tag}`}
                  title={besoin.hint}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/[0.07] px-4 py-2 text-sm text-white backdrop-blur-sm transition hover:border-gold hover:bg-white/15"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold transition-transform duration-300 group-hover:scale-150" />
                  {besoin.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/diagnostic"
              className="kk-fill kk-fill-deep group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-deep"
            >
              <Sparkles className="h-4 w-4" />
              Faire mon diagnostic
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/routines"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white underline-offset-4 hover:underline"
            >
              Voir les routines complètes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
