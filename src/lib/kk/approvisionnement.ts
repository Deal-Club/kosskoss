/**
 * Statut déduit et totaux d'un bon de commande fournisseur.
 *
 * Module pur — zéro import. Le statut d'un bon ne se saisit jamais : il se
 * déduit des quantités commandées et reçues sur ses lignes, recalculé à
 * chaque réception.
 *
 * Règles :
 * - un bon `annule` ou `brouillon` ne change jamais de statut par une
 *   réception : annuler est une décision, pas un état que les quantités
 *   pourraient défaire, et on ne reçoit pas ce qui n'a pas encore été
 *   envoyé au fournisseur ;
 * - « tout reçu » veut dire *au moins* la quantité commandée sur **chaque**
 *   ligne — une sur-livraison solde le bon, elle ne le laisse pas « partiel » ;
 * - un bon sans ligne n'est pas « reçu » : zéro ligne toutes reçues serait
 *   vrai au sens strict, et absurde ;
 * - le restant est borné à zéro : une sur-livraison ne crée pas de restant
 *   négatif.
 */

export type StatutBon = "brouillon" | "envoye" | "recu_partiel" | "recu" | "annule";

export interface LigneBon {
  quantiteCommandee: number;
  quantiteRecue: number;
  coutUnitaireCents: number;
}

export function statutApresReception(statutActuel: StatutBon, lignes: LigneBon[]): StatutBon {
  // Un bon annulé ou en brouillon ne change jamais de statut par une
  // réception : ce n'est pas aux quantités de rouvrir une décision, ni de
  // solder ce qui n'a jamais été envoyé.
  if (statutActuel === "annule" || statutActuel === "brouillon") {
    return statutActuel;
  }

  // Un bon sans ligne n'est « reçu » sur aucune base : on le laisse tel quel.
  if (lignes.length === 0) {
    return statutActuel;
  }

  const toutRecu = lignes.every((ligne) => ligne.quantiteRecue >= ligne.quantiteCommandee);
  if (toutRecu) {
    return "recu";
  }

  const auMoinsUneLigneRecue = lignes.some((ligne) => ligne.quantiteRecue > 0);
  if (auMoinsUneLigneRecue) {
    return "recu_partiel";
  }

  // Rien n'est arrivé : le statut ne bouge pas.
  return statutActuel;
}

export function totauxBon(lignes: LigneBon[]): {
  engageCents: number;
  recuCents: number;
  restantCents: number;
  toutRecu: boolean;
} {
  let engageCents = 0;
  let recuCents = 0;
  let restantCents = 0;

  for (const ligne of lignes) {
    engageCents += ligne.quantiteCommandee * ligne.coutUnitaireCents;
    recuCents += ligne.quantiteRecue * ligne.coutUnitaireCents;

    // Le restant est borné à zéro : une sur-livraison ne doit jamais rendre
    // un restant négatif.
    const quantiteRestante = Math.max(0, ligne.quantiteCommandee - ligne.quantiteRecue);
    restantCents += quantiteRestante * ligne.coutUnitaireCents;
  }

  const toutRecu =
    lignes.length > 0 && lignes.every((ligne) => ligne.quantiteRecue >= ligne.quantiteCommandee);

  return { engageCents, recuCents, restantCents, toutRecu };
}
