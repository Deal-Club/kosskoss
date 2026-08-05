// Longueurs admises par Google : EAN-8, UPC-A, EAN-13 et GTIN-14.
const LONGUEURS_ADMISES = new Set([8, 12, 13, 14]);

/**
 * Vérifie la clé de contrôle d'un GTIN.
 *
 * Un code dont le checksum est faux est nécessairement erroné. Le refuser ici
 * évite qu'il ne parte dans le flux : chez Google, un identifiant faux n'entraîne
 * pas le simple refus du produit mais expose à la suspension du compte.
 */
export function isValidGtin(value: string): boolean {
  const code = value.trim();
  if (!/^\d+$/.test(code)) return false;
  if (!LONGUEURS_ADMISES.has(code.length)) return false;

  // Séquence entièrement nulle : le checksum est trivialement satisfait
  // (10 - 0 % 10) % 10 === 0, mais un tel code ne résout chez aucun registre GS1,
  // quelle que soit sa longueur (EAN-8, UPC-A, EAN-13 ou GTIN-14).
  if (/^0+$/.test(code)) return false;

  const chiffres = [...code].map(Number);
  const controle = chiffres.pop();
  if (controle === undefined) return false;

  // Pondération alternée 3 puis 1, en partant du chiffre le plus à droite du corps.
  let somme = 0;
  let poids = 3;
  for (let i = chiffres.length - 1; i >= 0; i--) {
    somme += chiffres[i] * poids;
    poids = poids === 3 ? 1 : 3;
  }

  if ((10 - (somme % 10)) % 10 !== controle) return false;

  // Plages GS1 à circulation restreinte, réservées à l'usage interne d'une
  // enseigne (ex. codes-barres à poids variable en rayon) : elles ont un
  // checksum valide mais ne sont jamais des identifiants produit publics.
  //
  // On limite volontairement cette exclusion aux codes de 13 chiffres (EAN-13) :
  // - le préfixe « 2 » (plage 20-29) et les préfixes « 02 »/« 04 » sont des
  //   plages GS1 documentées précisément pour les EAN-13 à circulation restreinte ;
  // - l'UPC-A (12 chiffres) utilise aussi un « system number » 2 en tête, mais
  //   pour un usage différent et légitime en caisse (articles pesés en magasin) —
  //   l'exclure produirait des faux positifs sur des UPC réels ;
  // - l'EAN-8 (8 chiffres) n'a pas d'équivalent documenté de ces plages ;
  // - le GTIN-14 (14 chiffres) préfixe un GTIN-13 d'un chiffre indicateur
  //   d'emballage : décaler la règle d'une position n'a pas de fondement GS1
  //   et risquerait de rejeter des GTIN-14 d'emballage parfaitement valides.
  if (code.length === 13) {
    const deuxPremiers = code.slice(0, 2);
    if (code[0] === "2" || deuxPremiers === "02" || deuxPremiers === "04") {
      return false;
    }
  }

  return true;
}
