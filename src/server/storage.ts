/**
 * Stockage des images produits sur MinIO (S3-compatible, auto-hébergé).
 *
 * USAGE SERVEUR UNIQUEMENT : ce module lit la clé secrète S3. Il ne doit jamais
 * être importé depuis un composant client, et aucune de ses fonctions ne
 * renvoie les identifiants — seuls des URL publiques et des clés d'objet
 * sortent d'ici. Même discipline que l'ancien module Cloudinary
 * (src/server/cloudinary.ts), qu'il remplace comme destination d'upload.
 *
 * Identifiants attendus en variables d'environnement :
 * S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_REGION.
 * S3_FORCE_PATH_STYLE=true est indispensable pour MinIO : sans lui, le SDK AWS
 * construit une URL en sous-domaine (bucket.endpoint), que MinIO ne sert pas.
 */
import { S3Client, DeleteObjectCommand, type S3ClientConfig } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { slugify } from "@/lib/slugify";

/** Dossier (préfixe de clé) qui reçoit les visuels produits. */
export const S3_PRODUCT_FOLDER = "products";

interface S3Credentials {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
}

export interface UploadImageOptions {
  /** Nom du fichier d'origine, utilisé pour construire une clé lisible. */
  filename?: string;
  /** Dossier cible (préfixe de clé) ; par défaut S3_PRODUCT_FOLDER. */
  folder?: string;
  /** Type MIME du fichier, transmis tel quel comme Content-Type de l'objet. */
  contentType?: string;
  /**
   * Clé d'objet exacte, si fournie — `folder`/`filename` sont alors ignorés.
   * Sert la migration d'un stockage existant (script one-off) : le nom de
   * fichier d'origine doit rester identique pour que les liens déjà posés
   * ailleurs (détourage par nom, voir `lib/kk/packshot.ts`) continuent de
   * matcher.
   */
  key?: string;
}

export interface UploadedImage {
  /** URL publique à stocker en base. */
  url: string;
  /** Clé de l'objet dans le bucket, nécessaire pour le supprimer plus tard. */
  key: string;
  bytes: number;
}

/** Levée quand une opération S3 est demandée sans identifiants complets. */
export class S3NotConfiguredError extends Error {
  constructor() {
    super("Le stockage S3/MinIO n'est pas configuré (endpoint, clés ou bucket manquants).");
    this.name = "S3NotConfiguredError";
  }
}

/**
 * Identifiants complets ou null. Volontairement NON exporté : la clé secrète
 * ne doit jamais circuler ailleurs que dans ce module.
 */
function getCredentials(): S3Credentials | null {
  const endpoint = process.env.S3_ENDPOINT?.trim() ?? "";
  const accessKeyId = process.env.S3_ACCESS_KEY?.trim() ?? "";
  const secretAccessKey = process.env.S3_SECRET_KEY?.trim() ?? "";
  const bucket = process.env.S3_BUCKET?.trim() ?? "";
  const region = process.env.S3_REGION?.trim() || "us-east-1";

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { endpoint, accessKeyId, secretAccessKey, bucket, region };
}

/**
 * Indique si les identifiants sont disponibles. Aucune requête n'est envoyée
 * à MinIO : on ne vérifie que la présence des valeurs — même contrat que
 * `isCloudinaryConfigured` qu'elle remplace.
 */
export function isS3Configured(): boolean {
  return getCredentials() !== null;
}

/**
 * Client construit à chaque appel, comme `authOptions` côté Cloudinary : pas
 * d'état partagé entre requêtes du serveur.
 *
 * `forcePathStyle: true` est ce qui fait fonctionner MinIO : sans lui, le SDK
 * AWS adresse le bucket en sous-domaine (bucket.endpoint), que seul S3 lui-même
 * sait router — MinIO répond alors avec une erreur DNS/certificat.
 */
function buildClient(credentials: S3Credentials): S3Client {
  const config: S3ClientConfig = {
    endpoint: credentials.endpoint,
    region: credentials.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  };
  return new S3Client(config);
}

