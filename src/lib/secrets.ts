import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

/** Préfixe de l'affichage masqué, par exemple « ••••4242 ». */
export const SECRET_MASK = "••••";

// La clé vient uniquement de l'environnement. Si elle manque, on refuse
// l'opération : jamais de repli en clair pour ne pas exposer un secret en base.
function loadKey(): Buffer {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY n'est pas défini. Les identifiants ne sont pas enregistrés sans clé.",
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY doit contenir 32 octets au format hexadécimal (64 caractères).",
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY n'a pas la bonne longueur.");
  }
  return key;
}

/**
 * Chiffre une valeur en clair avec AES-256-GCM.
 * Speicherformat: "iv:authTag:ciphertext", alle Teile Base64.
 */
export function encryptSecret(plain: string): string {
  if (!plain) {
    throw new Error("La valeur à chiffrer est vide.");
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, loadKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/** Déchiffre une valeur produite par encryptSecret. À n'utiliser que côté serveur. */
export function decryptSecret(cipher: string): string {
  const parts = cipher.split(":");
  if (parts.length !== 3) {
    throw new Error("Format de la valeur chiffrée invalide.");
  }
  const [ivPart, tagPart, dataPart] = parts;
  const decipher = createDecipheriv(ALGORITHM, loadKey(), Buffer.from(ivPart, "base64"));
  // Le authTag fait échouer final() si la donnée a été altérée en base.
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}

/** Rend les quatre derniers caractères d'une valeur en clair, pour l'affichage. */
export function lastFourOf(plain: string): string {
  return plain.slice(-4);
}

/** Maskierte Darstellung eines Klartextwertes, z. B. "••••4242". */
export function maskSecret(plain: string): string {
  return `${SECRET_MASK}${lastFourOf(plain)}`;
}

/** Maskierte Darstellung, wenn nur noch die gespeicherten vier Zeichen vorliegen. */
export function maskFromLastFour(lastFour: string | null | undefined): string | undefined {
  return lastFour ? `${SECRET_MASK}${lastFour}` : undefined;
}
