import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCapaciteApi } from "@/lib/adminApi";
import {
  saveParametres,
  normaliserParametres,
  saisieEffacee,
  CHAMPS_PARAMETRES,
  type ParametresBoutique,
} from "@/server/kk/parametres";

export async function POST(request: Request) {
  const { unauthorized } = await requireCapaciteApi("reglages");
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
    // Une saisie non vide que la normalisation réduit à rien est une faute de
    // format, pas un effacement volontaire : « à venir » dans le numéro
    // WhatsApp ne laisse aucun chiffre, `numeroWhatsappValide("")` rend `true`
    // puisque le vide est légitime, et le numéro de la boutique disparaîtrait
    // en silence. Le test de type ne sert qu'à le prouver au compilateur : la
    // boucle précédente a déjà rejeté tout ce qui n'est pas une chaîne.
    const brut = raw[cle];
    const efface = typeof brut === "string" && saisieEffacee(brut, valeur);
    if (efface || !valide(valeur)) {
      return NextResponse.json({ error: `format_invalide:${cle}`, champ: cle, format }, { status: 400 });
    }
    partiel[cle] = valeur;
  }

  const resultat = await saveParametres(partiel);

  // Rafraîchit la boutique. Le passage par la racine est nécessaire : le numéro
  // WhatsApp est lu par le pied de page et par le bouton flottant du gabarit,
  // donc présent sur TOUTES les pages — même raison qui fait invalider depuis
  // la racine les routes des fragments de code et du bandeau d'annonce.
  //
  // Aujourd'hui, la lecture du cookie de consentement dans le gabarit rend
  // toute la boutique dynamique (`npx next build` : aucune page `[locale]`
  // n'est prérendue), si bien qu'un nouveau numéro apparaîtrait de toute façon.
  // Mais cette propriété ne tient qu'à un `cookies()` qu'un prochain lot peut
  // déplacer ou retirer : sans invalidation ici, la boutique se remettrait alors
  // à servir l'ancien numéro — mort — jusqu'à ce qu'une écriture sans rapport
  // vienne par hasard rafraîchir le cache, et le critère « modifiable sans
  // redéploiement » redeviendrait faux sans que rien ne le signale. L'appel
  // vide en outre le cache de navigation côté client.
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true, parametres: resultat });
}
