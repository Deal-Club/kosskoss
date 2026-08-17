/**
 * Photographie le site en ligne pour alimenter la maquette de présentation.
 *
 *   node scripts/maquette/capture.mjs [--base https://…] [--seulement id,id]
 *
 * Le script ne modifie RIEN sur le site : il navigue, survole, clique sur des
 * liens et ajoute un produit au panier — lequel vit dans le navigateur jetable
 * de Playwright. Aucun formulaire n'est envoyé, aucune commande n'est passée,
 * aucun compte n'est créé.
 *
 * Prérequis : playwright-core installé et un Chromium présent dans le cache
 * ms-playwright (celui du greffon Playwright suffit).
 *
 * Produit dans livrables/maquette-kosskoss/ :
 *   captures/<id>-<appareil>.webp   les images
 *   donnees.json                   dimensions, titres relevés, zones cliquables
 */
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ECRANS, APPAREILS } from "./ecrans.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..");
const SORTIE = join(RACINE, "livrables", "maquette-kosskoss");
const CAPTURES = join(SORTIE, "captures");
const TAMPON = join(SORTIE, ".png-temporaires");

const args = process.argv.slice(2);
const lireOption = (nom) => {
  const i = args.indexOf(`--${nom}`);
  return i === -1 ? null : args[i + 1];
};
const BASE = lireOption("base") ?? "https://kosskoss.vercel.app";
const FILTRE = lireOption("seulement")?.split(",").map((s) => s.trim());

/**
 * Chromium du cache ms-playwright. On ne télécharge rien : on réutilise le
 * navigateur déjà présent, quelle que soit sa révision.
 */
function trouverChromium() {
  const cache = join(process.env.HOME, "Library", "Caches", "ms-playwright");
  const dossiers = existsSync(cache)
    ? readdirSync(cache)
        .filter((d) => d.startsWith("chromium-"))
        .sort()
        .reverse()
    : [];
  for (const d of dossiers) {
    for (const arch of ["chrome-mac-arm64", "chrome-mac"]) {
      const bin = join(
        cache,
        d,
        arch,
        "Google Chrome for Testing.app",
        "Contents",
        "MacOS",
        "Google Chrome for Testing",
      );
      if (existsSync(bin)) return bin;
      const bin2 = join(cache, d, arch, "Chromium.app", "Contents", "MacOS", "Chromium");
      if (existsSync(bin2)) return bin2;
    }
  }
  throw new Error("Aucun Chromium trouvé dans ~/Library/Caches/ms-playwright");
}

const PRODUIT_TEST = "/soins-visage/hydratants/clinique-moisture-surge-100h";

/** Attente raisonnable : le réseau se calme, les polices sont chargées. */
async function stabiliser(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
}

/**
 * Déroule la page jusqu'en bas puis revient exactement en haut.
 *
 * Deux raisons, et les deux se voient sur la photo :
 *   1. les images en chargement paresseux restent vides si elles n'ont jamais
 *      croisé la fenêtre d'affichage ;
 *   2. les apparitions au défilement de la vitrine sont des transitions
 *      déclenchées par IntersectionObserver. Playwright sait neutraliser les
 *      animations CSS, pas rejouer ces transitions : un écran jamais déroulé se
 *      photographie donc à moitié transparent.
 *
 * Le retour en haut est vérifié plutôt que supposé : avec un défilement
 * adouci par CSS, `scrollTo` s'anime, et toutes les coordonnées relevées
 * ensuite se retrouvaient décalées de la position résiduelle.
 */
async function deroulerToutePage(page) {
  await page.evaluate(async () => {
    const racine = document.documentElement;
    const adouci = racine.style.scrollBehavior;
    racine.style.scrollBehavior = "auto";
    const pas = window.innerHeight * 0.8;
    for (let y = 0; y < racine.scrollHeight; y += pas) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, racine.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 0);
    for (let i = 0; i < 20 && window.scrollY > 0; i++) {
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 50));
    }
    racine.style.scrollBehavior = adouci;
  });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  const reste = await page.evaluate(() => window.scrollY);
  if (reste > 1) throw new Error(`la page n'est pas revenue en haut (reste ${reste} px)`);
}

/** Attend que toutes les images aient fini de charger, floutage de Next compris. */
async function attendreImages(page) {
  await page
    .evaluate(
      () =>
        Promise.all(
          [...document.images]
            .filter((img) => !img.complete)
            .map(
              (img) =>
                new Promise((resoudre) => {
                  img.addEventListener("load", resoudre, { once: true });
                  img.addEventListener("error", resoudre, { once: true });
                  setTimeout(resoudre, 6000);
                }),
            ),
        ),
    )
    .catch(() => {});
}

