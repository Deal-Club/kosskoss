/**
 * Illustration de routine — nature morte cosmétique en vectoriel plat.
 *
 * Réponse au retour client sur les cartes de routine : un visuel qui montre un
 * ENSEMBLE de contenants (une routine est une suite de gestes, pas un produit)
 * et qui se décline par la couleur d'une routine à l'autre — « différentes,
 * mais pas totalement ». Le dispositif tient en trois règles :
 *
 *  1. Le dessin est le même vocabulaire partout (flacon-pompe, pot,
 *     compte-gouttes, petit pot), seule la COMPOSITION change par routine —
 *     deux cartes voisines ne sont jamais la même image recolorée.
 *  2. Les couleurs viennent des jetons `--tint-*-mid` / `--tint-*-deep` de
 *     globals.css : même famille que le fond pastel de la carte, clartés
 *     alignées entre routines.
 *  3. Le laiton (`--gold`) — pompes, couvercles, filets — est l'accent commun
 *     à toutes les scènes : c'est lui qui fait la série.
 *
 * Tout est SVG inline : aucun `id` (pas de collision quand plusieurs cartes
 * cohabitent), pas de dégradé, rendu côté serveur. La scène est ancrée en bas
 * (`xMidYMax slice`) : quelle que soit la largeur de la carte, les contenants
 * restent posés sur leur sol et le cadrage se fait sur les bords.
 */

/** Couleurs d'une scène, résolues depuis les jetons de globals.css. */
type SceneColors = { mid: string; deep: string };

const SCENE_COLORS: Record<string, SceneColors> = {
  acne: { mid: "var(--tint-acne-mid)", deep: "var(--tint-acne-deep)" },
  taches: { mid: "var(--tint-taches-mid)", deep: "var(--tint-taches-deep)" },
  eclat: { mid: "var(--tint-eclat-mid)", deep: "var(--tint-eclat-deep)" },
  age: { mid: "var(--tint-age-mid)", deep: "var(--tint-age-deep)" },
  hydratation: {
    mid: "var(--tint-hydratation-mid)",
    deep: "var(--tint-hydratation-deep)",
  },
};

const GOLD = "var(--gold)";
const CREAM = "var(--cream)";

/* ------------------------------------------------------------------ */
/* Contenants. Chacun est dessiné dans un repère local : x = 0 au      */
/* centre du contenant, y = 0 sur le sol, les formes montent en y      */
/* négatif. La scène les pose ensuite par un simple translate/scale.   */
/* ------------------------------------------------------------------ */

/** Flacon-pompe — le grand format, silhouette maîtresse de la scène. */
function PumpBottle({ c }: { c: SceneColors }) {
  return (
    <g>
      {/* bec verseur puis tige : le geste « pompe » se lit de profil */}
      <path d="M-3 -88 h16 a2 2 0 0 1 2 2 v1 a2 2 0 0 1 -2 2 h-10 v3 h-6 z" fill={GOLD} />
      <rect x="-3" y="-84" width="6" height="10" fill={GOLD} />
      {/* col */}
      <rect x="-7" y="-76" width="14" height="7" fill={c.deep} />
      {/* corps */}
      <rect x="-17" y="-70" width="34" height="70" rx="5" fill={c.deep} />
      {/* reflet : une simple lame claire suffit à donner le volume */}
      <rect x="-13" y="-64" width="3" height="58" rx="1.5" fill={CREAM} opacity="0.28" />
      {/* étiquette */}
      <rect x="-11" y="-50" width="22" height="26" rx="1.5" fill={CREAM} opacity="0.92" />
      <line x1="-6" y1="-42" x2="6" y2="-42" stroke={c.deep} strokeWidth="1.6" opacity="0.75" />
      <line x1="-6" y1="-37" x2="6" y2="-37" stroke={c.mid} strokeWidth="1.3" />
      <line x1="-6" y1="-33" x2="2" y2="-33" stroke={c.mid} strokeWidth="1.3" />
    </g>
  );
}

/** Pot de soin — large et bas, couvercle laiton. */
function Jar({ c }: { c: SceneColors }) {
  return (
    <g>
      <rect x="-20" y="-40" width="40" height="9" rx="4" fill={GOLD} />
      <rect x="-23" y="-31" width="46" height="31" rx="7" fill={c.deep} />
      <rect x="-18" y="-26" width="3" height="20" rx="1.5" fill={CREAM} opacity="0.26" />
      <rect x="-12" y="-24" width="24" height="14" rx="1.5" fill={CREAM} opacity="0.92" />
      <line x1="-7" y1="-19" x2="7" y2="-19" stroke={c.deep} strokeWidth="1.5" opacity="0.75" />
      <line x1="-7" y1="-14.5" x2="4" y2="-14.5" stroke={c.mid} strokeWidth="1.2" />
    </g>
  );
}

