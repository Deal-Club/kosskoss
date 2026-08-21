import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import {
  saveParametres,
  normaliserParametres,
  CHAMPS_PARAMETRES,
  type ParametresBoutique,
} from "@/server/kk/parametres";

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
  // CHAMPS_PARAMETRES vient de @/lib/kk/parametres : c'est la même table que
  // celle utilisée côté écran, pour que validateur et message de format ne
  // divergent jamais entre les deux.
  for (const { cle } of CHAMPS_PARAMETRES) {
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
  // L'écran, lui, ne soumet que les champs qu'il a effectivement modifiés
  // (voir ParametresAdmin.tsx) : une valeur déjà en base qui ne passerait
  // plus le validateur du jour, mais que personne n'a touchée, n'est donc
  // jamais renvoyée ici et ne peut jamais bloquer l'enregistrement du reste.
  const partiel: Partial<ParametresBoutique> = {};
  for (const { cle, valide, format } of CHAMPS_PARAMETRES) {
    if (!(cle in raw)) continue;
    const valeur = normalise[cle];
    if (!valide(valeur)) {
      return NextResponse.json({ error: `format_invalide:${cle}`, champ: cle, format }, { status: 400 });
    }
    partiel[cle] = valeur;
  }

  const resultat = await saveParametres(partiel);

  // Rafraîchit la boutique. Le passage par la racine est nécessaire : le numéro
  // WhatsApp est lu par le pied de page et par le bouton flottant du gabarit,
  // donc présent sur toutes les pages. Sans cette invalidation, la boutique —
  // prérendue statiquement — continuerait à servir l'ancien numéro, désormais
  // mort, jusqu'à ce qu'une écriture sans rapport vienne par hasard rafraîchir
  // le cache.
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true, parametres: resultat });
}
