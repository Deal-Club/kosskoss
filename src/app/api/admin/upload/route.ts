import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireCapaciteApi } from "@/lib/adminApi";
import { slugify } from "@/lib/slugify";
import { isS3Configured, uploadImage } from "@/server/storage";

// Deux destinations possibles, décidées à chaque envoi :
//
//   1. MinIO (S3-compatible), dès que les identifiants sont disponibles
//      (S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY/S3_BUCKET). C'est le mode
//      normal : l'URL renvoyée pointe sur le bucket auto-hébergé, public en
//      lecture, et survit aux déploiements.
//   2. public/uploads/, uniquement en développement tant que S3 n'est pas
//      configuré. En production, l'envoi est refusé avec un message clair :
//      un dossier local disparaît au prochain déploiement, il ne faut pas y
//      stocker le catalogue.
//
// L'envoi passe toujours par le serveur : la clé secrète S3 n'atteint jamais
// le navigateur, et aucun upload non signé n'est possible depuis le client.
//
// Remplace l'ancien stockage Cloudinary (src/server/cloudinary.ts, laissé en
// place mais plus appelé depuis cette route) — même interface de réponse
// (`path`/`url`/`storage`), pour ne rien casser côté formulaire produit.

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

interface AllowedType {
  mime: string;
  extension: string;
  /** Vérifie la signature du fichier, pour que l'extension ne soit pas simplement déclarée. */
  matches: (bytes: Uint8Array) => boolean;
}

function hasAscii(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

const ALLOWED_TYPES: AllowedType[] = [
  {
    mime: "image/jpeg",
    extension: "jpg",
    matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    mime: "image/png",
    extension: "png",
    matches: (bytes) =>
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
  {
    mime: "image/webp",
    extension: "webp",
    matches: (bytes) => hasAscii(bytes, 0, "RIFF") && hasAscii(bytes, 8, "WEBP"),
  },
  {
    mime: "image/avif",
    extension: "avif",
    // ISO-BMFF : « ftyp » à partir de l'octet 4, puis la marque « avif » ou « avis » (séquence)
    matches: (bytes) =>
      hasAscii(bytes, 4, "ftyp") && (hasAscii(bytes, 8, "avif") || hasAscii(bytes, 8, "avis")),
  },
];

function detectType(bytes: Uint8Array): AllowedType | undefined {
  return ALLOWED_TYPES.find((type) => type.matches(bytes));
}

/** Nom de fichier sans extension, assaini et limité à 60 caractères. */
function safeBaseName(originalName: string): string {
  const withoutExtension = originalName.replace(/\.[^.]+$/, "");
  const slug = slugify(withoutExtension).slice(0, 60);
  return slug || "bild";
}

function timestamp(): string {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

export async function POST(request: Request) {
  const { unauthorized } = await requireCapaciteApi("catalogue");
  if (unauthorized) return unauthorized;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Une requête multipart/form-data est attendue." },
      { status: 400 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier transmis." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Le fichier est vide." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Le fichier dépasse 5 Mo." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectType(bytes);
  if (!detected) {
    return NextResponse.json(
      { error: "Seuls les formats JPG, PNG, WebP et AVIF sont acceptés." },
      { status: 415 },
    );
  }

  const fileName = `${timestamp()}-${safeBaseName(file.name)}.${detected.extension}`;

  // --- Destination 1 : MinIO (S3-compatible) --------------------------------
  if (isS3Configured()) {
    try {
      const uploaded = await uploadImage(Buffer.from(bytes), {
        filename: fileName,
        contentType: detected.mime,
      });
      return NextResponse.json(
        {
          // « path » reste renseigné pour ne rien casser côté formulaire :
          // le champ image du produit contient désormais l'URL complète.
          path: uploaded.url,
          url: uploaded.url,
          storage: "s3" as const,
          key: uploaded.key,
          mime: detected.mime,
          size: file.size,
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("Échec de l'envoi vers MinIO :", error);
      return NextResponse.json(
        { error: "L'envoi vers le stockage MinIO a échoué. Merci de vérifier les clés S3." },
        { status: 502 },
      );
    }
  }

  // --- Destination 2 : disque local, développement uniquement ---------------
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Le stockage des images n'est pas configuré : définissez S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY et S3_BUCKET dans l'environnement du serveur. En production, l'enregistrement local est désactivé car les fichiers disparaîtraient au prochain déploiement.",
      },
      { status: 503 },
    );
  }

  const directory = path.join(process.cwd(), "public", "uploads");

  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), bytes);
  } catch {
    return NextResponse.json(
      { error: "Le fichier n'a pas pu être enregistré." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      path: `/uploads/${fileName}`,
      url: `/uploads/${fileName}`,
      storage: "local" as const,
      mime: detected.mime,
      size: file.size,
    },
    { status: 201 },
  );
}