/** Ouvre une page et la prépare : réseau calme, images chargées, page déroulée. */
async function ouvrir(page, chemin) {
  await page.goto(BASE + chemin, { waitUntil: "domcontentloaded", timeout: 45000 });
  await stabiliser(page);
  await deroulerToutePage(page);
  await attendreImages(page);
}

/**
 * Ajoute le produit de test au panier du contexte courant.
 *
 * On attend le tiroir, et non un délai fixe : il met plus d'une seconde à se
 * monter — il ne s'affiche qu'une fois le panier non vide et le magasin relu
 * après hydratation (voir CartDrawer.tsx). Un `waitForTimeout` trop court
 * photographiait la page sans tiroir sans jamais signaler d'erreur.
 * La lecture de localStorage derrière sert de contrôle : elle prouve que la
 * ligne est bien en panier, et pas seulement que le clic est parti.
 */
async function garnirPanier(page) {
  await ouvrir(page, PRODUIT_TEST);
  await page.locator('button:has-text("Ajouter au panier")').first().click();
  await page.waitForSelector('[role="dialog"]', { state: "visible", timeout: 20000 });
  const panier = await page.evaluate(() => window.localStorage.getItem("mlc.cart.v1"));
  if (!panier || panier === "[]") throw new Error("le panier est resté vide après l'ajout");
  // Les animations d'entrée du tiroir sont courtes ; ce répit évite de
  // photographier un panneau à mi-course.
  await page.waitForTimeout(600);
}

/**
 * Manœuvres à exécuter avant la photo. Chacune laisse la page dans l'état
 * exact que le client doit voir.
 */
const MANOEUVRES = {
  async megamenu(page) {
    await ouvrir(page, "/");
    await page.locator('header a[href="/soins-visage"]').first().hover();
    await page.waitForTimeout(900);
  },

  async menuMobile(page) {
    await ouvrir(page, "/");
    // Le déclencheur du menu n'a pas de libellé stable : on essaie les pistes
    // les plus probables dans l'ordre, et on signale si aucune n'ouvre rien.
    const pistes = [
      'header button[aria-label*="enu"]',
      'header button[aria-expanded]',
      "header button:not([type=submit])",
    ];
    for (const piste of pistes) {
      const cible = page.locator(piste).first();
      if ((await cible.count()) === 0) continue;
      await cible.click().catch(() => {});
      await page.waitForTimeout(800);
      const ouvert = await page.locator('[role="dialog"], nav[aria-expanded="true"]').count();
      if (ouvert > 0) return;
    }
    throw new Error("menu mobile : aucun déclencheur n'a ouvert de panneau");
  },

  async diagnosticComplet(page) {
    await ouvrir(page, "/diagnostic");
    // Cinq questions, on retient la première réponse de chacune. Le nombre de
    // clics n'est pas figé dans le script : on avance tant qu'une série de
    // réponses est proposée, au maximum huit fois.
    for (let i = 0; i < 8; i++) {
      const reponses = page.locator("main button").filter({ hasNotText: /^$/ });
      const nb = await reponses.count();
      if (nb === 0) break;
      const premiere = reponses.first();
      if (!(await premiere.isVisible().catch(() => false))) break;
      await premiere.click().catch(() => {});
      await page.waitForTimeout(1100);
    }
    await page.waitForTimeout(1500);
  },

  /**
   * Le diagnostic jusqu'à la routine recommandée.
   *
   * L'écran d'analyse est une étape à durée fixe : on attend qu'il cède la
   * place, en surveillant le titre principal plutôt qu'en dormant un nombre de
   * secondes choisi au hasard — une attente au réveil trop tôt photographiait
   * la roue qui tourne à la place du résultat.
   */
  async diagnosticResultat(page) {
    await MANOEUVRES.diagnosticComplet(page);
    await page
      .waitForFunction(
        () => document.querySelector("h1")?.textContent?.includes("Analyse") === false,
        null,
        { timeout: 30000 },
      )
      .catch(() => {});
    await stabiliser(page);
    await deroulerToutePage(page);
    await attendreImages(page);
  },

  async ajoutPanier(page) {
    await garnirPanier(page);
  },

  /**
   * Panier et commande, sur un panier réellement garni.
   *
   * Le remplissage n'est fait QUE s'il manque : le tiroir du panier, capturé
   * juste avant dans le même contexte, y a déjà déposé sa ligne. Sans ce
   * contrôle, l'article était ajouté deux fois et la maquette montrait une
   * quantité de 2 sans raison.
   */
  async panierGarni(page, ecran) {
    const dejaGarni = await page
      .goto(BASE + "/", { waitUntil: "domcontentloaded" })
      .then(() => page.evaluate(() => window.localStorage.getItem("mlc.cart.v1")))
      .catch(() => null);
    if (!dejaGarni || dejaGarni === "[]") await garnirPanier(page);
    await ouvrir(page, ecran.chemin);
  },
};

