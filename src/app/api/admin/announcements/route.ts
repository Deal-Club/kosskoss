import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireCapaciteApi } from "@/lib/adminApi";
import {
  createAnnouncement,
  getAnnouncementConfig,
  listAnnouncements,
  reorderAnnouncements,
  saveAnnouncementConfig,
} from "@/server/announcements";

/**
 * Bandeau d'annonce — messages et réglages d'apparence.
 *
 * Chaque écriture invalide le cache de toute la boutique (`revalidatePath("/",
 * "layout")`) : le bandeau est monté par le gabarit, une annonce publiée doit
 * donc apparaître partout, pas seulement sur la page d'accueil.
 */

export async function GET() {
  const { unauthorized } = await requireCapaciteApi("contenu");
  if (unauthorized) return unauthorized;

  const [items, config] = await Promise.all([listAnnouncements(), getAnnouncementConfig()]);
  return NextResponse.json({ items, config });
}

export async function POST(request: Request) {
  const { unauthorized } = await requireCapaciteApi("contenu");
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  // Réordonnancement complet : { ids: [...] }
  if (Array.isArray(body.ids)) {
    const items = await reorderAnnouncements(body.ids.map(String));
    revalidatePath("/", "layout");
    return NextResponse.json({ items });
  }

  // Réglages d'apparence : { config: {...} }
  if (body.config && typeof body.config === "object") {
    const config = await saveAnnouncementConfig(body.config);
    revalidatePath("/", "layout");
    return NextResponse.json({ config });
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "Le message est obligatoire." }, { status: 400 });
  }

  try {
    const item = await createAnnouncement({
      message: body.message,
      icon: typeof body.icon === "string" ? body.icon : undefined,
      active: body.active,
    });
    revalidatePath("/", "layout");
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[annonces] Création impossible :", error);
    return NextResponse.json({ error: "Création impossible." }, { status: 500 });
  }
}
