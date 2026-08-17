/**
 * Bâtit le livrable de présentation à partir du registre et des captures.
 *
 *   node scripts/maquette/construire.mjs
 *
 * Produit livrables/maquette-kosskoss/index.html : une page autoportante, sans
 * serveur ni dépendance réseau, qui s'ouvre au double-clic. Les captures et les
 * maquettes du client restent des fichiers à côté, ce qui garde la page légère
 * à l'ouverture — les images se chargent au défilement.
 *
 * À relancer après chaque campagne de capture.
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ECRANS, PARCOURS, APPAREILS, COMPARATIFS } from "./ecrans.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..");
const SORTIE = join(RACINE, "livrables", "maquette-kosskoss");

/**
 * Canal de retour du client. Laissé vide à dessein : aucune adresse ni aucun
 * numéro ne doit être inventé. Renseigner l'un des deux fait apparaître le
 * bouton correspondant dans la barre de retours ; sinon le client copie ou
 * télécharge ses commentaires.
 *   whatsapp : au format international sans signe ni espace, ex. 237600000000
 */
const RETOUR = { whatsapp: "", email: "" };

const donnees = JSON.parse(readFileSync(join(SORTIE, "donnees.json"), "utf8"));

// ------------------------------------------------------------- typographie

/**
 * Échappe le HTML puis applique les règles typographiques françaises :
 * espace fine insécable dans les guillemets et devant la ponctuation haute.
 * Les deux-points suivis d'une barre oblique sont épargnés, sinon les adresses
 * web se retrouvaient coupées.
 */
function typo(texte) {
  if (!texte) return "";
  return String(texte)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/«\s+/g, "«\u202f")
    .replace(/\s+»/g, "\u202f»")
    .replace(/\s+([;!?])/g, "\u202f$1")
    .replace(/([^\s:])\s*:(\s)/g, "$1\u202f:$2");
}

/** Sépare les milliers par une espace fine insécable, comme il se doit. */
function nombre(valeur) {
  return String(valeur).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
}

const JOURS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
function dateEnFrancais(iso) {
  const d = new Date(iso);
  return `${d.getDate()}\u00a0${JOURS[d.getMonth()]}\u00a0${d.getFullYear()}`;
}

// ------------------------------------------------------- maquettes client

const SOURCES_CLIENT = join(RACINE, "docs", "design-references", "kks");
const DOSSIER_CLIENT = join(SORTIE, "maquettes-client");
mkdirSync(DOSSIER_CLIENT, { recursive: true });

/** Copie une maquette fournie par le client, si elle est bien là. */
function copierMaquetteClient(nomSource, nomCible) {
  const source = join(SOURCES_CLIENT, nomSource);
  if (!existsSync(source)) return null;
  copyFileSync(source, join(DOSSIER_CLIENT, nomCible));
  return `maquettes-client/${nomCible}`;
}

const MAQUETTE_ACCUEIL = copierMaquetteClient("mockup_site_Accueil.jpeg", "accueil.jpeg");
const MAQUETTE_STRUCTURE = copierMaquetteClient("Mockup_site_Toutes pages.jpeg", "structure.jpeg");

// ------------------------------------------------------------------ pièces

const ecransRetenus = ECRANS.filter((e) => donnees.ecrans[e.id]);
const numeros = new Map(ecransRetenus.map((e, i) => [e.id, String(i + 1).padStart(2, "0")]));
const titres = new Map(ecransRetenus.map((e) => [e.id, e.titre]));

/** Le sommaire de gauche : parcours, écrans, et pastille d'état par écran. */
function bâtirSommaire() {
  return PARCOURS.map((parcours) => {
    const dedans = ecransRetenus.filter((e) => e.parcours === parcours.id);
    if (!dedans.length) return "";
    const liens = dedans
      .map(
        (e) => `
          <li>
            <a href="#e-${e.id}" data-lien="${e.id}">
              <span class="pastille" data-pastille="${e.id}" aria-hidden="true"></span>
              <span class="lien-numero">${numeros.get(e.id)}</span>
              <span class="lien-titre">${typo(e.titre)}</span>
            </a>
          </li>`,
      )
      .join("");
    return `
      <div class="sommaire-groupe">
        <p class="sommaire-titre">${typo(parcours.titre)} <span>${dedans.length}</span></p>
        <ul>${liens}</ul>
      </div>`;
  }).join("");
}

/** Les zones cliquables posées par-dessus une capture. */
function bâtirZones(zones) {
  return zones
    .map((z) => {
      const cible = titres.get(z.vers);
      if (!cible) return "";
      const style = `left:${z.gauche.toFixed(2)}%;top:${z.haut.toFixed(2)}%;width:${z.largeur.toFixed(2)}%;height:${z.hauteur.toFixed(2)}%`;
      return `<a class="zone" style="${style}" href="#e-${z.vers}" data-saut="${z.vers}"
                 title="Aller à : ${typo(cible)}"><span>${typo(cible)}</span></a>`;
    })
    .join("");
}

