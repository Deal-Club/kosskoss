import { prisma } from "@/server/prisma";
import {
  MODELES_TRADUISIBLES,
  etatTraduction,
  type ChampTraduisible,
  type EtatTraduction,
} from "@/lib/kk/traductions";

/**
 * Lecture et écriture des traductions, un modèle à la fois.
 *
 * Le registre (src/lib/kk/traductions.ts) dit QUELS champs sont traduisibles ;
 * ce module dit COMMENT les lire et les écrire pour chacun des dix-sept
 * modèles. La carte ci-dessous compte donc une entrée par modèle, chacune
 * appelant `prisma.<modele>` nommé en toutes lettres.
 *
 * PAS D'ACCÈS INDEXÉ SUR LE CLIENT PRISMA (`(prisma as never)[cle]`), même si
 * le résultat tiendrait en dix lignes : cet écran écrit dans dix-sept tables,
 * et un accès dynamique ne se vérifie qu'à l'exécution — il échouerait le
 * jour d'un renommage de champ, et pourrait écrire dans le mauvais champ
 * avant qu'on s'en aperçoive. Une traduction fautive n'est visible que de
 * quelqu'un qui lit l'anglais ; la répétition ci-dessous est une garantie,
 * pas un défaut.
 */

export interface LigneTraduction {
  id: string;
  /** Libellé lisible de l'enregistrement — le nom du produit, le titre de
   * l'article — pour que la liste soit navigable sans afficher d'identifiants. */
  libelle: string;
  /** Valeurs françaises et anglaises, indexées par nom de champ Prisma. */
  valeurs: Record<string, string>;
  etat: EtatTraduction;
}

interface EnregistrementBrut {
  id: string;
  libelle: string;
  valeurs: Record<string, string>;
}

interface EntreeModele {
  champs: ChampTraduisible[];
  lister(): Promise<EnregistrementBrut[]>;
  ecrire(id: string, donnees: Record<string, string>): Promise<void>;
}

function registreDe(cle: string): ChampTraduisible[] {
  return MODELES_TRADUISIBLES.find((m) => m.cle === cle)?.champs ?? [];
}

