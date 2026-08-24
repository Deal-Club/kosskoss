import { messageDErreur, signalerIncident } from "@/server/kk/incident";

/**
 * Recueille un incident survenu dans le navigateur d'un visiteur.
 *
 * ── POURQUOI UNE ROUTE PLUTÔT QU'UN APPEL DIRECT ────────────────────────────
 *
 * Les frontières d'erreur de Next.js sont des composants clients : elles ne
 * peuvent pas écrire dans les journaux du serveur. Cette route est le seul
 * chemin par lequel une erreur vue par un visiteur atteint l'hébergeur.
 *
 * ── POURQUOI ELLE N'EST PAS PROTÉGÉE ────────────────────────────────────────
 *
 * Elle doit répondre à un visiteur anonyme, en pleine erreur, éventuellement
 * sans session : la garder derrière une authentification reviendrait à ne rien
 * recueillir. En contrepartie, elle n'écrit RIEN en base, ne rend rien
 * d'exploitable, et borne sévèrement ce qu'elle accepte — un point d'entrée
 * public qui journalise sans limite est une invitation à noyer les journaux.
 */

export const dynamic = "force-dynamic";

/** Au-delà, c'est du bruit : un message d'erreur utile tient en une ligne. */
const LONGUEUR_MAX = 500;

function borner(valeur: unknown, max = LONGUEUR_MAX): string | undefined {
  if (typeof valeur !== "string") return undefined;
  const propre = valeur.trim().slice(0, max);
  return propre.length > 0 ? propre : undefined;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const corps: unknown = await request.json();
    const donnees = (corps ?? {}) as Record<string, unknown>;

    signalerIncident({
      contexte: borner(donnees.contexte, 60) ?? "inconnu",
      message: borner(donnees.message) ?? "Erreur sans message",
      empreinte: borner(donnees.empreinte, 60),
      // Le chemin seul, jamais la chaîne de requête : elle peut porter une
      // recherche, des filtres, ou un jeton de confirmation de commande.
      chemin: borner(donnees.chemin, 200)?.split("?")[0],
    });
  } catch (erreur) {
    // Un corps illisible ne mérite pas une erreur : on note et on passe.
    signalerIncident({ contexte: "signalement", message: messageDErreur(erreur) });
  }

  // Toujours 204 : le navigateur n'a rien à faire de la réponse, et un code
  // d'erreur ici ferait apparaître un second incident dans la console du
  // visiteur, par-dessus celui qu'il subit déjà.
  return new Response(null, { status: 204 });
}