/** Flacon compte-gouttes — le sérum, fin et précieux. */
function Dropper({ c }: { c: SceneColors }) {
  return (
    <g>
      {/* poire souple */}
      <rect x="-4.5" y="-64" width="9" height="9" rx="3.5" fill={GOLD} />
      {/* bague */}
      <rect x="-6" y="-56" width="12" height="5" fill={GOLD} opacity="0.75" />
      {/* corps, épaules douces */}
      <path
        d="M-6 -51 h12 q6 3 6 10 v34 a7 7 0 0 1 -7 7 h-10 a7 7 0 0 1 -7 -7 v-34 q0 -7 6 -10 z"
        fill={c.deep}
      />
      <rect x="-8.5" y="-38" width="2.5" height="30" rx="1.25" fill={CREAM} opacity="0.26" />
      <rect x="-5" y="-30" width="10" height="16" rx="1.5" fill={CREAM} opacity="0.9" />
      <line x1="-1.5" y1="-25" x2="1.5" y2="-25" stroke={c.deep} strokeWidth="1.4" opacity="0.75" />
      <line x1="-2" y1="-20.5" x2="2" y2="-20.5" stroke={c.mid} strokeWidth="1.1" />
    </g>
  );
}

/** Petit pot — baume ou masque, la plus petite silhouette de la série. */
function MiniPot({ c }: { c: SceneColors }) {
  return (
    <g>
      <rect x="-13" y="-26" width="26" height="5" rx="2.5" fill={c.deep} />
      <rect x="-15" y="-21" width="30" height="21" rx="8" fill={c.mid} />
      <rect x="-11" y="-16" width="2.5" height="12" rx="1.25" fill={CREAM} opacity="0.35" />
      <line x1="-6" y1="-10" x2="6" y2="-10" stroke={CREAM} strokeWidth="1.4" opacity="0.85" />
    </g>
  );
}

