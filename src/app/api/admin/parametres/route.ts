import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import {
  saveParametres,
  normaliserParametres,
  numeroWhatsappValide,
  lienEvaluationValide,
  identifiantGa4Valide,
  identifiantPixelValide,
  type ParametresBoutique,
} from "@/server/kk/parametres";

/**
 * Description de chaque champ, utilisée pour valider et pour composer un
 * message d'erreur qui nomme le format attendu — jamais un « données
 * invalides » qui laisse l'administrateur deviner.
 */
const CHAMPS: {
  cle: keyof ParametresBoutique;
  valide: (valeur: string) => boolean;
  format: string;
}[] = [
  {
    cle: "whatsapp",
    valide: numeroWhatsappValide,
    format: "6 à 20 chiffres, indicatif compris (ex. 237658013646)",
  },
  {
    cle: "formulaireEvaluation",
    valide: lienEvaluationValide,
    format: "une adresse https (ex. https://forms.gle/...)",
  },
  { cle: "ga4", valide: identifiantGa4Valide, format: "G-XXXXXXXXXX" },
  { cle: "metaPixel", valide: identifiantPixelValide, format: "8 à 20 chiffres" },
];

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "json_invalide" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "payload_invalide" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;

  // Chaque champ présent doit être une chaîne : un nombre ou un booléen trahit
  // un appel direct malformé plutôt qu'un enregistrement fait depuis l'écran.
  for (const { cle } of CHAMPS) {
    if (cle in raw && typeof raw[cle] !== "string") {
      return NextResponse.json({ error: `champ_invalide:${cle}` }, { status: 400 });
    }
  }

  // NORMALISER D'ABORD, VALIDER ENSUITE (règle du contrôleur sur la tâche 1) :
  // un numéro saisi « +237 658 01 36 46 » — la façon naturelle de l'écrire —
  // est parfaitement valide une fois réduit à ses chiffres par
  // `normaliserParametres`. Le valider sur la saisie brute le rejetterait à
  // tort. Chaque champ est normalisé indépendamment, donc appeler la fonction
  // une seule fois sur tout le corps ne modifie pas le résultat des champs
  // qu'on ira lire ensuite.
  const normalise = normaliserParametres(raw);

  // Les quatre champs sont facultatifs : un champ absent du corps ne doit pas
  // écraser le réglage déjà enregistré. On ne verse dans `partiel` que ce que
  // l'administrateur a explicitement soumis, validé APRÈS normalisation.
  const partiel: Partial<ParametresBoutique> = {};
  for (const { cle, valide, format } of CHAMPS) {
    if (!(cle in raw)) continue;
    const valeur = normalise[cle];
    if (!valide(valeur)) {
      return NextResponse.json({ error: `format_invalide:${cle}`, champ: cle, format }, { status: 400 });
    }
    partiel[cle] = valeur;
  }

  const resultat = await saveParametres(partiel);
  return NextResponse.json({ ok: true, parametres: resultat });
}
