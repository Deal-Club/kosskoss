/**
 * Charge les pages de la boutique dans un vrai navigateur et échoue à la
 * moindre erreur de console.
 *
 * ── POURQUOI CE SCRIPT EXISTE ───────────────────────────────────────────────
 *
 * Il a été écrit après une panne que rien ne voyait. L'accueil renvoyait
 * HTTP 200, le HTML servi était complet et correct, le build passait, les
 * 863 tests passaient. Et pourtant, dans le navigateur, la page entière était
 * remplacée par « Une erreur est survenue » : un composant serveur atteint
 * depuis un carrousel client appelait `getTranslations`, ce qui lève à
 * L'HYDRATATION.
 *
 * Autrement dit : un code HTTP ne prouve rien sur ce que voit un visiteur.
 * Un HTML correct non plus, puisque l'erreur survient après sa livraison.
 * Seul un navigateur qui exécute le JavaScript peut le dire.
 *
 * ── CE QU'IL VÉRIFIE ────────────────────────────────────────────────────────
 *
 * Pour chaque page : le code HTTP, le titre rendu APRÈS hydratation, les
 * erreurs de console et les requêtes échouées. Une page dont le `h1` devient
 * « Une erreur est survenue » est signalée même si tout le reste est vert.
 *
 * Usage :
 *   node scripts/verifier-pages.mjs [base]
 * où `base` vaut par défaut http://127.0.0.1:3000 — passez l'adresse de
 * production pour contrôler un déploiement.
 */
import { chromium } from "playwright";

const base = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");

/** Un échantillon qui traverse chaque famille de gabarit, pas seulement l'accueil. */
const PAGES = [
  "/",
  "/en",
  "/soins-visage",
  "/marques",
  "/routines",
  "/journal",
  "/diagnostic",
  "/panier",
  "/mentions-legales",
];

/** Bruit d'environnement, sans rapport avec le code de la boutique. */
const TOLERE = [
  /favicon/i,
  /_next\/hmr/i, // rechargement à chaud, absent en production
  /ERR_INTERNET_DISCONNECTED/i,
  // Préchargements que Next lance sur les liens visibles : ils sont
  // volontairement abandonnés quand on quitte la page, et leur annulation
  // remonte comme un échec de requête. Les compter ferait échouer toutes les
  // pages tout le temps, ce qui reviendrait à n'avoir aucun contrôle.
  /[?&]_rsc=/,
];

const navigateur = await chromium.launch();
let enDefaut = 0;

for (const chemin of PAGES) {
  const page = await navigateur.newPage();
  const erreurs = [];
  const echecs = [];

  page.on("console", (m) => {
    if (m.type() === "error" && !TOLERE.some((r) => r.test(m.text()))) {
      erreurs.push(m.text().slice(0, 200));
    }
  });
  page.on("pageerror", (e) => erreurs.push(String(e).slice(0, 200)));
  page.on("requestfailed", (r) => {
    const url = r.url();
    if (!TOLERE.some((re) => re.test(url))) echecs.push(url.slice(0, 110));
  });

  let code = 0;
  let titre = "";
  try {
    const reponse = await page.goto(base + chemin, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    code = reponse?.status() ?? 0;
    // L'attente compte : l'erreur d'hydratation ne frappe pas au premier
    // rendu, mais quand React reprend la main sur le HTML déjà livré.
    await page.waitForTimeout(2000);
    titre = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  } catch (e) {
    erreurs.push("navigation : " + String(e).slice(0, 150));
  }

  const ecranDErreur = /Une erreur est survenue|Something went wrong/i.test(titre);
  const casse = ecranDErreur || erreurs.length > 0 || code >= 500;
  if (casse) enDefaut += 1;

  console.log(
    `${casse ? "ÉCHEC" : "  ok "}  ${chemin.padEnd(18)} ${code}  ${titre.trim().slice(0, 52)}`,
  );
  for (const e of erreurs.slice(0, 3)) console.log(`         ↳ ${e}`);
  for (const e of echecs.slice(0, 3)) console.log(`         ↳ requête échouée : ${e}`);

  await page.close();
}

await navigateur.close();
console.log(`\n${PAGES.length - enDefaut}/${PAGES.length} pages saines.`);
process.exitCode = enDefaut > 0 ? 1 : 0;