/** Suffixe aléatoire court, pour qu'un même nom de fichier n'écrase jamais l'autre. */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Clé d'objet lisible dérivée du nom d'origine : « Bosch Serie 6.jpg » devient
 * « products/bosch-serie-6-k3f9a1.jpg ». Même schéma que `buildPublicId` côté
 * Cloudinary, avec l'extension conservée puisque MinIO ne la déduit pas.
 */
function buildObjectKey(folder: string, filename?: string): string {
  const withoutExtension = (filename ?? "").replace(/\.[^.]+$/, "");
  const extension = (filename ?? "").match(/\.[^.]+$/)?.[0] ?? "";
  const base = slugify(withoutExtension).slice(0, 60) || "image";
  return `${folder}/${base}-${randomSuffix()}${extension}`;
}

/**
 * URL publique de l'objet, au format exact demandé :
 * https://<endpoint>/<bucket>/<clé>. Le bucket est en lecture publique côté
 * MinIO — cette URL fonctionne sans signature, comme la delivery URL
 * Cloudinary.
 */
function buildPublicUrl(credentials: S3Credentials, key: string): string {
  const endpoint = credentials.endpoint.replace(/\/+$/, "");
  return `${endpoint}/${credentials.bucket}/${key}`;
}

/**
 * Envoie un buffer d'image sur MinIO et renvoie l'URL publique.
 * Lève S3NotConfiguredError si les identifiants manquent, une Error classique
 * si MinIO refuse l'envoi.
 *
 * `@aws-sdk/lib-storage` (upload multipart) plutôt que `PutObjectCommand` : il
 * bascule automatiquement en envoi par parties au-delà d'un certain poids,
 * sans qu'il y ait de logique à écrire ici pour les fichiers plus lourds
 * qu'une image produit typique.
 */
export async function uploadImage(
  buffer: Buffer | Uint8Array,
  options: UploadImageOptions = {},
): Promise<UploadedImage> {
  const credentials = getCredentials();
  if (!credentials) throw new S3NotConfiguredError();

  const folder = options.folder?.trim() || S3_PRODUCT_FOLDER;
  const key = options.key?.trim() || buildObjectKey(folder, options.filename);
  const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  const client = buildClient(credentials);
  try {
    const upload = new Upload({
      client,
      params: {
        Bucket: credentials.bucket,
        Key: key,
        Body: body,
        ContentType: options.contentType,
        // Le bucket est configuré en lecture publique côté MinIO ; cet ACL est
        // redondant sur la plupart des déploiements MinIO (qui l'ignorent),
        // mais reste correct pour un backend S3 réel qui, lui, en tient compte.
        ACL: "public-read",
      },
    });
    await upload.done();
  } catch (error) {
    throw error instanceof Error ? error : new Error("MinIO a refusé l'envoi.");
  } finally {
    client.destroy();
  }

  return {
    url: buildPublicUrl(credentials, key),
    key,
    bytes: body.byteLength,
  };
}

/**
 * Supprime un objet. Renvoie true si MinIO confirme la suppression (ou si
 * l'objet n'existait déjà plus), false si les identifiants manquent.
 */
export async function deleteImage(key: string): Promise<boolean> {
  const trimmed = key.trim();
  if (!trimmed) return false;

  const credentials = getCredentials();
  if (!credentials) throw new S3NotConfiguredError();

  const client = buildClient(credentials);
  try {
    await client.send(new DeleteObjectCommand({ Bucket: credentials.bucket, Key: trimmed }));
    return true;
  } catch {
    return false;
  } finally {
    client.destroy();
  }
}

/**
 * Extrait la clé d'objet d'une URL publique MinIO, pour pouvoir supprimer une
 * image dont on n'a gardé que l'URL en base. Renvoie null si l'URL ne pointe
 * pas vers le bucket configuré (ou si S3 n'est pas configuré).
 * Exemple : https://kosskoss-minio.example.host/kosskoss/products/a-b1c2d3.jpg
 *        -> products/a-b1c2d3.jpg
 */
export function keyFromUrl(url: string): string | null {
  const credentials = getCredentials();
  if (!credentials) return null;

  const prefix = `${credentials.endpoint.replace(/\/+$/, "")}/${credentials.bucket}/`;
  const trimmed = url.trim();
  if (!trimmed.startsWith(prefix)) return null;

  const key = trimmed.slice(prefix.length);
  return key || null;
}
