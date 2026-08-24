import { notFound } from "next/navigation";

/**
 * Attrape tout ce qui ne correspond à aucune route de la boutique.
 *
 * ── POURQUOI CETTE ROUTE EXISTE ALORS QUE `not-found.tsx` EXISTE ────────────
 *
 * Le routage multilingue RÉÉCRIT l'adresse demandée (« /truc » devient
 * « /fr/truc ») avant que Next ne cherche la route. Une adresse inconnue
 * n'échoue donc pas au routage : elle est résolue, puis rendue à l'intérieur du
 * gabarit de langue — et la réponse repart avec un code **200**.
 *
 * C'est un « faux 404 » : le visiteur voit bien la page d'erreur, mais les
 * moteurs de recherche reçoivent « cette page existe » et l'indexent. Une
 * boutique finit alors référencée sur des adresses mortes.
 *
 * Cette route attrape ce qui reste et appelle `notFound()`, ce qui rend la
 * main à `not-found.tsx` AVEC le code 404. Elle n'a volontairement aucun
 * contenu : tout ce que le visiteur lit vient de la page d'erreur voisine.
 *
 * Elle est la moins prioritaire du routage — toute route réelle, statique ou
 * dynamique, passe avant elle. Ajouter une page n'a donc jamais à la modifier.
 */
export default function Introuvable(): never {
  notFound();
}
