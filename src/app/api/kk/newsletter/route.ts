import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { adresseEmailValide } from "@/lib/kk/email-valide";

/**
 * Inscription à la lettre d'information.
 *
 * Un formulaire de newsletter existait dans le pied de page et avait été retiré
 * parce qu'il n'envoyait rien nulle part. Le bloc revient — c'est le bloc 12 de
 * la structure fournie par le client — mais avec un point de collecte réel.
 *
 * Une adresse déjà inscrite renvoie le même succès qu'une nouvelle : répondre
 * « cette adresse est déjà inscrite » transformerait le formulaire en oracle
 * permettant de tester si quelqu'un est client de la maison.
 */

const SOURCES = new Set(["accueil", "pied-de-page", "commande", "diagnostic"]);

export async function POST(request: Request) {
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête illisible." }, { status: 400 });
  }

  const { email, locale, source } = (corps ?? {}) as Record<string, unknown>;

  const adresse = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!adresseEmailValide(adresse)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }

  // Les deux champs suivants viennent du navigateur : on ne retient que des
  // valeurs connues, sinon ils deviendraient un champ de texte libre en base.
  const langue = locale === "en" ? "en" : "fr";
  const origine = typeof source === "string" && SOURCES.has(source) ? source : "accueil";

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: adresse },
      // Une réinscription ne réécrit pas l'origine : c'est le premier
      // emplacement qui a recruté, et c'est celui-là qu'on veut mesurer.
      update: { locale: langue },
      create: { email: adresse, locale: langue, source: origine },
    });
  } catch {
    return NextResponse.json({ error: "Inscription impossible pour le moment." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