/** Un cadre d'appareil : la chrome, la fenêtre, la capture et ses zones. */
function bâtirCadre(ecran, nomAppareil, releve, actif) {
  const appareil = APPAREILS[nomAppareil];
  const ratio = `${appareil.largeur} / ${appareil.hauteur}`;
  const defile = releve.hauteur > appareil.hauteur + 4;
  const chrome =
    nomAppareil === "desktop"
      ? `<div class="chrome">
           <span class="feux"><i></i><i></i><i></i></span>
           <span class="barre-url">${typo(donnees.base + ecran.chemin)}</span>
         </div>`
      : `<div class="encoche" aria-hidden="true"></div>`;

  return `
    <div class="cadre cadre-${nomAppareil}" data-vue="${nomAppareil}"${actif ? "" : " hidden"}>
      <div class="appareil">
        ${chrome}
        <div class="fenetre" style="aspect-ratio:${ratio}">
          <div class="plan">
            <img src="${releve.image}" alt="Capture de l’écran ${typo(ecran.titre)} en ${appareil.libelle}"
                 loading="lazy" width="${releve.largeur}" height="${releve.hauteur}">
            ${bâtirZones(releve.zones)}
          </div>
        </div>
      </div>
      <p class="legende">
        ${typo(appareil.libelle)} · page de ${nombre(releve.hauteur)}\u202fpx de haut${
          defile ? " · <strong>faites défiler dans le cadre</strong>" : ""
        }
      </p>
    </div>`;
}

/** Une fiche d'écran complète. */
function bâtirEcran(ecran) {
  const releve = donnees.ecrans[ecran.id];
  const parcours = PARCOURS.find((p) => p.id === ecran.parcours);
  const vues = Object.keys(releve.appareils);
  const comparatif = COMPARATIFS.find((c) => c.ecran === ecran.id) && MAQUETTE_ACCUEIL;

  const bascule = [
    ...vues.map(
      (v, i) =>
        `<button type="button" data-vue="${v}"${i === 0 ? ' class="actif" aria-pressed="true"' : ' aria-pressed="false"'}>${
          v === "desktop" ? "Ordinateur" : "Mobile"
        }</button>`,
    ),
    comparatif
      ? `<button type="button" data-vue="comparatif" aria-pressed="false">Sa maquette</button>`
      : "",
  ].join("");

  const cadres = vues.map((v, i) => bâtirCadre(ecran, v, releve.appareils[v], i === 0)).join("");

  const cadreComparatif = comparatif
    ? `<div class="cadre cadre-comparatif" data-vue="comparatif" hidden>
         <div class="appareil appareil-plat">
           <img src="${MAQUETTE_ACCUEIL}" alt="Maquette de l’accueil fournie par le client" loading="lazy">
         </div>
         <p class="legende">La maquette que vous nous avez transmise, à comparer avec la réalisation.</p>
       </div>`
    : "";

  const points = ecran.points?.length
    ? `<ul class="points">${ecran.points.map((p) => `<li>${typo(p)}</li>`).join("")}</ul>`
    : "";

  const sections = releve.contenu.sections?.length
    ? `<details class="sections">
         <summary>Les ${releve.contenu.sections.length} sections de la page</summary>
         <ol>${releve.contenu.sections.map((s) => `<li>${typo(s)}</li>`).join("")}</ol>
       </details>`
    : "";

  const h1 = releve.contenu.h1
    ? `<p class="titre-page">Titre de la page : <span>${typo(releve.contenu.h1)}</span></p>`
    : "";

  return `
    <article class="ecran" id="e-${ecran.id}" data-ecran="${ecran.id}">
      <div class="ecran-tete">
        <div class="ecran-identite">
          <p class="surtitre">${numeros.get(ecran.id)} · ${typo(parcours?.titre ?? "")}</p>
          <h3>${typo(ecran.titre)}</h3>
          <p class="chemin"><code>${typo(ecran.chemin)}</code></p>
        </div>
        <div class="ecran-outils">
          <div class="bascule" role="group" aria-label="Choix de l’affichage">${bascule}</div>
          <a class="lien-reel" href="${donnees.base + ecran.chemin}" target="_blank" rel="noopener">
            Ouvrir la vraie page <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      <div class="scene">${cadres}${cadreComparatif}</div>

      <div class="notes">
        <div class="notes-lecture">
          ${ecran.intention ? `<p class="intention">${typo(ecran.intention)}</p>` : ""}
          ${points}
        </div>
        <div class="notes-detail">
          ${h1}
          ${sections}
        </div>
        <div class="notes-avis">
          <p class="etiquette">Votre verdict</p>
          <div class="verdict" role="group" aria-label="Verdict sur cet écran">
            <button type="button" data-statut="valide" aria-pressed="false">Validé</button>
            <button type="button" data-statut="revoir" aria-pressed="false">À revoir</button>
          </div>
          <label class="champ">
            <span class="etiquette">Votre commentaire</span>
            <textarea rows="4" data-commentaire="${ecran.id}"
              placeholder="Ce qui vous plaît, ce qui vous gêne, ce que vous voulez changer."></textarea>
          </label>
          <p class="enregistre" data-enregistre="${ecran.id}" role="status"></p>
        </div>
      </div>
    </article>`;
}