/** Brin botanique — la touche organique, en retrait derrière les flacons. */
function Sprig({ c, flip = false }: { c: SceneColors; flip?: boolean }) {
  return (
    <g transform={flip ? "scale(-1 1)" : undefined} opacity="0.85">
      <path d="M0 0 C 4 -18 2 -34 -4 -52" fill="none" stroke={c.deep} strokeWidth="1.6" />
      <path d="M1.5 -14 C 12 -18 18 -16 22 -10 C 14 -6 6 -8 1.5 -14 Z" fill={c.mid} />
      <path d="M0 -30 C -10 -36 -16 -35 -21 -29 C -13 -24 -5 -25 0 -30 Z" fill={c.mid} />
      <path d="M-2 -44 C 6 -50 12 -50 17 -45 C 10 -40 2 -40 -2 -44 Z" fill={c.deep} opacity="0.8" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Compositions. Une par routine : mêmes contenants, arrangement       */
/* propre — ordre, écarts, échelles, place du disque et du brin.       */
/* ------------------------------------------------------------------ */

type Vessel = "pump" | "jar" | "dropper" | "mini";
type Placement = { kind: Vessel; x: number; s?: number };
type Scene = {
  /** Disque de fond — le « soleil » qui donne la profondeur. */
  sun: { cx: number; cy: number; r: number };
  /** Contenants, de l'arrière vers l'avant (ordre de dessin). */
  items: Placement[];
  sprig: { x: number; flip?: boolean };
  /** Arc laiton, décentré différemment selon la scène. */
  arc: { x: number };
};

const SCENES: Record<string, Scene> = {
  acne: {
    sun: { cx: 176, cy: 74, r: 60 },
    items: [
      { kind: "mini", x: 106, s: 0.95 },
      { kind: "dropper", x: 224 },
      { kind: "pump", x: 152 },
      { kind: "jar", x: 254, s: 0.9 },
    ],
    sprig: { x: 96 },
    arc: { x: 0 },
  },
  taches: {
    sun: { cx: 158, cy: 70, r: 64 },
    items: [
      { kind: "jar", x: 116 },
      { kind: "dropper", x: 248, s: 0.95 },
      { kind: "pump", x: 190, s: 1.04 },
      { kind: "mini", x: 142, s: 0.9 },
    ],
    sprig: { x: 262, flip: true },
    arc: { x: 24 },
  },
  eclat: {
    sun: { cx: 196, cy: 78, r: 58 },
    items: [
      { kind: "dropper", x: 128 },
      { kind: "mini", x: 236, s: 1 },
      { kind: "pump", x: 176, s: 0.98 },
      { kind: "jar", x: 92, s: 0.85 },
    ],
    sprig: { x: 268 },
    arc: { x: -18 },
  },
  age: {
    sun: { cx: 164, cy: 72, r: 62 },
    items: [
      { kind: "pump", x: 236, s: 0.96 },
      { kind: "mini", x: 190, s: 0.92 },
      { kind: "jar", x: 132 },
      { kind: "dropper", x: 96, s: 0.9 },
    ],
    sprig: { x: 282, flip: true },
    arc: { x: 12 },
  },
  hydratation: {
    sun: { cx: 182, cy: 76, r: 60 },
    items: [
      { kind: "jar", x: 232, s: 0.95 },
      { kind: "pump", x: 128 },
      { kind: "dropper", x: 180 },
      { kind: "mini", x: 268, s: 0.88 },
    ],
    sprig: { x: 92 },
    arc: { x: -8 },
  },
};

const VESSELS: Record<Vessel, (props: { c: SceneColors }) => React.ReactElement> = {
  pump: PumpBottle,
  jar: Jar,
  dropper: Dropper,
  mini: MiniPot,
};

/** Empreinte au sol approximative d'un contenant, pour l'ombre portée. */
const FOOTPRINT: Record<Vessel, number> = { pump: 17, jar: 23, dropper: 12, mini: 15 };

/**
 * La scène complète. `tint` est le même jeton que celui du fond de carte
 * (`KKRoutineView.tint`) ; toute valeur inconnue retombe sur la première
 * scène, comme `tintClass` retombe sur sa première teinte.
 */
export function RoutineIllustration({
  tint,
  className,
  fit = "cover",
}: {
  tint: string;
  className?: string;
  /**
   * `cover` remplit le cadre en recadrant les bords (cartes) ; `contain`
   * montre la scène entière, ancrée en bas (héros de la page routine, où le
   * cadre est plus large que haut et rognait le haut du disque).
   */
  fit?: "cover" | "contain";
}) {
  const c = SCENE_COLORS[tint] ?? SCENE_COLORS.acne;
  const scene = SCENES[tint] ?? SCENES.acne;
  const ground = 156;

  return (
    <svg
      viewBox="0 0 340 176"
      preserveAspectRatio={fit === "cover" ? "xMidYMax slice" : "xMidYMax meet"}
      className={className}
      aria-hidden="true"
    >
      {/* Disque de fond : c'est lui qui détache la nature morte du pastel. */}
      <circle cx={scene.sun.cx} cy={scene.sun.cy} r={scene.sun.r} fill={c.mid} opacity="0.38" />
      <circle
        cx={scene.sun.cx}
        cy={scene.sun.cy}
        r={scene.sun.r + 12}
        fill="none"
        stroke={c.mid}
        strokeWidth="1"
        opacity="0.45"
      />

      {/* Arc laiton — l'écho du filet ondulé des arrière-plans du site. */}
      <path
        d={`M${20 + scene.arc.x} 132 C ${100 + scene.arc.x} 108 ${240 + scene.arc.x} 108 ${320 + scene.arc.x} 132`}
        fill="none"
        stroke={GOLD}
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Trois grains d'air, en laiton — jamais au même endroit que le brin. */}
      <circle cx={scene.sun.cx + scene.sun.r - 4} cy={scene.sun.cy - scene.sun.r + 2} r="2" fill={GOLD} opacity="0.6" />
      <circle cx={scene.sun.cx - scene.sun.r - 10} cy={scene.sun.cy + 8} r="1.4" fill={GOLD} opacity="0.45" />
      <circle cx={scene.sun.cx + 16} cy={scene.sun.cy - scene.sun.r - 10} r="1.2" fill={c.deep} opacity="0.4" />

      {/* Brin, derrière les contenants. */}
      <g transform={`translate(${scene.sprig.x} ${ground})`}>
        <Sprig c={c} flip={scene.sprig.flip} />
      </g>

      {/* Ombres portées : une par contenant, au sol. */}
      {scene.items.map((it, i) => (
        <ellipse
          key={`shadow-${i}`}
          cx={it.x}
          cy={ground + 3}
          rx={FOOTPRINT[it.kind] * (it.s ?? 1) + 6}
          ry="3.4"
          fill={c.deep}
          opacity="0.13"
        />
      ))}

      {/* Les contenants, de l'arrière vers l'avant. */}
      {scene.items.map((it, i) => {
        const V = VESSELS[it.kind];
        return (
          <g key={i} transform={`translate(${it.x} ${ground}) scale(${it.s ?? 1})`}>
            <V c={c} />
          </g>
        );
      })}
    </svg>
  );
}
