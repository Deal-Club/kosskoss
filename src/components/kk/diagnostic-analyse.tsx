"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { KK_PETAL_PATH, KK_PETAL_VEIN, KK_PETAL_VEINS_SIDE } from "./motifs";

/**
 * Écran d'analyse du Diagnostic Beauté.
 *
 * Il n'y avait ici qu'une roue qui tourne. Une roue ne dit rien : ni ce qui se
 * passe, ni chez qui l'on est. Or il se passe quelque chose de précis — les
 * réponses sont lues, croisées aux formules du catalogue, une routine est
 * composée — et c'est ce travail qu'il faut donner à voir. Un diagnostic qui
 * répond instantanément ne paraît pas rapide : il paraît n'avoir rien regardé.
 *
 * Le geste est celui de l'écran d'attente de la maison — de l'encre qui monte
 * dans une forme, jamais un objet qui tourne. La forme est le pétale du
 * diagnostic, celui-là même qui orne les questions : son contour se trace, il
 * se remplit par le bas, ses nervures se posent. Le remplissage tient lieu de
 * barre de progression.
 *
 * Les quatre temps affichés sont ceux du moteur, pas un décor : lecture des
 * réponses, croisement avec le catalogue, composition de la routine.
 */

/**
 * Les quatre temps de l'analyse et l'instant où chacun s'affiche.
 *
 * Ils suivent `buildRoutine()` pas à pas — profil agrégé depuis les réponses,
 * lecture du rayon soins du visage, score de correspondance par tags, puis
 * composition des gestes. Rien n'est ajouté pour meubler : une étape inventée
 * se verrait à la première lecture attentive, et c'est la crédibilité du
 * diagnostic entier qui tomberait avec elle.
 */
const TEMPS = [
  { label: "Vos réponses sont relues", ms: 1200 },
  { label: "Votre profil de peau se dessine", ms: 4000 },
  { label: "Croisement avec nos formules", ms: 6800 },
  { label: "Composition de votre routine", ms: 9200 },
];

/** Instant où le premier geste s'inscrit, puis cadence entre les suivants. */
const GESTE_DEPART = 9800;
const GESTE_PAS = 450;

/**
 * Durée de la séquence complète, en millisecondes.
 *
 * Douze secondes. C'est très long pour une attente, et c'est assumé : le moteur
 * répond en quelques dizaines de millisecondes, mais un diagnostic instantané
 * ne se lit pas comme rapide — il se lit comme n'ayant rien regardé. La durée
 * n'est tenable qu'à une condition, respectée ici : que rien ne s'arrête en
 * route. L'encre monte jusqu'à 9000 ms, les ondes bouclent sans fin, la
 * dernière coche se pose à 9620 ms et les quatre gestes s'inscrivent jusqu'à
 * 11600 ms.
 *
 * Reste un PLANCHER, jamais un ajout : une requête plus lente que la séquence
 * ne rallonge rien.
 */
export const DUREE_ANALYSE = 12000;