/** Une section de parcours, avec son introduction. */
function bâtirParcours(parcours) {
  const dedans = ecransRetenus.filter((e) => e.parcours === parcours.id);
  if (!dedans.length) return "";
  return `
    <section class="parcours" id="p-${parcours.id}">
      <header class="parcours-tete">
        <h2>${typo(parcours.titre)}</h2>
        <p>${typo(parcours.intro)}</p>
        <p class="parcours-compte">${dedans.length} écrans</p>
      </header>
      ${dedans.map(bâtirEcran).join("")}
    </section>`;
}

// ------------------------------------------------------------------ styles

const STYLES = `
:root {
  --encre: #1e1e1e;
  --profond: #0f3b46;
  --profond-clair: #1c5665;
  --sable: #f3e8dd;
  --papier: #ffffff;
  --fond: #faf6f1;
  --trait: #e4d9cd;
  --gris: #6b6560;
  --valide: #1f7a4d;
  --revoir: #b4551f;
  --serif: ui-serif, Georgia, "Iowan Old Style", "Times New Roman", serif;
  --sans: system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --largeur: 1180px;
  --barre: 60px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 1.5rem; }

body {
  margin: 0;
  background: var(--fond);
  color: var(--encre);
  font-family: var(--sans);
  font-size: 16.5px;
  line-height: 1.55;
  font-feature-settings: "kern" 1, "liga" 1;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  padding-bottom: calc(var(--barre) + 1rem);
}

h1, h2, h3 { font-family: var(--serif); font-weight: 600; hyphens: none; line-height: 1.15; margin: 0; }
p { margin: 0 0 0.75em; }
p:last-child { margin-bottom: 0; }
a { color: var(--profond); text-decoration-thickness: 1px; text-underline-offset: 2px; }
code { font-family: var(--mono); font-size: 0.86em; }

.saut {
  position: absolute; left: -9999px;
  background: var(--profond); color: var(--sable); padding: 0.6rem 1rem; z-index: 100;
}
.saut:focus { left: 1rem; top: 1rem; }

.etiquette {
  font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--gris); font-weight: 700; margin: 0 0 0.4rem;
}

/* ---------------------------------------------------------- mise en page */

.mise-en-page { display: grid; grid-template-columns: 268px minmax(0, 1fr); align-items: start; }

#sommaire {
  position: sticky; top: 0; height: 100vh; overflow-y: auto;
  background: var(--profond); color: var(--sable);
  padding: 1.6rem 1.2rem calc(var(--barre) + 1rem);
}
#sommaire .marque { font-family: var(--serif); font-size: 1.15rem; letter-spacing: 0.02em; }
#sommaire .marque span { display: block; font-family: var(--sans); font-size: 0.7rem;
  letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.72; margin-top: 0.25rem; }
#sommaire .date { font-size: 0.78rem; opacity: 0.66; margin-top: 0.9rem; }
.sommaire-groupe { margin-top: 1.6rem; }
.sommaire-titre {
  font-size: 0.68rem; letter-spacing: 0.11em; text-transform: uppercase;
  opacity: 0.68; margin: 0 0 0.5rem; display: flex; justify-content: space-between;
}
#sommaire ul { list-style: none; margin: 0; padding: 0; }
#sommaire li a {
  display: grid; grid-template-columns: 10px 22px 1fr; gap: 0.45rem; align-items: baseline;
  color: inherit; text-decoration: none; padding: 0.3rem 0.4rem; border-radius: 4px;
  font-size: 0.84rem; line-height: 1.35;
}
#sommaire li a:hover, #sommaire li a:focus-visible { background: rgba(255, 255, 255, 0.1); }
#sommaire li a.courant { background: rgba(255, 255, 255, 0.16); font-weight: 600; }
.lien-numero { font-variant-numeric: tabular-nums; opacity: 0.6; font-size: 0.76rem; }
.pastille {
  width: 8px; height: 8px; border-radius: 50%; background: rgba(255, 255, 255, 0.25);
  align-self: center;
}
.pastille[data-etat="valide"] { background: #4ec38a; }
.pastille[data-etat="revoir"] { background: #e8a06a; }

#contenu { padding: 2.4rem clamp(1rem, 3vw, 2.6rem) 3rem; max-width: calc(var(--largeur) + 5rem); }

/* ------------------------------------------------------------ couverture */

.couverture { max-width: 62ch; margin-bottom: 3rem; }
.couverture .surtitre {
  font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gris);
  font-weight: 700;
}
.couverture h1 { font-size: clamp(1.9rem, 4vw, 2.7rem); margin: 0.5rem 0 1rem; }
.couverture .accroche { font-size: 1.1rem; }
.mode-emploi {
  background: var(--papier); border: 1px solid var(--trait); border-radius: 8px;
  padding: 1.2rem 1.4rem; margin-top: 1.6rem;
}
.mode-emploi ol { margin: 0; padding-left: 1.3rem; }
.mode-emploi li { margin-bottom: 0.4rem; }
.mode-emploi li:last-child { margin-bottom: 0; }

.structure-fournie { margin-top: 2rem; }
.structure-fournie img {
  width: 100%; height: auto; border: 1px solid var(--trait); border-radius: 8px; background: var(--papier);
}

/* -------------------------------------------------------------- parcours */

.parcours { margin-bottom: 3.5rem; }
.parcours-tete {
  border-top: 2px solid var(--profond); padding-top: 1rem; margin-bottom: 1.8rem;
  max-width: 70ch;
}
.parcours-tete h2 { font-size: clamp(1.4rem, 2.6vw, 1.9rem); }
.parcours-tete p { margin-top: 0.5rem; color: var(--gris); }
.parcours-compte {
  font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700;
  color: var(--profond);
}

/* ----------------------------------------------------------------- écran */

.ecran {
  background: var(--papier); border: 1px solid var(--trait); border-radius: 10px;
  padding: 1.4rem; margin-bottom: 2rem; scroll-margin-top: 1.5rem;
}
.ecran.vise { box-shadow: 0 0 0 3px var(--profond); }

.ecran-tete {
  display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between;
  align-items: flex-start; margin-bottom: 1.2rem;
}
.ecran-identite .surtitre {
  font-size: 0.7rem; letter-spacing: 0.11em; text-transform: uppercase; color: var(--gris);
  font-weight: 700; margin: 0 0 0.3rem;
}
.ecran-identite h3 { font-size: 1.4rem; }
.chemin { margin: 0.35rem 0 0; color: var(--gris); font-size: 0.84rem; }

.ecran-outils { display: flex; flex-direction: column; align-items: flex-end; gap: 0.6rem; }
.bascule { display: inline-flex; border: 1px solid var(--trait); border-radius: 6px; overflow: hidden; }
.bascule button {
  appearance: none; border: 0; background: var(--papier); color: var(--encre);
  font: inherit; font-size: 0.82rem; padding: 0.4rem 0.8rem; cursor: pointer;
  border-right: 1px solid var(--trait);
}
.bascule button:last-child { border-right: 0; }
.bascule button.actif { background: var(--profond); color: var(--sable); font-weight: 600; }
.lien-reel { font-size: 0.84rem; font-weight: 600; }

/* --------------------------------------------------------- cadres device */

.scene { display: flex; justify-content: center; }
.cadre { width: 100%; }
.cadre[hidden] { display: none; }
.cadre-mobile { max-width: 430px; margin: 0 auto; }

.appareil {
  background: #d9cec2; border-radius: 10px; padding: 0; overflow: hidden;
  border: 1px solid var(--trait);
}
.cadre-mobile .appareil { border-radius: 26px; padding: 10px; background: #2b2b2b; border: 0; }
.appareil-plat { padding: 0; background: var(--papier); }
.appareil-plat img { width: 100%; height: auto; display: block; }

.chrome {
  display: flex; align-items: center; gap: 0.7rem; padding: 0.5rem 0.7rem;
  background: #e8ded2; border-bottom: 1px solid var(--trait);
}
.feux { display: inline-flex; gap: 5px; }
.feux i { width: 9px; height: 9px; border-radius: 50%; background: #c3b5a5; }
.barre-url {
  /* min-width nul, et c'est indispensable : sans lui, un élément flex ne descend
     pas sous la largeur de son contenu, et une adresse de fiche produit en une
     seule ligne insécable élargissait toute la page en fenêtre étroite. */
  flex: 1; min-width: 0; background: var(--papier); border-radius: 4px; padding: 0.2rem 0.6rem;
  font-family: var(--mono); font-size: 0.72rem; color: var(--gris);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.encoche {
  height: 18px; display: flex; align-items: center; justify-content: center;
}
.encoche::after { content: ""; width: 78px; height: 5px; border-radius: 3px; background: #4a4a4a; }

.fenetre { overflow-y: auto; overflow-x: hidden; background: var(--papier); position: relative; }
.cadre-mobile .fenetre { border-radius: 16px; }
.plan { position: relative; }
.plan img { width: 100%; height: auto; display: block; }

.zone {
  position: absolute; border-radius: 4px; text-decoration: none;
  outline: 2px dashed rgba(15, 59, 70, 0.55); outline-offset: 2px;
  background: rgba(15, 59, 70, 0.08);
  transition: background 120ms ease;
}
.zone:hover, .zone:focus-visible { background: rgba(15, 59, 70, 0.26); }
.zone span {
  position: absolute; left: 0; top: 100%; margin-top: 6px; white-space: nowrap;
  background: var(--profond); color: var(--sable); font-size: 0.7rem; font-weight: 600;
  padding: 0.15rem 0.45rem; border-radius: 3px; opacity: 0; pointer-events: none;
}
.zone:hover span, .zone:focus-visible span { opacity: 1; }
body.sans-zones .zone { outline: 0; background: transparent; }

.legende { margin: 0.6rem 0 0; font-size: 0.8rem; color: var(--gris); text-align: center; }

/* ----------------------------------------------------------------- notes */

.notes {
  display: grid; gap: 1.4rem; margin-top: 1.4rem; padding-top: 1.2rem;
  border-top: 1px solid var(--trait);
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.intention { font-size: 1.02rem; }
.points { margin: 0.7rem 0 0; padding-left: 1.1rem; color: var(--gris); font-size: 0.92rem; }
.points li { margin-bottom: 0.4rem; }
.points li::marker { color: var(--profond); }
.titre-page { font-size: 0.88rem; color: var(--gris); }
.titre-page span { color: var(--encre); font-weight: 600; }
.sections summary { cursor: pointer; font-size: 0.88rem; font-weight: 600; }
.sections ol { margin: 0.6rem 0 0; padding-left: 1.3rem; font-size: 0.88rem; color: var(--gris); }
.sections li { margin-bottom: 0.25rem; }

.verdict { display: inline-flex; gap: 0.5rem; margin-bottom: 0.9rem; }
.verdict button {
  appearance: none; font: inherit; font-size: 0.85rem; cursor: pointer;
  border: 1px solid var(--trait); background: var(--papier); color: var(--encre);
  border-radius: 6px; padding: 0.4rem 0.9rem;
}
.verdict button[data-statut="valide"].actif { background: var(--valide); border-color: var(--valide); color: #fff; }
.verdict button[data-statut="revoir"].actif { background: var(--revoir); border-color: var(--revoir); color: #fff; }
.champ { display: block; }
.champ textarea {
  width: 100%; font: inherit; font-size: 0.92rem; padding: 0.6rem 0.7rem;
  border: 1px solid var(--trait); border-radius: 6px; background: var(--fond); resize: vertical;
}
.champ textarea:focus-visible { outline: 2px solid var(--profond); outline-offset: 1px; }
.enregistre { font-size: 0.76rem; color: var(--valide); min-height: 1.2em; margin: 0.35rem 0 0; }

/* --------------------------------------------------------------- limites */

.limites { background: var(--sable); border-radius: 10px; padding: 1.6rem 1.8rem; max-width: 74ch; }
.limites h2 { font-size: 1.3rem; margin-bottom: 0.7rem; }
.limites ul { margin: 0.6rem 0 0; padding-left: 1.2rem; }
.limites li { margin-bottom: 0.5rem; }

footer.pied { margin-top: 2.5rem; font-size: 0.82rem; color: var(--gris); max-width: 74ch; }

/* ----------------------------------------------------------------- barre */

.barre-retours {
  position: fixed; inset: auto 0 0 0; height: var(--barre); z-index: 50;
  background: var(--profond); color: var(--sable);
  display: flex; align-items: center; gap: 1rem;
  padding: 0 clamp(0.8rem, 2vw, 1.6rem);
}
.compteurs { display: flex; gap: 1.1rem; font-size: 0.82rem; flex: 1; flex-wrap: wrap; }
.compteurs b { font-variant-numeric: tabular-nums; }
.barre-retours .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.barre-retours button, .barre-retours a.bouton {
  appearance: none; font: inherit; font-size: 0.84rem; cursor: pointer;
  border: 1px solid rgba(243, 232, 221, 0.5); background: transparent; color: var(--sable);
  border-radius: 6px; padding: 0.45rem 0.9rem; text-decoration: none; white-space: nowrap;
}
.barre-retours button.primaire { background: var(--sable); color: var(--profond); font-weight: 700; border-color: var(--sable); }
.barre-retours button:hover { background: rgba(243, 232, 221, 0.16); }
.barre-retours button.primaire:hover { background: #fff; }

/* ------------------------------------------------------------- étroitesse */

@media (max-width: 900px) {
  /* minmax(0, 1fr) et non 1fr : une colonne en 1fr garde pour minimum la
     largeur de son contenu. Le sommaire, dont la liste est elle-même une
     grille de colonnes de 190 px, réclamait alors 725 px dans une fenêtre de
     420 et emportait toute la page en défilement horizontal. */
  .mise-en-page { grid-template-columns: minmax(0, 1fr); }
  #sommaire { position: static; height: auto; }
  #sommaire ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
  .ecran-outils { align-items: flex-start; }
  .barre-retours { height: auto; padding: 0.7rem 1rem; flex-wrap: wrap; }
  body { padding-bottom: 8rem; }
}

@media print {
  #sommaire, .barre-retours, .zone { display: none; }
  .ecran { break-inside: avoid; border-color: #ccc; }
  .fenetre { overflow: visible; aspect-ratio: auto !important; }
}
`;