/**
 * Relève les coordonnées d'une zone cliquable, en pourcentages de l'image.
 *
 * `:visible` est décisif : un même lien existe souvent deux fois dans la page —
 * une fois dans la navigation de bureau, une fois dans le menu mobile replié.
 * Sans ce filtre, la mesure tombait sur l'exemplaire masqué, de taille nulle,
 * et la zone disparaissait des captures mobiles.
 */
async function releverZone(page, hotspot, pleinePage) {
  const cible = page.locator(`${hotspot.selecteur} >> visible=true`).first();
  if ((await cible.count()) === 0) return null;
  const mesure = await cible
    .evaluate((el, plein) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      const largeurRef = plein
        ? document.documentElement.scrollWidth
        : window.innerWidth;
      const hauteurRef = plein
        ? document.documentElement.scrollHeight
        : window.innerHeight;
      const x = plein ? r.x + window.scrollX : r.x;
      const y = plein ? r.y + window.scrollY : r.y;
      return {
        gauche: (x / largeurRef) * 100,
        haut: (y / hauteurRef) * 100,
        largeur: (r.width / largeurRef) * 100,
        hauteur: (r.height / hauteurRef) * 100,
      };
    }, pleinePage)
    .catch(() => null);
  return mesure ? { ...mesure, vers: hotspot.vers } : null;
}

/** Relève le titre principal et les sections réelles de la page. */
async function releverContenu(page) {
  return page.evaluate(() => ({
    titreOnglet: document.title,
    h1: document.querySelector("h1")?.textContent?.trim().replace(/\s+/g, " ") ?? null,
    sections: [...document.querySelectorAll("main h2")]
      .map((h) => h.textContent?.trim().replace(/\s+/g, " "))
      .filter((t) => t && t.length < 90)
      .slice(0, 12),
  }));
}

/** Plafond du format WebP, en pixels, sur chaque dimension. */
const WEBP_MAX = 16383;

/**
 * Convertit en WebP, en réduisant d'abord les photos trop hautes.
 *
 * L'accueil en mobile mesure près de 9 500 px de haut ; à densité 2, la photo
 * dépasse le plafond du format WebP et l'encodage échoue. On la ramène sous la
 * limite plutôt que de renoncer à la densité 2 sur tous les autres écrans, qui
 * eux tiennent largement.
 */
function convertirWebp(source, destination, qualite) {
  const hauteur = Number(
    execFileSync("sips", ["-g", "pixelHeight", source]).toString().match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0,
  );
  if (hauteur > WEBP_MAX) {
    execFileSync("sips", ["-Z", String(WEBP_MAX - 383), source, "--out", source]);
  }
  execFileSync("cwebp", ["-q", String(qualite), "-quiet", source, "-o", destination]);
}

// ---------------------------------------------------------------- exécution

mkdirSync(CAPTURES, { recursive: true });
mkdirSync(TAMPON, { recursive: true });

const aCapturer = FILTRE ? ECRANS.filter((e) => FILTRE.includes(e.id)) : ECRANS;

/**
 * Relevé fusionné avec le précédent.
 *
 * Une campagne complète dépasse le quart d'heure ; on la mène donc par lots
 * avec `--seulement`. Sans cette fusion, chaque lot effaçait le relevé des
 * précédents et le livrable se retrouvait avec un seul parcours.
 */
const fichierDonnees = join(SORTIE, "donnees.json");
const donnees = existsSync(fichierDonnees)
  ? JSON.parse(readFileSync(fichierDonnees, "utf8"))
  : { base: BASE, ecrans: {} };
donnees.base = BASE;
donnees.capturéLe = new Date().toISOString();
donnees.ecrans ??= {};
const echecs = [];

const navigateur = await chromium.launch({ executablePath: trouverChromium() });

