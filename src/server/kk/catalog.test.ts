import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { config as loadEnv } from "dotenv";

// `npm test` (`node --test --import tsx`) ne charge aucune variable
// d'environnement de lui-même — contrairement à `next dev` — d'où ce chargement
// explicite, identique à celui de prisma/seed-tags.ts. Sans base réelle
// disponible (poste sans `.env.local`, CI sans secret), la suite s'ignore
// proprement plutôt que d'échouer sur une `DATABASE_URL` absente.
loadEnv({ path: ".env.local" });

const BASE_DISPONIBLE = Boolean(process.env.DATABASE_URL);

/**
 * Ce fichier existe pour une raison précise, documentée en revue du lot :
 * `produitCorrespondFacettes` (src/lib/kk/facettes.ts) porte la règle UNION
 * dans une famille / INTERSECTION entre familles, et cinq tests unitaires la
 * verrouillent — mais RIEN en production ne l'appelait plus pour le rayon
 * KK : `getCatalog` reconstruit la même règle en Prisma (`tagsWhere`/`whereFor`
 * dans catalog.ts), et un test de mutation l'a prouvé : inverser le `OR` de
 * `tagsWhere` en `AND` transforme l'union en intersection et fait tomber un
 * rayon de dix-huit à douze produits SANS qu'aucun des 674 tests existants ne
 * bouge. Les tests de facettes.test.ts gardaient donc une fonction morte.
 *
 * Ce test-ci porte sur `getCatalog` lui-même, à travers Prisma, contre une
 * base réelle (aucune infrastructure de mock Prisma n'existe dans ce dépôt —
 * voir le rapport de la tâche 2 du lot). Les données sont créées ici, jamais
 * dans le jeu existant : un groupe et une catégorie au slug unique
 * (horodaté), trois produits aux tags de test, tous supprimés en fin de
 * suite — et la suppression est RELUE pour être confirmée, pas seulement
 * supposée.
 */
describe("getCatalog — la règle union/intersection réellement exécutée en base", { skip: !BASE_DISPONIBLE }, () => {
  // Import différé : si la suite est ignorée (pas de DATABASE_URL), le module
  // prisma ne doit jamais être évalué — `src/server/prisma.ts` lève dès
  // l'ouverture d'une connexion si la variable est absente.
  let prisma: typeof import("@/server/prisma").prisma;
  let getCatalog: typeof import("./catalog").getCatalog;

  const suffixe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const groupSlug = `test-facettes-${suffixe}`;
  const categorySlug = "test-categorie";

  let groupId = "";
  let categoryId = "";
  const productIds: string[] = [];

  before(async () => {
    ({ prisma } = await import("@/server/prisma"));
    ({ getCatalog } = await import("./catalog"));

    const group = await prisma.group.create({
      data: { slug: groupSlug, label: "Groupe de test — facettes" },
    });
    groupId = group.id;

    const category = await prisma.category.create({
      data: { groupId: group.id, slug: categorySlug, label: "Catégorie de test" },
    });
    categoryId = category.id;

    // A : porte uniquement « test_peau_a ».
    // B : porte uniquement « test_peau_b ».
    // C : porte « test_peau_a » ET « test_preoc_a » — seul produit qui doit
    //     rester quand les deux familles sont cochées à la fois (intersection).
    const produits = [
      { suffix: "a", tags: ["test_peau_a"] },
      { suffix: "b", tags: ["test_peau_b"] },
      { suffix: "c", tags: ["test_peau_a", "test_preoc_a"] },
    ];
    for (const p of produits) {
      const created = await prisma.product.create({
        data: {
          categoryId: category.id,
          brand: "Test",
          name: `Produit test ${p.suffix}`,
          slug: `test-facettes-${suffixe}-${p.suffix}`,
          sku: `TEST-${suffixe}-${p.suffix}`,
          priceCents: 10_000,
          tags: JSON.stringify(p.tags),
          active: true,
        },
      });
      productIds.push(created.id);
    }
  });

  after(async () => {
    // La suppression du groupe entraîne, en cascade (voir prisma/schema.prisma),
    // celle de sa catégorie puis de ses produits — un seul appel suffit à tout
    // nettoyer. On la relit ensuite pour CONFIRMER la suppression plutôt que de
    // la supposer.
    if (groupId) {
      await prisma.group.delete({ where: { id: groupId } }).catch(() => {});
    }

    const groupRestant = groupId ? await prisma.group.findUnique({ where: { id: groupId } }) : null;
    const categorieRestante = categoryId
      ? await prisma.category.findUnique({ where: { id: categoryId } })
      : null;
    const produitsRestants = categoryId
      ? await prisma.product.count({ where: { categoryId } })
      : 0;

    assert.equal(groupRestant, null, "le groupe de test doit avoir disparu");
    assert.equal(categorieRestante, null, "la catégorie de test doit avoir disparu avec le groupe");
    assert.equal(produitsRestants, 0, "aucun produit de test ne doit subsister");
  });

  it("sans facette, les trois produits de test sont visibles", async () => {
    const view = await getCatalog({ group: groupSlug, locale: "fr" });
    assert.ok(view);
    assert.equal(view!.total, 3);
  });

  it("UNION dans une famille : cocher deux types de peau élargit (A + B + C)", async () => {
    const view = await getCatalog({
      group: groupSlug,
      peau: ["test_peau_a", "test_peau_b"],
      locale: "fr",
    });
    assert.ok(view);
    assert.equal(view!.total, 3);
  });

  it("INTERSECTION entre familles : peau ET préoccupation ne retient que C", async () => {
    const view = await getCatalog({
      group: groupSlug,
      peau: ["test_peau_a"],
      preoccupation: ["test_preoc_a"],
      locale: "fr",
    });
    assert.ok(view);
    assert.equal(view!.total, 1);
    assert.equal(view!.products[0]?.slug, `test-facettes-${suffixe}-c`);
  });

  it("INTERSECTION entre familles : B n'a pas la préoccupation cochée, écarté", async () => {
    const view = await getCatalog({
      group: groupSlug,
      peau: ["test_peau_b"],
      preoccupation: ["test_preoc_a"],
      locale: "fr",
    });
    assert.ok(view);
    assert.equal(view!.total, 0);
  });
});
