/**
 * Point d'entrée Node pour l'hébergement Hostinger.
 *
 * Ce fichier n'est utile que sur l'hébergement Node.js mutualisé de Hostinger,
 * où Phusion Passenger démarre l'application en exécutant un fichier précis et
 * ne sait pas lancer une commande npm. Sur un VPS, il ne sert à rien :
 * `npm start` (donc `next start`) reste la voie recommandée par Next.js et
 * conserve toutes les optimisations du serveur intégré.
 *
 * Le port n'est jamais choisi ici : Passenger comme PM2 l'imposent par la
 * variable PORT. Le forcer casserait le démarrage côté Hostinger.
 *
 * Attention : ce fichier ne passe pas par le compilateur de Next.js. Il reste
 * donc en CommonJS et n'utilise aucune syntaxe TypeScript.
 */

const { createServer } = require("node:http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
// Le mode développement recompile à chaque requête : en production, il rendrait
// le site inutilisable. On exige donc NODE_ENV=production côté hébergeur.
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(`MLC Bois écoute sur le port ${port} (${dev ? "développement" : "production"})`);
  });
});