// ------------------------------------------------------------------ script

const SCRIPT = `
(() => {
  "use strict";
  const CLE = "maquette-kosskoss-v1";
  const RETOUR = ${JSON.stringify(RETOUR)};
  const ECRANS = JSON.parse(document.getElementById("liste-ecrans").textContent);
  // Déclaré avant les boucles qui peignent les cartes : chacune appelle
  // compter() dès son premier rendu, et une déclaration plus bas laissait la
  // variable dans sa zone morte — la barre du bas restait vide.
  const sortieCompteurs = document.querySelector(".compteurs");

  /** État du client : verdict et commentaire par écran, gardés dans son navigateur. */
  let etat = {};
  try { etat = JSON.parse(localStorage.getItem(CLE) || "{}"); } catch { etat = {}; }
  const enregistrer = () => localStorage.setItem(CLE, JSON.stringify(etat));
  const pour = (id) => (etat[id] ??= {});

  // ------------------------------------------------------------- bascules
  document.querySelectorAll(".ecran").forEach((carte) => {
    carte.querySelectorAll(".bascule button").forEach((bouton) => {
      bouton.addEventListener("click", () => {
        const vue = bouton.dataset.vue;
        carte.querySelectorAll(".bascule button").forEach((b) => {
          const choisi = b === bouton;
          b.classList.toggle("actif", choisi);
          b.setAttribute("aria-pressed", String(choisi));
        });
        carte.querySelectorAll(".cadre").forEach((c) => {
          c.hidden = c.dataset.vue !== vue;
        });
      });
    });
  });

  // ---------------------------------------------------- verdict et commentaire
  document.querySelectorAll(".ecran").forEach((carte) => {
    const id = carte.dataset.ecran;
    const pastille = document.querySelector('[data-pastille="' + id + '"]');
    const zoneTexte = carte.querySelector("textarea");
    const temoin = carte.querySelector("[data-enregistre]");

    const peindre = () => {
      const { statut, commentaire } = pour(id);
      carte.querySelectorAll(".verdict button").forEach((b) => {
        const choisi = b.dataset.statut === statut;
        b.classList.toggle("actif", choisi);
        b.setAttribute("aria-pressed", String(choisi));
      });
      if (pastille) {
        if (statut) pastille.dataset.etat = statut;
        else delete pastille.dataset.etat;
      }
      if (commentaire && zoneTexte.value !== commentaire) zoneTexte.value = commentaire;
      compter();
    };

    carte.querySelectorAll(".verdict button").forEach((bouton) => {
      bouton.addEventListener("click", () => {
        const courant = pour(id).statut;
        // Un second clic sur le même verdict l'annule : le client doit pouvoir
        // revenir sur un avis sans avoir à recharger la page.
        pour(id).statut = courant === bouton.dataset.statut ? undefined : bouton.dataset.statut;
        enregistrer();
        peindre();
      });
    });

    let minuteur = null;
    zoneTexte.addEventListener("input", () => {
      pour(id).commentaire = zoneTexte.value.trim() || undefined;
      enregistrer();
      compter();
      temoin.textContent = "Enregistré dans ce navigateur";
      clearTimeout(minuteur);
      minuteur = setTimeout(() => { temoin.textContent = ""; }, 2200);
    });

    peindre();
  });

  // ------------------------------------------------------------- compteurs
  function compter() {
    let valides = 0, revoir = 0, commentes = 0;
    for (const e of ECRANS) {
      const v = etat[e.id] || {};
      if (v.statut === "valide") valides++;
      if (v.statut === "revoir") revoir++;
      if (v.commentaire) commentes++;
    }
    // Construit par nœuds plutôt que par chaîne de balises : rien n’est
    // interprété comme du HTML, pas même par accident.
    const paires = [
      [ECRANS.length, "écrans"],
      [valides, "validés"],
      [revoir, "à revoir"],
      [commentes, "commentés"],
    ];
    sortieCompteurs.replaceChildren(
      ...paires.map(([n, mot]) => {
        const bloc = document.createElement("span");
        const gras = document.createElement("b");
        gras.textContent = String(n);
        bloc.append(gras, " " + mot);
        return bloc;
      }),
    );
  }

  // ---------------------------------------------------------- mise au point
  document.querySelectorAll("[data-saut]").forEach((lien) => {
    lien.addEventListener("click", () => {
      const cible = document.getElementById("e-" + lien.dataset.saut);
      if (!cible) return;
      cible.classList.add("vise");
      setTimeout(() => cible.classList.remove("vise"), 1600);
    });
  });

  const bascZones = document.getElementById("basculer-zones");
  bascZones.addEventListener("click", () => {
    const cachees = document.body.classList.toggle("sans-zones");
    bascZones.textContent = cachees ? "Montrer les zones cliquables" : "Masquer les zones cliquables";
  });

  // ------------------------------------------------------- sommaire suiveur
  const liens = new Map(
    [...document.querySelectorAll("[data-lien]")].map((a) => [a.dataset.lien, a]),
  );
  const guetteur = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees) {
        const lien = liens.get(entree.target.dataset.ecran);
        if (lien) lien.classList.toggle("courant", entree.isIntersecting);
      }
    },
    { rootMargin: "-45% 0px -45% 0px" },
  );
  document.querySelectorAll(".ecran").forEach((c) => guetteur.observe(c));

  // ---------------------------------------------------------------- export
  function composerRetours() {
    const lignes = [
      "Retours sur la maquette — KossKoss Select",
      "Site présenté : " + document.body.dataset.base,
      "",
    ];
    let rien = true;
    for (const e of ECRANS) {
      const v = etat[e.id] || {};
      if (!v.statut && !v.commentaire) continue;
      rien = false;
      const marque = v.statut === "valide" ? "[VALIDÉ]" : v.statut === "revoir" ? "[À REVOIR]" : "[SANS VERDICT]";
      lignes.push(marque + " " + e.numero + " · " + e.titre + "  (" + e.chemin + ")");
      if (v.commentaire) lignes.push("    " + v.commentaire.replace(/\\n/g, "\\n    "));
      lignes.push("");
    }
    if (rien) lignes.push("Aucun verdict ni commentaire n’a encore été saisi.");
    return lignes.join("\\n");
  }

  const dire = (texte) => {
    const zone = document.getElementById("message-barre");
    zone.textContent = texte;
    setTimeout(() => { zone.textContent = ""; }, 3000);
  };

  document.getElementById("copier").addEventListener("click", async () => {
    const texte = composerRetours();
    try {
      await navigator.clipboard.writeText(texte);
      dire("Retours copiés.");
    } catch {
      // Le presse-papiers est refusé quand la page vient d’un fichier local sur
      // certains navigateurs : on retombe sur une sélection manuelle.
      const zone = document.createElement("textarea");
      zone.value = texte;
      document.body.append(zone);
      zone.select();
      document.execCommand("copy");
      zone.remove();
      dire("Retours copiés.");
    }
  });

  document.getElementById("telecharger").addEventListener("click", () => {
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(new Blob([composerRetours()], { type: "text/plain;charset=utf-8" }));
    lien.download = "retours-maquette-kosskoss.txt";
    lien.click();
    URL.revokeObjectURL(lien.href);
    dire("Fichier de retours téléchargé.");
  });

  const envoi = document.getElementById("envoyer");
  if (envoi) {
    envoi.addEventListener("click", () => {
      const texte = encodeURIComponent(composerRetours());
      window.open(
        RETOUR.whatsapp
          ? "https://wa.me/" + RETOUR.whatsapp + "?text=" + texte
          : "mailto:" + RETOUR.email + "?subject=" +
            encodeURIComponent("Retours maquette KossKoss Select") + "&body=" + texte,
        "_blank",
      );
    });
  }

  compter();
})();
`;