/** Bullets stockés en JSON, comme dans src/server/store.ts (`parseBullets`). */
function parseBullets(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Une ligne par puce — comme le formulaire produit (src/components/admin/ProductForm.tsx,
 * `bulletsText.split("\n")...`) et l'import CSV (src/server/productInput.ts) — vers le
 * même format JSON que `bullets`. Même format des deux côtés : ne pas en inventer un second.
 */
function formatBulletsEn(lignes: string): string {
  return JSON.stringify(
    lignes
      .split("\n")
      .map((ligne) => ligne.trim())
      .filter(Boolean),
  );
}

const CARTE_MODELES: Record<string, EntreeModele> = {
  Group: {
    champs: registreDe("Group"),
    async lister() {
      const lignes = await prisma.group.findMany({
        select: { id: true, label: true, labelEn: true },
        orderBy: { position: "asc" },
      });
      return lignes.map((g) => ({
        id: g.id,
        libelle: g.label,
        valeurs: { label: g.label, labelEn: g.labelEn },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.group.update({ where: { id }, data: { labelEn: donnees.labelEn } });
    },
  },

  Category: {
    champs: registreDe("Category"),
    async lister() {
      const lignes = await prisma.category.findMany({
        select: {
          id: true,
          label: true,
          labelEn: true,
          description: true,
          descriptionEn: true,
          guideIntro: true,
          guideIntroEn: true,
          guideClosing: true,
          guideClosingEn: true,
          group: { select: { label: true } },
        },
        orderBy: { position: "asc" },
      });
      return lignes.map((c) => ({
        id: c.id,
        libelle: `${c.group.label} / ${c.label}`,
        valeurs: {
          label: c.label,
          labelEn: c.labelEn,
          description: c.description,
          descriptionEn: c.descriptionEn,
          guideIntro: c.guideIntro,
          guideIntroEn: c.guideIntroEn,
          guideClosing: c.guideClosing,
          guideClosingEn: c.guideClosingEn,
        },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.category.update({
        where: { id },
        data: {
          labelEn: donnees.labelEn,
          descriptionEn: donnees.descriptionEn,
          guideIntroEn: donnees.guideIntroEn,
          guideClosingEn: donnees.guideClosingEn,
        },
      });
    },
  },

  GuideSection: {
    champs: registreDe("GuideSection"),
    async lister() {
      const lignes = await prisma.guideSection.findMany({
        select: {
          id: true,
          heading: true,
          headingEn: true,
          body: true,
          bodyEn: true,
          category: { select: { label: true } },
        },
        orderBy: { position: "asc" },
      });
      return lignes.map((s) => ({
        id: s.id,
        libelle: `${s.category.label} — ${s.heading || "(sans titre)"}`,
        valeurs: { heading: s.heading, headingEn: s.headingEn, body: s.body, bodyEn: s.bodyEn },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.guideSection.update({
        where: { id },
        data: { headingEn: donnees.headingEn, bodyEn: donnees.bodyEn },
      });
    },
  },

  Brand: {
    champs: registreDe("Brand"),
    async lister() {
      const lignes = await prisma.brand.findMany({
        select: { id: true, name: true, nameEn: true, description: true, descriptionEn: true },
        orderBy: { position: "asc" },
      });
      return lignes.map((b) => ({
        id: b.id,
        libelle: b.name,
        valeurs: {
          name: b.name,
          nameEn: b.nameEn,
          description: b.description,
          descriptionEn: b.descriptionEn,
        },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.brand.update({
        where: { id },
        data: { nameEn: donnees.nameEn, descriptionEn: donnees.descriptionEn },
      });
    },
  },

  Product: {
    champs: registreDe("Product"),
    async lister() {
      const lignes = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          nameEn: true,
          shortDescription: true,
          shortDescriptionEn: true,
          description: true,
          descriptionEn: true,
          bullets: true,
          bulletsEn: true,
        },
        orderBy: { name: "asc" },
      });
      return lignes.map((p) => ({
        id: p.id,
        libelle: p.name,
        valeurs: {
          name: p.name,
          nameEn: p.nameEn,
          shortDescription: p.shortDescription,
          shortDescriptionEn: p.shortDescriptionEn,
          description: p.description,
          descriptionEn: p.descriptionEn,
          // Même repli d'affichage qu'une case de texte : une ligne par puce.
          bullets: parseBullets(p.bullets).join("\n"),
          bulletsEn: parseBullets(p.bulletsEn).join("\n"),
        },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.product.update({
        where: { id },
        data: {
          nameEn: donnees.nameEn,
          shortDescriptionEn: donnees.shortDescriptionEn,
          descriptionEn: donnees.descriptionEn,
          bulletsEn: donnees.bulletsEn === undefined ? undefined : formatBulletsEn(donnees.bulletsEn),
        },
      });
    },
  },

  Routine: {
    champs: registreDe("Routine"),
    async lister() {
      const lignes = await prisma.routine.findMany({
        select: {
          id: true,
          name: true,
          nameEn: true,
          claim: true,
          claimEn: true,
          description: true,
          descriptionEn: true,
        },
        orderBy: { position: "asc" },
      });
      return lignes.map((r) => ({
        id: r.id,
        libelle: r.name,
        valeurs: {
          name: r.name,
          nameEn: r.nameEn,
          claim: r.claim,
          claimEn: r.claimEn,
          description: r.description,
          descriptionEn: r.descriptionEn,
        },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.routine.update({
        where: { id },
        data: {
          nameEn: donnees.nameEn,
          claimEn: donnees.claimEn,
          descriptionEn: donnees.descriptionEn,
        },
      });
    },
  },

  RoutineStep: {
    champs: registreDe("RoutineStep"),
    async lister() {
      const lignes = await prisma.routineStep.findMany({
        select: {
          id: true,
          label: true,
          labelEn: true,
          why: true,
          whyEn: true,
          routine: { select: { name: true } },
          product: { select: { name: true } },
        },
        orderBy: { position: "asc" },
      });
      return lignes.map((s) => ({
        id: s.id,
        libelle: `${s.routine.name} — ${s.product.name}`,
        valeurs: { label: s.label, labelEn: s.labelEn, why: s.why, whyEn: s.whyEn },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.routineStep.update({
        where: { id },
        data: { labelEn: donnees.labelEn, whyEn: donnees.whyEn },
      });
    },
  },

  ProductVariant: {
    champs: registreDe("ProductVariant"),
    async lister() {
      const lignes = await prisma.productVariant.findMany({
        select: { id: true, label: true, labelEn: true, product: { select: { name: true } } },
        orderBy: { position: "asc" },
      });
      return lignes.map((v) => ({
        id: v.id,
        libelle: `${v.product.name} — ${v.label}`,
        valeurs: { label: v.label, labelEn: v.labelEn },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.productVariant.update({ where: { id }, data: { labelEn: donnees.labelEn } });
    },
  },

  DiagQuestion: {
    champs: registreDe("DiagQuestion"),
    async lister() {
      const lignes = await prisma.diagQuestion.findMany({
        select: { id: true, title: true, titleEn: true, subtitle: true, subtitleEn: true },
        orderBy: { position: "asc" },
      });
      return lignes.map((q) => ({
        id: q.id,
        libelle: q.title,
        valeurs: {
          title: q.title,
          titleEn: q.titleEn,
          subtitle: q.subtitle,
          subtitleEn: q.subtitleEn,
        },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.diagQuestion.update({
        where: { id },
        data: { titleEn: donnees.titleEn, subtitleEn: donnees.subtitleEn },
      });
    },
  },

  DiagAnswer: {
    champs: registreDe("DiagAnswer"),
    async lister() {
      const lignes = await prisma.diagAnswer.findMany({
        select: {
          id: true,
          label: true,
          labelEn: true,
          description: true,
          descriptionEn: true,
          question: { select: { title: true } },
        },
        orderBy: { position: "asc" },
      });
      return lignes.map((a) => ({
        id: a.id,
        libelle: `${a.question.title} — ${a.label}`,
        valeurs: {
          label: a.label,
          labelEn: a.labelEn,
          description: a.description,
          descriptionEn: a.descriptionEn,
        },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.diagAnswer.update({
        where: { id },
        data: { labelEn: donnees.labelEn, descriptionEn: donnees.descriptionEn },
      });
    },
  },

  // Clé primaire `key`, pas `id` : voir prisma/schema.prisma.
  DiagStep: {
    champs: registreDe("DiagStep"),
    async lister() {
      const lignes = await prisma.diagStep.findMany({
        select: { key: true, labelFr: true, labelEn: true },
        orderBy: { position: "asc" },
      });
      return lignes.map((s) => ({
        id: s.key,
        libelle: s.labelFr || s.key,
        valeurs: { labelFr: s.labelFr, labelEn: s.labelEn },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.diagStep.update({ where: { key: id }, data: { labelEn: donnees.labelEn } });
    },
  },

  // Clé primaire `key`, pas `id` : voir prisma/schema.prisma.
  ProductTag: {
    champs: registreDe("ProductTag"),
    async lister() {
      const lignes = await prisma.productTag.findMany({
        select: { key: true, labelFr: true, labelEn: true },
        orderBy: { position: "asc" },
      });
      return lignes.map((t) => ({
        id: t.key,
        libelle: t.labelFr || t.key,
        valeurs: { labelFr: t.labelFr, labelEn: t.labelEn },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.productTag.update({ where: { key: id }, data: { labelEn: donnees.labelEn } });
    },
  },

  Campaign: {
    champs: registreDe("Campaign"),
    async lister() {
      const lignes = await prisma.campaign.findMany({
        select: {
          id: true,
          name: true,
          subject: true,
          subjectEn: true,
          headline: true,
          headlineEn: true,
          bodyText: true,
          bodyTextEn: true,
          ctaLabel: true,
          ctaLabelEn: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return lignes.map((c) => ({
        id: c.id,
        libelle: c.name,
        valeurs: {
          subject: c.subject,
          subjectEn: c.subjectEn,
          headline: c.headline,
          headlineEn: c.headlineEn,
          bodyText: c.bodyText,
          bodyTextEn: c.bodyTextEn,
          ctaLabel: c.ctaLabel,
          ctaLabelEn: c.ctaLabelEn,
        },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.campaign.update({
        where: { id },
        data: {
          subjectEn: donnees.subjectEn,
          headlineEn: donnees.headlineEn,
          bodyTextEn: donnees.bodyTextEn,
          ctaLabelEn: donnees.ctaLabelEn,
        },
      });
    },
  },

  Article: {
    champs: registreDe("Article"),
    async lister() {
      const lignes = await prisma.article.findMany({
        select: {
          id: true,
          title: true,
          titleEn: true,
          excerpt: true,
          excerptEn: true,
          coverAlt: true,
          coverAltEn: true,
          metaTitle: true,
          metaTitleEn: true,
          metaDescription: true,
          metaDescriptionEn: true,
        },
        orderBy: { title: "asc" },
      });
      return lignes.map((a) => ({
        id: a.id,
        libelle: a.title,
        valeurs: {
          title: a.title,
          titleEn: a.titleEn,
          excerpt: a.excerpt,
          excerptEn: a.excerptEn,
          coverAlt: a.coverAlt,
          coverAltEn: a.coverAltEn,
          metaTitle: a.metaTitle,
          metaTitleEn: a.metaTitleEn,
          metaDescription: a.metaDescription,
          metaDescriptionEn: a.metaDescriptionEn,
        },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.article.update({
        where: { id },
        data: {
          titleEn: donnees.titleEn,
          excerptEn: donnees.excerptEn,
          coverAltEn: donnees.coverAltEn,
          metaTitleEn: donnees.metaTitleEn,
          metaDescriptionEn: donnees.metaDescriptionEn,
        },
      });
    },
  },

  ArticleCategory: {
    champs: registreDe("ArticleCategory"),
    async lister() {
      const lignes = await prisma.articleCategory.findMany({
        select: {
          id: true,
          label: true,
          labelEn: true,
          description: true,
          descriptionEn: true,
        },
        orderBy: { position: "asc" },
      });
      return lignes.map((c) => ({
        id: c.id,
        libelle: c.label,
        valeurs: {
          label: c.label,
          labelEn: c.labelEn,
          description: c.description,
          descriptionEn: c.descriptionEn,
        },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.articleCategory.update({
        where: { id },
        data: { labelEn: donnees.labelEn, descriptionEn: donnees.descriptionEn },
      });
    },
  },

  ArticleTag: {
    champs: registreDe("ArticleTag"),
    async lister() {
      const lignes = await prisma.articleTag.findMany({
        select: { id: true, label: true, labelEn: true },
        orderBy: { label: "asc" },
      });
      return lignes.map((t) => ({
        id: t.id,
        libelle: t.label,
        valeurs: { label: t.label, labelEn: t.labelEn },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.articleTag.update({ where: { id }, data: { labelEn: donnees.labelEn } });
    },
  },

  ArticleAuthor: {
    champs: registreDe("ArticleAuthor"),
    async lister() {
      const lignes = await prisma.articleAuthor.findMany({
        select: { id: true, name: true, role: true, roleEn: true, bio: true, bioEn: true },
        orderBy: { name: "asc" },
      });
      return lignes.map((a) => ({
        id: a.id,
        libelle: a.name,
        valeurs: { role: a.role, roleEn: a.roleEn, bio: a.bio, bioEn: a.bioEn },
      }));
    },
    async ecrire(id, donnees) {
      await prisma.articleAuthor.update({
        where: { id },
        data: { roleEn: donnees.roleEn, bioEn: donnees.bioEn },
      });
    },
  },
};

function entreeDe(cleModele: string): EntreeModele {
  const entree = CARTE_MODELES[cleModele];
  if (!entree) throw new Error(`Modèle de traduction inconnu : ${cleModele}`);
  return entree;
}

/** Compte, pour chaque modèle traduisible, le nombre d'enregistrements complètement traduits. */
export async function compterParModele(): Promise<
  { cle: string; libelle: string; total: number; complets: number }[]
> {
  return Promise.all(
    MODELES_TRADUISIBLES.map(async (modele) => {
      const entree = entreeDe(modele.cle);
      const lignes = await entree.lister();
      const complets = lignes.filter(
        (ligne) => etatTraduction(ligne.valeurs, entree.champs).complet,
      ).length;
      return { cle: modele.cle, libelle: modele.libelle, total: lignes.length, complets };
    }),
  );
}

/** Liste les enregistrements d'un modèle, avec leur état de traduction. */
export async function listerEnregistrements(
  cleModele: string,
  filtre: "tout" | "a-traduire" | "traduit",
): Promise<LigneTraduction[]> {
  const entree = entreeDe(cleModele);
  const lignes = await entree.lister();
  return lignes
    .map((ligne) => ({
      id: ligne.id,
      libelle: ligne.libelle,
      valeurs: ligne.valeurs,
      etat: etatTraduction(ligne.valeurs, entree.champs),
    }))
    .filter((ligne) => {
      if (filtre === "a-traduire") return !ligne.etat.complet;
      if (filtre === "traduit") return ligne.etat.complet;
      return true;
    });
}

/**
 * Enregistre les traductions d'un enregistrement.
 *
 * N'écrit QUE les champs anglais que le registre déclare pour ce modèle :
 * tout champ reçu qui n'y figure pas est ignoré. C'est ce qui empêche cette
 * route d'écrire n'importe quoi n'importe où.
 */
export async function enregistrerTraduction(
  cleModele: string,
  id: string,
  valeurs: Record<string, string>,
): Promise<void> {
  const entree = entreeDe(cleModele);

  const donnees: Record<string, string> = {};
  for (const champ of entree.champs) {
    if (champ.en in valeurs) donnees[champ.en] = valeurs[champ.en];
  }

  await entree.ecrire(id, donnees);
}
