// Pays proposés dans les formulaires d'adresse.
//
// Seuls les codes ISO 3166-1 alpha-2 sont figés ici. Les libellés affichés sont
// produits par `Intl.DisplayNames`, donc traduits automatiquement dans la langue
// de la boutique : il n'y a aucune table de noms de pays à tenir à jour, et
// ajouter une langue au site suffit à traduire la liste entière.

/**
 * Codes ISO 3166-1 alpha-2 officiellement assignés.
 *
 * Les cinq territoires sans population permanente (AQ Antarctique, BV Bouvet,
 * HM Heard-et-MacDonald, TF Terres australes françaises, UM Îles mineures des
 * États-Unis) sont écartés : ce sont des destinations de livraison impossibles,
 * et les proposer dans un tunnel de commande n'a pas de sens. Les rétablir
 * revient à les ajouter à cette liste.
 */
export const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR",
  "BS", "BT", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV",
  "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "EH", "ER", "ES", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS",
  "GT", "GU", "GW", "GY",
  "HK", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR",
  "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ",
  "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA",
  "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR",
  "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU",
  "WF", "WS",
  "YE", "YT",
  "ZA", "ZM", "ZW",
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

/** Vrai lorsque la chaîne correspond à un code pays proposé par la boutique. */
export function isCountryCode(value: string): value is CountryCode {
  return (COUNTRY_CODES as readonly string[]).includes(value);
}

export interface CountryOption {
  /** Code ISO 3166-1 alpha-2, seule valeur transmise au serveur. */
  value: string;
  /** Nom du pays dans la langue affichée. */
  label: string;
}

/**
 * Nom du pays dans la langue demandée. `Intl.DisplayNames` lève sur une locale
 * mal formée et renvoie undefined sur un code qu'il ne connaît pas : dans les
 * deux cas on retombe sur le code, qui reste compréhensible.
 */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Format du code postal, par pays. Un pays absent de cette table n'est pas
 * refusé : sa valeur est acceptée telle quelle, faute de règle fiable. Mieux
 * vaut laisser passer une adresse exotique que rejeter un client dont on
 * connaît mal le format postal.
 *
 * Les codes sont comparés en majuscules — le serveur normalise avant de valider.
 */
const POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
  DE: /^\d{5}$/,
  AT: /^\d{4}$/,
  CH: /^\d{4}$/,
  LI: /^\d{4}$/,
  BE: /^\d{4}$/,
  LU: /^\d{4}$/,
  DK: /^\d{4}$/,
  NL: /^\d{4}\s?[A-Z]{2}$/,
  FR: /^\d{5}$/,
  MC: /^980\d{2}$/,
  IT: /^\d{5}$/,
  ES: /^\d{5}$/,
  FI: /^\d{5}$/,
  SE: /^\d{3}\s?\d{2}$/,
  NO: /^\d{4}$/,
  PL: /^\d{2}-?\d{3}$/,
  CZ: /^\d{3}\s?\d{2}$/,
  SK: /^\d{3}\s?\d{2}$/,
  PT: /^\d{4}-?\d{3}$/,
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/,
  GB: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/,
  IE: /^[A-Z]\d{2}\s?[A-Z\d]{4}$/,
};

/** Vrai lorsque le code postal convient au pays, ou qu'aucune règle n'est connue. */
export function isValidPostalCode(country: string, postalCode: string): boolean {
  const pattern = POSTAL_CODE_PATTERNS[country.toUpperCase()];
  return pattern ? pattern.test(postalCode.toUpperCase()) : postalCode.length > 0;
}

/**
 * Liste complète, triée selon les règles alphabétiques de la langue affichée —
 * « Éthiopie » se classe entre « Estonie » et « Fidji » en français, et non en
 * fin de liste comme le ferait un tri sur les octets.
 */
export function countryOptions(locale: string): CountryOption[] {
  const display = COUNTRY_CODES.map((value) => ({ value, label: countryName(value, locale) }));

  try {
    const collator = new Intl.Collator(locale);
    return display.sort((a, b) => collator.compare(a.label, b.label));
  } catch {
    return display.sort((a, b) => a.label.localeCompare(b.label));
  }
}

/**
 * Pays présélectionné dans les formulaires d'adresse.
 *
 * La boutique livre la France métropolitaine et s'adresse à une clientèle
 * française : c'est donc « FR » qui doit être proposé d'emblée. La valeur était
 * restée à « DE », héritage du site allemand dont ce projet est parti, ce qui
 * obligeait chaque client à corriger le champ avant de commander.
 *
 * Définie ici plutôt que recopiée dans chaque formulaire : le tunnel de
 * commande, l'espace client et la validation côté serveur doivent s'accorder
 * sur la même valeur.
 */
export const DEFAULT_COUNTRY = "FR";