// -------------------------------------------------------------------- page

const listeEcrans = ecransRetenus.map((e) => ({
  id: e.id,
  titre: e.titre,
  chemin: e.chemin,
  numero: numeros.get(e.id),
}));

const boutonEnvoi = RETOUR.whatsapp
  ? `<button type="button" id="envoyer">Envoyer par WhatsApp</button>`
  : RETOUR.email
    ? `<button type="button" id="envoyer">Envoyer par e-mail</button>`
    : "";

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Maquette du site — KossKoss Select</title>
<style>${STYLES}</style>
</head>
<body data-base="${donnees.base}">
<a class="saut" href="#contenu">Aller au contenu</a>

<div class="mise-en-page">
  <aside id="sommaire">
    <p class="marque">KossKoss Select <span>Maquette du site</span></p>
    <p class="date">Captures du ${dateEnFrancais(donnees.capturéLe)}</p>
    ${bâtirSommaire()}
  </aside>

  <main id="contenu">
    <header class="couverture">
      <p class="surtitre">Présentation client</p>
      <h1>La boutique, écran par écran</h1>
      <p class="accroche">
        ${ecransRetenus.length} écrans du site, photographiés tels qu’ils sont en ligne le
        ${dateEnFrancais(donnees.capturéLe)}, en version ordinateur et en version mobile.
        Rien n’est ici une image d’intention : ce sont les pages réelles.
      </p>
      <div class="mode-emploi">
        <p class="etiquette">Comment lire cette maquette</p>
        <ol>
          <li>Chaque écran se fait défiler <strong>dans son cadre</strong> : la capture couvre toute la hauteur de la page.</li>
          <li>Basculez entre <strong>Ordinateur</strong> et <strong>Mobile</strong> sur chaque écran.</li>
          <li>Les <strong>zones encadrées en pointillés</strong> mènent à l’écran suivant du parcours.</li>
          <li><strong>Ouvrir la vraie page</strong> ouvre le site en ligne dans un nouvel onglet, où tout fonctionne.</li>
          <li>Donnez votre <strong>verdict</strong> et votre <strong>commentaire</strong> sous chaque écran, puis envoyez le tout depuis la barre du bas.</li>
        </ol>
      </div>
      ${
        MAQUETTE_STRUCTURE
          ? `<div class="structure-fournie">
               <p class="etiquette">La structure que vous nous avez transmise</p>
               <img src="${MAQUETTE_STRUCTURE}" alt="Maquette de structure du site fournie par le client" loading="lazy">
             </div>`
          : ""
      }
    </header>

    ${PARCOURS.map(bâtirParcours).join("")}

    <section class="limites">
      <h2>Ce que cette maquette ne montre pas</h2>
      <p>Par honnêteté, et pour que la validation porte sur du solide :</p>
      <ul>
        <li><strong>L’espace client une fois connecté</strong> — compte, historique de commandes, carnet d’adresses. Ces écrans existent et fonctionnent ; les photographier demandait de créer un compte réel dans la base de la boutique en ligne, ce qui a été écarté pour cette version.</li>
        <li><strong>La confirmation de commande</strong> — l’afficher supposait de passer une vraie commande, avec le paiement et les courriels qui vont avec. Le parcours s’arrête donc au récapitulatif, juste avant l’envoi.</li>
        <li><strong>Le back-office</strong> — les écrans d’administration de la boutique ne font pas partie de cette présentation.</li>
      </ul>
    </section>

    <footer class="pied">
      <p>
        Captures automatisées sur ${donnees.base} le ${dateEnFrancais(donnees.capturéLe)}.
        Les polices de la charte (Cinzel, Gilroy) ne sont pas embarquées dans ce document :
        les titres de cette page de présentation utilisent une substitution système.
        Le site en ligne, lui, sert bien les polices prévues.
      </p>
      <p>Vos verdicts et commentaires restent dans ce navigateur jusqu’à ce que vous les envoyiez.</p>
    </footer>
  </main>
