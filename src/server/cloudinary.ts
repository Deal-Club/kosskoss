/**
 * Stockage des images produits sur Cloudinary.
 *
 * USAGE SERVEUR UNIQUEMENT : ce module lit l'API secret Cloudinary. Il ne doit
 * jamais être importé depuis un composant client, et aucune de ses fonctions ne
 * renvoie les identifiants — seuls des URL publiques et des public_id sortent
 * d'ici.
 *
 * Les identifiants proviennent uniquement des variables d'environnement
 * CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET. Ils ne
 * sont volontairement plus saisissables depuis le back-office : une clé
 * d'infrastructure se gère avec le déploiement, pas dans l'interface.
 */
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";
import { slugify } from "@/lib/slugify";

/** Dossier Cloudinary qui reçoit les visuels produits. */
export const CLOUDINARY_PRODUCT_FOLDER = "hausgeraete-pfeffer/products";

/**
 * Largeur (et hauteur) maximale conservée à l'upload. 1600 px suffisent
 * largement pour une fiche produit affichée au plus sur ~800 px en écran
 * Retina ; au-delà on ne stocke que du poids inutile. Le recadrage « limit » ne
 * fait que réduire : une image plus petite reste intacte.
 */
const MAX_DIMENSION = 1600;

interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface UploadImageOptions {
  /** Nom du fichier d'origine, utilisé pour construire un public_id lisible. */
  filename?: string;
  /** Dossier cible ; par défaut CLOUDINARY_PRODUCT_FOLDER. */
  folder?: string;
}

export interface UploadedImage {
  /** URL de livraison à stocker en base (contient déjà f_auto et q_auto). */
  url: string;
  /** Identifiant Cloudinary, nécessaire pour supprimer l'asset plus tard. */
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

/** Levée quand une opération Cloudinary est demandée sans identifiants. */
export class CloudinaryNotConfiguredError extends Error {
  constructor() {
    super("Cloudinary n'est pas configuré (cloud name, API key et API secret manquants).");
    this.name = "CloudinaryNotConfiguredError";
  }
}

/**
 * Identifiants complets ou null. Volontairement NON exporté : l'API secret ne
 * doit jamais circuler ailleurs que dans ce module.
 */
function getCredentials(): CloudinaryCredentials | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";

  // Les trois valeurs sont indispensables : sans l'une d'elles la signature de
  // l'upload est refusée par Cloudinary.
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

/**
 * Indique si les trois identifiants sont disponibles. Aucune requête n'est
 * envoyée à Cloudinary : on ne vérifie que la présence des valeurs.
 */
export function isCloudinaryConfigured(): boolean {
  return getCredentials() !== null;
}

/**
 * Les identifiants sont passés à chaque appel plutôt que via cloudinary.config()
 * global : le SDK les accepte par requête, et rien n'est laissé dans un état
 * partagé entre deux requêtes du serveur.
 */
function authOptions(credentials: CloudinaryCredentials) {
  return {
    cloud_name: credentials.cloudName,
    api_key: credentials.apiKey,
    api_secret: credentials.apiSecret,
    secure: true,
  };
}

/** Suffixe aléatoire court, pour qu'un même nom de fichier n'écrase jamais l'autre. */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * public_id lisible dérivé du nom d'origine : « Bosch Serie 6.jpg » devient
 * « bosch-serie-6-k3f9a1 ». L'extension est retirée, Cloudinary gère le format.
 */
function buildPublicId(filename?: string): string {
  const withoutExtension = (filename ?? "").replace(/\.[^.]+$/, "");
  const base = slugify(withoutExtension).slice(0, 60) || "bild";
  return `${base}-${randomSuffix()}`;
}

/**
 * Envoie un buffer d'image sur Cloudinary et renvoie l'URL de livraison.
 * Lève CloudinaryNotConfiguredError si les identifiants manquent, et une Error
 * classique si Cloudinary refuse l'envoi.
 */
export async function uploadImage(
  buffer: Buffer | Uint8Array,
  options: UploadImageOptions = {},
): Promise<UploadedImage> {
  const credentials = getCredentials();
  if (!credentials) throw new CloudinaryNotConfiguredError();

  const folder = options.folder?.trim() || CLOUDINARY_PRODUCT_FOLDER;

  const uploadOptions: UploadApiOptions = {
    ...authOptions(credentials),
    folder,
    public_id: buildPublicId(options.filename),
    resource_type: "image",
    // Le public_id porte déjà un suffixe aléatoire : rien à écraser.
    overwrite: false,
    // Deuxième barrière après la vérification des magic bytes côté route.
    allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
    // Transformation entrante : l'original stocké est borné en dimensions et
    // recompressé, pour ne pas conserver des fichiers de 5 Mo sur le compte.
    transformation: [{ width: MAX_DIMENSION, height: MAX_DIMENSION, crop: "limit", quality: "auto" }],
  };

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, uploaded) => {
      if (error) {
        reject(new Error(error.message || "Cloudinary a refusé l'envoi."));
        return;
      }
      if (!uploaded) {
        reject(new Error("Cloudinary n'a renvoyé aucun résultat."));
        return;
      }
      resolve(uploaded);
    });

    stream.on("error", (error: Error) => reject(error));
    // Le buffer part en une fois : la route limite déjà la taille à 5 Mo.
    stream.end(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
  });

  return {
    url: buildDeliveryUrl(credentials, result),
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    format: result.format,
  };
}