for (const [nomAppareil, appareil] of Object.entries(APPAREILS)) {
  // Deux contextes par appareil : un panier garni ferait apparaître un compteur
  // dans l'en-tête de TOUTES les autres captures.
  const contextes = {
    propre: await navigateur.newContext({
      viewport: { width: appareil.largeur, height: appareil.hauteur },
      deviceScaleFactor: appareil.dsf,
      isMobile: nomAppareil === "mobile",
      hasTouch: nomAppareil === "mobile",
      locale: "fr-FR",
    }),
    achat: await navigateur.newContext({
      viewport: { width: appareil.largeur, height: appareil.hauteur },
      deviceScaleFactor: appareil.dsf,
      isMobile: nomAppareil === "mobile",
      hasTouch: nomAppareil === "mobile",
      locale: "fr-FR",
    }),
  };

  // Pas de remplissage préalable : le premier écran du parcours d'achat est le
  // tiroir du panier, et c'est lui qui dépose l'article. Les écrans suivants
  // héritent du même contexte, donc du même panier. `panierGarni` vérifie tout
  // de même sa présence, pour qu'une capture isolée du panier reste juste.
  for (const ecran of aCapturer) {
    const appareilsVoulus = ecran.devices ?? ["desktop", "mobile"];
    if (!appareilsVoulus.includes(nomAppareil)) continue;

    const contexte = ecran.parcours === "achat" ? contextes.achat : contextes.propre;
    const page = await contexte.newPage();
    const pleinePage = ecran.pleinePage !== false;
    const etiquette = `${ecran.id} / ${nomAppareil}`;

    try {
      // Chaque manœuvre appelle `ouvrir()`, qui déroule déjà la page et attend
      // les images : rien à refaire ici, et surtout pas après avoir ouvert un
      // panneau en surimpression.
      if (ecran.etat && MANOEUVRES[ecran.etat]) {
        await MANOEUVRES[ecran.etat](page, ecran);
      } else {
        await ouvrir(page, ecran.chemin);
      }

      // Deuxième attente d'images, après la manœuvre : un panneau ouvert charge
      // ses propres visuels — les suggestions du tiroir, par exemple — et ceux-là
      // n'existaient pas encore lors de la première attente.
      await attendreImages(page);

      const contenu = await releverContenu(page);
      const dimensions = await page.evaluate((plein) => ({
        largeur: plein ? document.documentElement.scrollWidth : window.innerWidth,
        hauteur: plein ? document.documentElement.scrollHeight : window.innerHeight,
      }), pleinePage);

      const zones = [];
      for (const h of ecran.hotspots ?? []) {
        const devicesZone = h.devices ?? ["desktop", "mobile"];
        if (!devicesZone.includes(nomAppareil)) continue;
        const zone = await releverZone(page, h, pleinePage);
        if (zone) zones.push(zone);
        else console.warn(`   zone introuvable (${etiquette}) : ${h.selecteur}`);
      }

      const png = join(TAMPON, `${ecran.id}-${nomAppareil}.png`);
      await page.screenshot({ path: png, fullPage: pleinePage, animations: "disabled" });
      const webp = join(CAPTURES, `${ecran.id}-${nomAppareil}.webp`);
      convertirWebp(png, webp, nomAppareil === "mobile" ? 78 : 82);

      donnees.ecrans[ecran.id] ??= { contenu, appareils: {} };
      donnees.ecrans[ecran.id].contenu = contenu;
      donnees.ecrans[ecran.id].appareils[nomAppareil] = {
        image: `captures/${ecran.id}-${nomAppareil}.webp`,
        ...dimensions,
        zones,
      };

      console.log(`✓ ${etiquette}  ${dimensions.largeur}×${dimensions.hauteur}`);
    } catch (erreur) {
      console.error(`✗ ${etiquette} — ${erreur.message}`);
      echecs.push({ ecran: ecran.id, appareil: nomAppareil, message: erreur.message });
    } finally {
      await page.close();
    }
  }

  await contextes.propre.close();
  await contextes.achat.close();
}

await navigateur.close();
rmSync(TAMPON, { recursive: true, force: true });

donnees.echecs = echecs;
writeFileSync(join(SORTIE, "donnees.json"), JSON.stringify(donnees, null, 2));

console.log(
  `\n${Object.keys(donnees.ecrans).length} écrans capturés, ${echecs.length} échec(s).`,
);
if (echecs.length) process.exitCode = 1;