</div>

<div class="barre-retours">
  <div class="compteurs"></div>
  <span id="message-barre" role="status"></span>
  <div class="actions">
    <button type="button" id="basculer-zones">Masquer les zones cliquables</button>
    <button type="button" id="telecharger">Télécharger mes retours</button>
    ${boutonEnvoi}
    <button type="button" id="copier" class="primaire">Copier mes retours</button>
  </div>
</div>

<script id="liste-ecrans" type="application/json">${JSON.stringify(listeEcrans).replace(/</g, "\\u003c")}</script>
<script>${SCRIPT}</script>
</body>
</html>
`;

writeFileSync(join(SORTIE, "index.html"), page);

// Un mot pour la personne qui ouvre le dossier, avant même la page.
writeFileSync(
  join(SORTIE, "LIRE-MOI.txt"),
  `Maquette du site KossKoss Select
================================

Ouvrez « index.html » d'un double-clic : la maquette s'affiche dans votre
navigateur. Aucune installation, aucun compte, aucune connexion nécessaire —
sauf pour les boutons « Ouvrir la vraie page », qui mènent au site en ligne.

Le dossier contient :
  index.html          la maquette
  captures/           les ${Object.values(donnees.ecrans).reduce((n, e) => n + Object.keys(e.appareils).length, 0)} photos d'écrans
  maquettes-client/   les maquettes d'origine, pour comparaison
  donnees.json        le relevé technique des captures

Gardez les fichiers ensemble : la page lit les images dans le dossier
« captures ». Si vous transmettez la maquette, transmettez le dossier entier
ou son archive ZIP.

Captures réalisées le ${dateEnFrancais(donnees.capturéLe)} sur ${donnees.base}.
`,
);

console.log(
  `index.html écrit : ${ecransRetenus.length} écrans, ${
    Object.values(donnees.ecrans).reduce((n, e) => n + Object.keys(e.appareils).length, 0)
  } captures.`,
);
if (ECRANS.length !== ecransRetenus.length) {
  const absents = ECRANS.filter((e) => !donnees.ecrans[e.id]).map((e) => e.id);
  console.warn(`Écrans déclarés mais jamais capturés, donc absents du livrable : ${absents.join(", ")}`);
}