/**
 * URL livrée au navigateur. On n'utilise pas `secure_url` tel quel : il pointe
 * sur le fichier brut. En insérant f_auto/q_auto dans le chemin, Cloudinary
 * choisit lui-même AVIF ou WebP selon le navigateur et ajuste la compression.
 * Le numéro de version rend l'URL immuable, donc cachable indéfiniment.
 */
function buildDeliveryUrl(
  credentials: CloudinaryCredentials,
  result: UploadApiResponse,
): string {
  return cloudinary.url(result.public_id, {
    cloud_name: credentials.cloudName,
    secure: true,
    resource_type: result.resource_type,
    type: result.type,
    version: String(result.version),
    format: result.format,
    fetch_format: "auto",
    quality: "auto",
    // Sans ça le SDK colle un « ?_a=… » de télémétrie à la fin de l'URL, qui
    // changerait à chaque montée de version du paquet. On garde l'URL stable.
    urlAnalytics: false,
  });
}

/**
 * Supprime un asset. Renvoie true si Cloudinary confirme la suppression (ou si
 * l'asset n'existait déjà plus), false sinon.
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  const id = publicId.trim();
  if (!id) return false;

  const credentials = getCredentials();
  if (!credentials) throw new CloudinaryNotConfiguredError();

  const response = (await cloudinary.uploader.destroy(id, {
    ...authOptions(credentials),
    resource_type: "image",
    // Purge aussi les copies déjà mises en cache sur le CDN.
    invalidate: true,
  })) as { result?: string };

  return response.result === "ok" || response.result === "not found";
}

/**
 * Extrait le public_id d'une URL Cloudinary, pour pouvoir supprimer une image
 * dont on n'a gardé que l'URL en base. Renvoie null si l'URL n'en est pas une.
 * Exemple : https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v17/a/b.jpg
 *        -> a/b
 */
export function publicIdFromUrl(url: string): string | null {
  const match = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\/(.+)$/.exec(
    url.trim(),
  );
  if (!match) return null;

  const segments = match[1].split("/");
  // On retire les segments de transformation (« f_auto,q_auto ») puis la
  // version (« v1712345678 ») : ne reste que le dossier et le nom.
  while (segments.length > 1 && /^[a-z]{1,3}_[^/]*$/.test(segments[0])) {
    segments.shift();
  }
  if (segments.length > 1 && /^v\d+$/.test(segments[0])) {
    segments.shift();
  }

  const path = segments.join("/").replace(/\.[^./]+$/, "");
  return path || null;
}