export function DiagnosticAnalyse({ gestes }: {
  /**
   * Libellés des gestes actifs, dans l'ordre — lus côté serveur via
   * `lireGestes()` (`src/server/kk/gestes.ts`), filtrés par `gestesActifs()`
   * et traduits par `libelleGeste()` (`src/lib/kk/gestes-selection.ts`), puis
   * transmis depuis la page jusqu'ici.
   *
   * Ce ne sont plus quatre gestes fixes : ils viennent de la même sélection
   * que `buildRoutine()` applique pour composer la routine réelle. Un geste
   * désactivé au back-office ne doit pas être promis ici puis absent du
   * résultat — ce que faisait le tableau figé qui vivait avant dans ce
   * fichier.
   */
  gestes: string[];
}) {
  // Les coches se posent au fil de la séquence. L'apparition du texte est
  // portée par le CSS (`--d`) ; seul le passage du rond vide à la coche demande
  // un état, parce qu'il change la structure et pas seulement le style.
  const [faits, setFaits] = useState(0);

  useEffect(() => {
    const minuteries = TEMPS.map((temps, i) =>
      setTimeout(() => setFaits(i + 1), temps.ms + 420),
    );
    return () => minuteries.forEach(clearTimeout);
  }, []);

  return (
    <section
      role="status"
      aria-live="polite"
      className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center"
    >
      {/* Les ondes vivent hors du pétale qui souffle : sur le même parent, elles
          hériteraient de sa variation d'opacité et battraient avec lui. */}
      <div className="relative grid h-32 w-32 place-items-center sm:h-36 sm:w-36">
        <span className="kkd-onde" aria-hidden="true" />
        <span className="kkd-onde kkd-onde--late" aria-hidden="true" />

        <div className="kkd-souffle relative h-full w-full">
        <svg viewBox="0 0 200 200" className="h-full w-full text-deep" aria-hidden="true">
          {/* L'encre : le pétale plein, découpé par le bas puis dévoilé.
              En vert profond et non en sable — un remplissage qu'on ne voit pas
              n'est pas un indicateur de progression. */}
          <path d={KK_PETAL_PATH} fill="currentColor" className="kkd-encre" />
          {/* Le contour, tracé d'un seul geste, avant que l'encre ne monte.
              `pathLength={1}` normalise la longueur : les réglages de tirets ne
              dépendent plus de la géométrie réelle du chemin. Il se fond dans
              l'encre à la fin — c'est voulu, la forme devient pleine. */}
          <path
            d={KK_PETAL_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            pathLength={1}
            className="kkd-trait"
          />
          {/* Les nervures se posent une fois l'encre haute, en laiton : la seule
              couleur de la charte qui tienne à la fois sur le blanc du début et
              sur le vert profond de la fin. Le pétale du site trace les siennes
              de la même manière. */}
          <path
            d={KK_PETAL_VEIN}
            fill="none"
            stroke="var(--gold-soft)"
            strokeWidth="1.5"
            pathLength={1}
            className="kkd-nervure"
            style={{ "--d": "3200ms" } as React.CSSProperties}
          />
          {KK_PETAL_VEINS_SIDE.map((d, i) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="var(--gold-soft)"
              strokeWidth="1.5"
              pathLength={1}
              className="kkd-nervure"
              style={{ "--d": `${4700 + i * 900}ms` } as React.CSSProperties}
            />
          ))}
        </svg>
        </div>
      </div>

      <h1 className="mt-9 font-display text-2xl text-deep sm:text-3xl">
        Analyse de votre profil
      </h1>

      {/* Les quatre temps. `ol` et non `ul` : ils se suivent dans cet ordre, et
          c'est l'ordre qui porte l'information — on ne compose pas la routine
          avant d'avoir lu les réponses. */}
      <ol className="mt-7 space-y-3 text-left">
        {TEMPS.map((temps, i) => {
          const fait = i < faits;
          return (
            <li
              key={temps.label}
              className="kkd-temps flex items-center gap-3"
              style={{ "--d": `${temps.ms}ms` } as React.CSSProperties}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
                  fait ? "border-deep bg-deep text-primary-foreground" : "border-border bg-card"
                }`}
              >
                {fait && <Check className="h-3.5 w-3.5" />}
              </span>
              <span
                className={`text-sm transition-colors duration-300 ${
                  fait ? "text-deep" : "text-muted-foreground"
                }`}
              >
                {temps.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Second acte : la routine se compose sous les yeux du visiteur.
          Sans lui, les trois dernières secondes se passeraient devant un écran
          où plus rien n'arrive — et c'est précisément à ce moment-là qu'une
          longue attente bascule de « ça travaille » à « c'est bloqué ».

          Gardé par une longueur : si tous les gestes étaient désactivés au
          back-office (cas limite, pas un fonctionnement normal), mieux vaut
          une liste absente qu'une liste vide qui laisserait un blanc. */}
      {gestes.length > 0 && (
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {gestes.map((geste, i) => (
            <li
              key={geste}
              className="kkd-geste rounded-full bg-sand px-4 py-2 text-sm font-medium text-deep"
              style={{ "--d": `${GESTE_DEPART + i * GESTE_PAS}ms` } as React.CSSProperties}
            >
              {geste}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
