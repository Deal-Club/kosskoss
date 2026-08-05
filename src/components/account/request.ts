// Appel des routes de l'espace client depuis le navigateur.
//
// Toutes les routes répondent sur le même modèle : soit « ok », soit un « code »
// d'erreur que l'interface traduit elle-même via le namespace « account ». Le
// texte français renvoyé par le serveur n'est jamais affiché tel quel — sinon
// la version anglaise de la boutique montrerait du français.

export interface AccountApiResult {
  ok: boolean;
  /** Code d'erreur à traduire ; « network » quand la requête n'a pas abouti. */
  code?: string;
  data: Record<string, unknown>;
}

export async function sendAccountRequest(
  url: string,
  method: "POST" | "PATCH" | "PUT",
  body: Record<string, unknown>,
): Promise<AccountApiResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok) {
      const code = typeof data?.code === "string" ? data.code : "server_error";
      return { ok: false, code, data: data ?? {} };
    }

    return { ok: true, data: data ?? {} };
  } catch {
    return { ok: false, code: "network", data: {} };
  }
}

/**
 * Nettoie un chemin de retour lu dans l'URL (« ?weiter=… »).
 * Seuls les chemins internes sont acceptés : « //evil.example » ou une URL
 * absolue transformeraient la page de connexion en redirection ouverte.
 */
export function safeReturnPath(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  if (!value.startsWith("/compte")) return undefined;
  return value;
}
