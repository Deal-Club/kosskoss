import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCapaciteApi } from "@/lib/adminApi";
import { MODELES_TRADUISIBLES } from "@/lib/kk/traductions";
import { listerEnregistrements, enregistrerTraduction } from "@/server/kk/traductions";

/**
 * `GET` liste les enregistrements d'un modèle selon le filtre d'état ;
 * `PUT` enregistre les traductions saisies pour un enregistrement.
 *
 * Les deux valident le modèle contre le registre (`MODELES_TRADUISIBLES`)
 * avant tout accès base : un modèle inconnu est une erreur de requête (400),
 * jamais une exception qui remonterait telle quelle.
 */

const FILTRES = ["tout", "a-traduire", "traduit"] as const;
type Filtre = (typeof FILTRES)[number];

function estFiltre(valeur: string | null): valeur is Filtre {
  return valeur !== null && (FILTRES as readonly string[]).includes(valeur);
}

function modeleConnu(cle: string | null): cle is string {
  return cle !== null && MODELES_TRADUISIBLES.some((m) => m.cle === cle);
}

export async function GET(request: Request) {
  const { unauthorized } = await requireCapaciteApi("contenu");
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const modele = searchParams.get("modele");
  if (!modeleConnu(modele)) {
    return NextResponse.json({ error: "Modèle de traduction inconnu." }, { status: 400 });
  }

  // Le filtre par défaut est « à traduire » : cet écran s'ouvre pour combler,
  // pas pour admirer un pourcentage — voir la spécification du lot.
  const filtreBrut = searchParams.get("filtre");
  const filtre: Filtre = estFiltre(filtreBrut) ? filtreBrut : "a-traduire";

  const lignes = await listerEnregistrements(modele, filtre);
  return NextResponse.json(lignes);
}

export async function PUT(request: Request) {
  const { unauthorized } = await requireCapaciteApi("contenu");
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as {
    modele?: unknown;
    id?: unknown;
    valeurs?: unknown;
  } | null;

  const modele = typeof body?.modele === "string" ? body.modele : null;
  if (!modeleConnu(modele)) {
    return NextResponse.json({ error: "Modèle de traduction inconnu." }, { status: 400 });
  }

  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  }

  const valeursBrutes = body?.valeurs;
  if (typeof valeursBrutes !== "object" || valeursBrutes === null || Array.isArray(valeursBrutes)) {
    return NextResponse.json({ error: "Valeurs manquantes." }, { status: 400 });
  }

  // Champs filtrés par le registre : tout ce qui n'y figure pas est écarté,
  // ici comme dans enregistrerTraduction — deux filtres valent mieux qu'un
  // pour une route qui écrit dans dix-sept tables.
  const valeurs: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(valeursBrutes as Record<string, unknown>)) {
    if (typeof valeur === "string") valeurs[cle] = valeur;
  }

  try {
    await enregistrerTraduction(modele, id, valeurs);
  } catch (error) {
    console.error("[traductions] Enregistrement impossible :", error);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 400 });
  }

  // La boutique anglaise retombe sur le français quand le champ *En est vide
  // (src/server/localizedContent.ts) : une traduction saisie ici doit donc
  // invalider le rendu déjà mis en cache, sous peine de paraître sans effet.
  revalidatePath("/", "layout");

  return NextResponse.json({ success: true });
}
