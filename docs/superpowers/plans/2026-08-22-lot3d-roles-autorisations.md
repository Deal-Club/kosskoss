# Lot 3D — Rôles et autorisations — Plan d'implémentation

> **Pour les exécutants agentiques :** SOUS-COMPÉTENCE REQUISE —
> superpowers:subagent-driven-development. Les étapes utilisent la syntaxe à
> cases (`- [ ]`).

**But :** fermer la seule porte ouverte du chantier — aujourd'hui tout compte
authentifié peut tout faire dans le back-office.

**Architecture :** un module pur porte la matrice rôles × capacités ; une lecture
mémoïsée relit le rôle en base à chaque requête ; deux gardes (`requireCapaciteApi`
pour les routes, `requireCapacitePage` pour les pages) remplacent les gardes
actuelles, qui ne vérifient que l'existence d'une session.

**Pile technique :** Next.js 16 App Router, TypeScript strict, Prisma, tests
`node:test` lancés par `npm test`.

**Spécification :** `docs/superpowers/specs/2026-08-22-lot3d-roles-autorisations-design.md`

---

## Contraintes globales

1. **Refuser par défaut.** Une route ou une page qui ne nomme pas sa capacité doit
   échouer bruyamment, jamais s'ouvrir. C'est la règle qui survivra aux lots
   suivants.
2. **Le rôle est relu en base à chaque requête**, jamais pris dans le jeton de
   session : rétrograder ou désactiver un compte doit prendre effet immédiatement.
3. **Le drapeau `active` vaut interdiction**, quel que soit le rôle.
4. **Un rôle inconnu se comporte comme le rôle le moins privilégié**, jamais comme
   un administrateur. Une valeur inattendue en base ne doit pas ouvrir les portes.
5. **403 et 401 sont distincts.** 401 = pas de session. 403 = session valide, droit
   absent. Les confondre déconnecterait l'utilisateur au lieu de l'informer.
6. **Les modules de `src/lib/kk/` sont purs : zéro import.**
7. **Aucune migration.** La colonne `role` existe déjà, avec le bon type et le bon
   défaut.
8. **Ne jamais casser l'accès du propriétaire.** `owner` et `superadmin` gardent
   tout. Le seul rôle réellement restreint est `gestionnaire`, qui n'est attribué à
   personne aujourd'hui.
9. Français partout. Aucun nom de personne ni pseudonyme.
10. **Vérification avant chaque commit :** `npx tsc --noEmit`, `npx eslint src --ext
    .ts,.tsx`, `npm test`. La construction (`npm run build`) aux tâches qui touchent
    une page ou une route. Rien en arrière-plan : `npm run build` au premier plan
    avec un `timeout` explicite de 600000 millisecondes.

---

### Tâche 1 : Le module pur des rôles

**Fichiers :**
- Créer : `src/lib/kk/roles.ts`
- Créer : `src/lib/kk/roles.test.ts`

**Interfaces produites :** `type RoleAdmin`, `type Capacite`, `ROLES`, `CAPACITES`,
`LIBELLES_ROLES`, `peut(role, capacite)`, `estRoleConnu(valeur)`,
`capacitesDe(role)`.

- [ ] **Étape 1 : écrire les tests**

Créer `src/lib/kk/roles.test.ts` :

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CAPACITES, ROLES, capacitesDe, estRoleConnu, peut } from "./roles";

describe("peut", () => {
  it("ouvre tout au superadmin et au propriétaire", () => {
    for (const capacite of CAPACITES) {
      assert.equal(peut("superadmin", capacite), true, `superadmin / ${capacite}`);
      assert.equal(peut("owner", capacite), true, `owner / ${capacite}`);
    }
  });

  it("ouvre tout à l'administrateur SAUF la gestion des comptes", () => {
    // La séparation qui compte : un administrateur ne se donne pas de droits.
    assert.equal(peut("admin", "acces"), false);
    for (const capacite of CAPACITES.filter((c) => c !== "acces")) {
      assert.equal(peut("admin", capacite), true, `admin / ${capacite}`);
    }
  });

  it("n'ouvre au gestionnaire que les commandes", () => {
    assert.equal(peut("gestionnaire", "commandes"), true);
    for (const capacite of CAPACITES.filter((c) => c !== "commandes")) {
      assert.equal(peut("gestionnaire", capacite), false, `gestionnaire / ${capacite}`);
    }
  });

  it("refuse tout à un rôle inconnu", () => {
    // Une valeur inattendue en base — faute de frappe, rôle d'une version
    // future — ne doit pas ouvrir les portes. Le refus est la position sûre.
    for (const capacite of CAPACITES) {
      assert.equal(peut("directeur" as never, capacite), false, capacite);
      assert.equal(peut("" as never, capacite), false, capacite);
    }
  });
});

describe("estRoleConnu", () => {
  it("reconnaît les quatre rôles", () => {
    for (const role of ROLES) assert.equal(estRoleConnu(role), true, role);
  });

  it("refuse tout le reste", () => {
    assert.equal(estRoleConnu("directeur"), false);
    assert.equal(estRoleConnu("ADMIN"), false);
    assert.equal(estRoleConnu(""), false);
    assert.equal(estRoleConnu(undefined), false);
  });
});

describe("capacitesDe", () => {
  it("rend les capacités du rôle", () => {
    assert.deepEqual(capacitesDe("gestionnaire"), ["commandes"]);
  });

  it("rend une liste vide pour un rôle inconnu", () => {
    assert.deepEqual(capacitesDe("directeur" as never), []);
  });

  it("s'accorde avec peut() pour chaque rôle", () => {
    // Deux façons de lire la même matrice : si elles divergent, le menu
    // montrerait des entrées qui mènent à un refus.
    for (const role of ROLES) {
      for (const capacite of CAPACITES) {
        assert.equal(
          capacitesDe(role).includes(capacite),
          peut(role, capacite),
          `${role} / ${capacite}`,
        );
      }
    }
  });
});
```

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

```bash
node --test --import tsx src/lib/kk/roles.test.ts
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Étape 3 : écrire le module**

Créer `src/lib/kk/roles.ts` :

```ts
/**
 * Rôles du back-office et ce que chacun a le droit de faire.
 *
 * ── POURQUOI CE MODULE EST PUR ──────────────────────────────────────────────
 *
 * Le menu (composant client), les gardes serveur et l'écran des comptes lisent
 * tous la même matrice. En la gardant sans dépendance, elle ne peut pas
 * diverger — et rien de serveur n'entre dans le paquet du navigateur.
 *
 * ── L'AUTORISATION SE DIT EN CAPACITÉS, PAS EN ADRESSES ─────────────────────
 *
 * Le back-office compte vingt-six familles de routes. Écrire la règle adresse
 * par adresse garantirait qu'une route ajoutée demain soit oubliée — et une
 * route oubliée est une route ouverte.
 *
 * ── REFUSER PAR DÉFAUT ──────────────────────────────────────────────────────
 *
 * Un rôle inconnu — faute de frappe en base, rôle d'une version future —
 * n'obtient rien. La position sûre est le refus, jamais l'ouverture.
 */

export const ROLES = ["superadmin", "owner", "admin", "gestionnaire"] as const;
export type RoleAdmin = (typeof ROLES)[number];

export const CAPACITES = ["catalogue", "commandes", "contenu", "reglages", "acces"] as const;
export type Capacite = (typeof CAPACITES)[number];

/** Libellés français, pour l'écran des comptes et les messages de refus. */
export const LIBELLES_ROLES: Record<RoleAdmin, string> = {
  superadmin: "Superadmin",
  owner: "Propriétaire",
  admin: "Administrateur",
  gestionnaire: "Gestionnaire de commandes",
};

export const LIBELLES_CAPACITES: Record<Capacite, string> = {
  catalogue: "le catalogue",
  commandes: "les commandes",
  contenu: "les contenus",
  reglages: "les réglages",
  acces: "les comptes",
};

/**
 * La matrice, écrite en toutes lettres.
 *
 * Une matrice explicite se relit ; une matrice déduite de règles s'interprète.
 * Pour une porte de sécurité, la relecture vaut mieux que l'élégance.
 *
 * Le gestionnaire voit les ventes, qui relèvent de `commandes` : suivre les
 * commandes sans voir ce qu'elles rapportent n'aurait pas de sens.
 */
const MATRICE: Record<RoleAdmin, readonly Capacite[]> = {
  superadmin: CAPACITES,
  owner: CAPACITES,
  admin: ["catalogue", "commandes", "contenu", "reglages"],
  gestionnaire: ["commandes"],
};

export function estRoleConnu(valeur: string | undefined | null): valeur is RoleAdmin {
  return typeof valeur === "string" && (ROLES as readonly string[]).includes(valeur);
}

export function capacitesDe(role: string | undefined | null): readonly Capacite[] {
  return estRoleConnu(role) ? MATRICE[role] : [];
}

export function peut(role: string | undefined | null, capacite: Capacite): boolean {
  return capacitesDe(role).includes(capacite);
}
```

- [ ] **Étape 4 : voir les tests passer, vérifier la pureté, commiter**

```bash
node --test --import tsx src/lib/kk/roles.test.ts
grep -c "^import" src/lib/kk/roles.ts   # attendu : 0
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test
git add src/lib/kk/roles.ts src/lib/kk/roles.test.ts
git commit src/lib/kk/roles.ts src/lib/kk/roles.test.ts -m "Rôles du back-office et matrice des capacités"
```

---

### Tâche 2 : La carte des capacités, et le test qui interdit les oublis

**Fichiers :**
- Créer : `src/lib/kk/routesAdmin.ts`
- Créer : `src/lib/kk/routesAdmin.test.ts`

**Interfaces produites :** `CAPACITE_PAR_FAMILLE`, `capaciteDeFamille(nom)`,
`FAMILLES_SANS_SESSION`.

**Contexte.** Cette carte a deux usages : elle documente en un seul endroit quelle
capacité protège quoi, et elle alimente le test qui échoue quand une famille de
routes n'est pas classée. Sans ce test, la trente-cinquième route sera ouverte et
personne ne le saura.

- [ ] **Étape 1 : écrire le module**

Créer `src/lib/kk/routesAdmin.ts` :

```ts
/**
 * Quelle capacité protège quelle famille de routes et d'écrans.
 *
 * Le nom de famille est le premier segment après `/admin/` ou `/api/admin/`.
 *
 * ── POURQUOI CETTE CARTE EXISTE ─────────────────────────────────────────────
 *
 * Elle sert de source unique au test d'arborescence : celui-ci parcourt les
 * dossiers et échoue si une famille n'est pas classée ici. Une route ajoutée
 * sans droit déclaré fait donc tomber la suite, au lieu de s'ouvrir en silence.
 */
import type { Capacite } from "./roles";

export const CAPACITE_PAR_FAMILLE: Record<string, Capacite> = {
  // Catalogue
  products: "catalogue",
  "product-tags": "catalogue",
  categories: "catalogue",
  groups: "catalogue",
  stock: "catalogue",
  merchant: "catalogue",
  upload: "catalogue",
  "vocabulaire-tags": "catalogue",

  // Commandes — y compris les ventes : suivre les commandes sans voir ce
  // qu'elles rapportent n'aurait pas de sens.
  orders: "commandes",
  customers: "commandes",
  reviews: "commandes",
  ventes: "commandes",
  "bank-transfer": "commandes",
  payments: "commandes",

  // Contenu
  journal: "contenu",
  pages: "contenu",
  announcements: "contenu",
  campaigns: "contenu",
  scripts: "contenu",

  // Réglages
  parametres: "reglages",
  integrations: "reglages",
  "payment-gateway": "reglages",
  "payment-methods": "reglages",
  coupons: "reglages",
  diagnostic: "reglages",
  "diagnostic-steps": "reglages",

  // Comptes
  users: "acces",
};

/**
 * Les seules familles qui précèdent par nature toute session.
 *
 * Cette liste est une exception nommée, pas une échappatoire : y ajouter une
 * famille revient à ouvrir une porte, et doit se justifier dans le même
 * mouvement.
 */
export const FAMILLES_SANS_SESSION = ["login", "logout", "refuse"] as const;

export function capaciteDeFamille(nom: string): Capacite | null {
  return CAPACITE_PAR_FAMILLE[nom] ?? null;
}
```

- [ ] **Étape 2 : écrire le test d'arborescence**

Créer `src/lib/kk/routesAdmin.test.ts` :

```ts
// Ce test lit le système de fichiers : c'est délibéré. Il est le seul garde-fou
// qui survivra aux lots suivants — sans lui, une route ajoutée sans droit
// déclaré s'ouvrirait en silence.
import assert from "node:assert/strict";
import { readdirSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import { CAPACITE_PAR_FAMILLE, FAMILLES_SANS_SESSION, capaciteDeFamille } from "./routesAdmin";
import { CAPACITES } from "./roles";

function familles(racine: string): string[] {
  if (!existsSync(racine)) return [];
  return readdirSync(racine, { withFileTypes: true })
    .filter((entree) => entree.isDirectory())
    .map((entree) => entree.name)
    .filter((nom) => !nom.startsWith("(") && !nom.startsWith("["));
}

describe("carte des capacités", () => {
  it("classe toutes les familles de routes d'API", () => {
    const manquantes = familles("src/app/api/admin").filter(
      (nom) =>
        !capaciteDeFamille(nom) && !(FAMILLES_SANS_SESSION as readonly string[]).includes(nom),
    );
    assert.deepEqual(
      manquantes,
      [],
      `Familles de routes sans capacité déclarée : ${manquantes.join(", ")}. ` +
        "Une route sans droit déclaré est une route ouverte.",
    );
  });

  it("classe toutes les familles d'écrans protégés", () => {
    const manquantes = familles("src/app/admin/(protected)").filter(
      (nom) =>
        !capaciteDeFamille(nom) && !(FAMILLES_SANS_SESSION as readonly string[]).includes(nom),
    );
    assert.deepEqual(
      manquantes,
      [],
      `Écrans sans capacité déclarée : ${manquantes.join(", ")}.`,
    );
  });

  it("ne classe aucune famille sous une capacité inexistante", () => {
    for (const [famille, capacite] of Object.entries(CAPACITE_PAR_FAMILLE)) {
      assert.ok(
        (CAPACITES as readonly string[]).includes(capacite),
        `${famille} réclame une capacité inconnue : ${capacite}`,
      );
    }
  });

  it("ne classe pas de famille qui n'existe plus", () => {
    // Une entrée orpheline laisse croire qu'un écran est protégé alors qu'il a
    // disparu — et masque le jour où un écran du même nom réapparaît.
    const reelles = new Set([
      ...familles("src/app/api/admin"),
      ...familles("src/app/admin/(protected)"),
    ]);
    const orphelines = Object.keys(CAPACITE_PAR_FAMILLE).filter((nom) => !reelles.has(nom));
    assert.deepEqual(orphelines, [], `Entrées sans écran ni route : ${orphelines.join(", ")}`);
  });
});
```

- [ ] **Étape 3 : lancer le test et TRAITER SES ÉCHECS**

```bash
node --test --import tsx src/lib/kk/routesAdmin.test.ts
```

Ce test dira la vérité sur l'arborescence réelle, qui peut différer de la carte
écrite ci-dessus. **Ne modifie pas le test pour le faire passer.** Ajoute les
familles manquantes à `CAPACITE_PAR_FAMILLE` en choisissant la capacité d'après le
tableau de la spécification, et retire les entrées orphelines. Note dans ton rapport
chaque famille que tu as dû ajouter ou retirer, et la capacité que tu lui as donnée.

- [ ] **Étape 4 : vérifier et commiter**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test
git commit src/lib/kk/routesAdmin.ts src/lib/kk/routesAdmin.test.ts -m "Carte des capacités par famille de routes"
```

---

### Tâche 3 : Les gardes serveur

**Fichiers :**
- Créer : `src/server/kk/acces.ts`
- Modifier : `src/lib/adminApi.ts`
- Modifier : `src/lib/dal.ts`
- Créer : `src/app/admin/(protected)/refuse/page.tsx`

**Interfaces produites :**
- `roleCourant(): Promise<RoleAdmin | null>` — mémoïsé par requête
- `requireCapaciteApi(capacite): Promise<{ session, unauthorized }>`
- `requireCapacitePage(capacite): Promise<AdminSession>`

- [ ] **Étape 1 : la lecture du rôle**

Créer `src/server/kk/acces.ts` :

```ts
import { cache } from "react";
import { prisma } from "@/server/prisma";
import { getAdminSession } from "@/lib/dal";
import { estRoleConnu, peut, type Capacite, type RoleAdmin } from "@/lib/kk/roles";

/**
 * Le rôle du compte connecté, relu EN BASE à chaque requête.
 *
 * ── POURQUOI PAS DANS LE JETON ──────────────────────────────────────────────
 *
 * Le mettre dans le jeton de session économiserait une requête. Mais un jeton
 * vit plusieurs jours : rétrograder un compte, ou le désactiver, ne prendrait
 * effet qu'à sa prochaine connexion. On révoque un accès parce qu'on veut qu'il
 * cesse maintenant.
 *
 * `cache()` mémoïse la lecture par requête HTTP, comme le fait déjà
 * `getAdminSession` : une requête de base, pas une par vérification.
 */
export const roleCourant = cache(async (): Promise<RoleAdmin | null> => {
  const session = await getAdminSession();
  if (!session?.userId) return null;

  const compte = await prisma.adminUser.findUnique({
    where: { id: session.userId },
    select: { role: true, active: true },
  });

  // Compte supprimé, désactivé, ou portant un rôle qu'on ne connaît pas : aucun
  // droit. Le drapeau `active` n'était jusqu'ici consulté qu'à la connexion, ce
  // qui laissait un compte désactivé travailler jusqu'à l'expiration de son
  // jeton.
  if (!compte || !compte.active || !estRoleConnu(compte.role)) return null;
  return compte.role;
});

/** Le compte connecté a-t-il cette capacité ? */
export async function aLaCapacite(capacite: Capacite): Promise<boolean> {
  return peut(await roleCourant(), capacite);
}
```

- [ ] **Étape 2 : la garde des routes**

Dans `src/lib/adminApi.ts`, garder `requireAdminApi` (les routes l'utilisent encore
le temps du câblage) et ajouter :

```ts
import { aLaCapacite } from "@/server/kk/acces";
import type { Capacite } from "@/lib/kk/roles";

/**
 * Garde des routes d'administration : session ET droit.
 *
 * Les deux refus sont distincts, et c'est délibéré. `401` veut dire « je ne
 * sais pas qui vous êtes » et fait reconnecter ; `403` veut dire « je sais qui
 * vous êtes, et vous n'avez pas ce droit ». Les confondre déconnecterait
 * l'utilisateur au lieu de l'informer, et lui ferait croire à un bogue.
 */
export async function requireCapaciteApi(capacite: Capacite): Promise<AdminApiResult> {
  const base = await requireAdminApi();
  if (base.unauthorized) return base;

  if (!(await aLaCapacite(capacite))) {
    return {
      session: null,
      unauthorized: NextResponse.json({ error: "Accès refusé." }, { status: 403 }),
    };
  }
  return base;
}
```

- [ ] **Étape 3 : la garde des pages**

Dans `src/lib/dal.ts`, ajouter :

```ts
import { aLaCapacite } from "@/server/kk/acces";
import type { Capacite } from "@/lib/kk/roles";

/**
 * Garde des écrans d'administration : session ET droit.
 *
 * Un droit absent redirige vers un écran de refus, pas vers la connexion : une
 * redirection vers la connexion ferait croire à une session expirée, et
 * l'utilisateur se reconnecterait en boucle sans jamais comprendre.
 */
export async function requireCapacitePage(capacite: Capacite) {
  const session = await requireAdminSession();
  if (!(await aLaCapacite(capacite))) {
    redirect(`/admin/refuse?besoin=${capacite}`);
  }
  return session;
}
```

- [ ] **Étape 4 : l'écran de refus**

Créer `src/app/admin/(protected)/refuse/page.tsx` :

```tsx
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireAdminSession } from "@/lib/dal";
import { roleCourant } from "@/server/kk/acces";
import { LIBELLES_CAPACITES, LIBELLES_ROLES, capacitesDe, type Capacite } from "@/lib/kk/roles";

/**
 * Écran de refus.
 *
 * Il dit trois choses : ce qui a été refusé, sous quel rôle, et où aller
 * ensuite. Un refus qui ne dit pas la troisième laisse l'utilisateur dans une
 * impasse et se lit comme une panne.
 */
export default async function AdminRefusePage({
  searchParams,
}: {
  searchParams: Promise<{ besoin?: string }>;
}) {
  await requireAdminSession();
  const { besoin } = await searchParams;
  const role = await roleCourant();
  const capacites = capacitesDe(role);

  const demande = besoin && besoin in LIBELLES_CAPACITES
    ? LIBELLES_CAPACITES[besoin as Capacite]
    : "cette partie du back-office";

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-sm border border-border p-6">
      <div className="flex items-center gap-2 text-destructive">
        <ShieldAlert className="h-5 w-5" aria-hidden />
        <h1 className="text-xl font-black">Accès refusé</h1>
      </div>

      <p className="text-sm">
        Votre compte n’a pas le droit d’ouvrir {demande}.
        {role ? ` Il est enregistré comme « ${LIBELLES_ROLES[role]} ».` : ""}
      </p>

      {capacites.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune section ne vous est ouverte. Si ce n’est pas attendu, demandez au
          propriétaire de la boutique de vérifier votre compte : il a peut-être été
          désactivé.
        </p>
      ) : (
        <div className="text-sm">
          <p className="text-muted-foreground">Ce à quoi vous avez accès :</p>
          <ul className="mt-2 space-y-1">
            {capacites.includes("commandes") ? (
              <li>
                <Link href="/admin/orders" className="underline">
                  Les commandes
                </Link>
              </li>
            ) : null}
            {capacites.includes("catalogue") ? (
              <li>
                <Link href="/admin/products" className="underline">
                  Le catalogue
                </Link>
              </li>
            ) : null}
            {capacites.includes("contenu") ? (
              <li>
                <Link href="/admin/journal" className="underline">
                  Les contenus
                </Link>
              </li>
            ) : null}
            {capacites.includes("reglages") ? (
              <li>
                <Link href="/admin/parametres" className="underline">
                  Les réglages
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Étape 5 : vérifier et commiter**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test && npm run build
git commit src/server/kk/acces.ts src/lib/adminApi.ts src/lib/dal.ts "src/app/admin/(protected)/refuse/page.tsx" -m "Gardes de capacité pour les routes et les écrans"
```

---

### Tâche 4 : Câbler toutes les routes d'API

**Fichiers :** tous les `src/app/api/admin/**/route.ts` sauf `login`, `logout` et
leurs sous-routes.

**Contexte.** Travail mécanique et répétitif, mais c'est lui qui ferme réellement la
porte : les trois tâches précédentes n'ont fait que fabriquer la serrure.

- [ ] **Étape 1 : recenser**

```bash
find src/app/api/admin -name "route.ts" | sort
```

Note le nombre total dans ton rapport.

- [ ] **Étape 2 : remplacer, fichier par fichier**

Dans chaque route, remplacer :

```ts
const { unauthorized } = await requireAdminApi();
```

par, en donnant la capacité de la famille d'après `CAPACITE_PAR_FAMILLE` :

```ts
const { unauthorized } = await requireCapaciteApi("commandes");
```

et adapter l'import. Certaines routes récupèrent aussi la session
(`const { session, unauthorized } = ...`) : garder cette forme, seule la fonction
appelée change.

**Trois pièges :**
- une route peut appeler la garde dans PLUSIEURS fonctions exportées (`GET`, `POST`,
  `PATCH`, `DELETE`) : toutes doivent être câblées, pas seulement la première ;
- `login` et `logout` ne prennent aucune garde de capacité — ce sont les exceptions
  nommées ;
- si une route n'appelle aucune garde du tout aujourd'hui, **c'est un trou** :
  signale-le dans ton rapport et pose la garde correspondante.

- [ ] **Étape 3 : vérifier qu'il ne reste aucune route non gardée**

```bash
grep -rLn "requireCapaciteApi" src/app/api/admin --include=route.ts
```

Attendu : uniquement les routes de `login` et `logout`. Toute autre ligne est une
route ouverte — corrige-la.

```bash
grep -rn "requireAdminApi()" src/app/api/admin --include=route.ts
```

Attendu : aucun résultat en dehors de `login` et `logout`.

- [ ] **Étape 4 : vérifier et commiter**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test && npm run build
```

Commit limité aux routes touchées, avec le message
« Chaque route d'administration nomme désormais son droit ».

---

### Tâche 5 : Câbler les écrans, le menu et l'accueil

**Fichiers :** tous les `src/app/admin/(protected)/**/page.tsx`,
`src/components/admin/AdminSidebar.tsx`, et le composant de mise en page qui le
rend.

- [ ] **Étape 1 : les écrans**

Dans chaque page protégée, remplacer `await requireAdminSession();` par
`await requireCapacitePage("<capacité de la famille>");`.

Deux exceptions :
- `refuse/page.tsx` garde `requireAdminSession()` — un écran de refus qui exigerait
  un droit serait injoignable, ce qui est le comble ;
- la page d'accueil `page.tsx` est traitée à l'étape 2.

- [ ] **Étape 2 : l'accueil**

`src/app/admin/(protected)/page.tsx` est un tableau de bord du CATALOGUE. Un
gestionnaire de commandes n'y a pas sa place. En tête de la page, après la session :

```tsx
  // L'accueil est un tableau de bord du catalogue : un gestionnaire de
  // commandes y verrait un écran entier auquel il n'a pas droit. On l'envoie
  // là où son travail commence, plutôt que de lui montrer un refus dès la
  // connexion.
  if (!(await aLaCapacite("catalogue"))) {
    redirect(peut(await roleCourant(), "commandes") ? "/admin/orders" : "/admin/refuse");
  }
```

- [ ] **Étape 3 : le menu**

`AdminSidebar` doit recevoir la liste des capacités du compte et n'afficher que les
sections ouvertes. Ajoute une propriété `capacites: readonly Capacite[]` et, pour
chaque entrée du menu, la capacité qu'elle exige — en réutilisant
`CAPACITE_PAR_FAMILLE` plutôt qu'en recopiant la règle. Une section dont toutes les
entrées sont refusées ne s'affiche pas du tout, titre compris.

Le composant qui rend la barre latérale doit lui passer `capacitesDe(await
roleCourant())`.

**Un menu qui affiche des entrées menant à un refus est une invitation à croire à un
bogue.**

- [ ] **Étape 4 : vérifier à la main, avec deux comptes**

```bash
npm run dev
```

1. Avec un compte `owner` : tout est visible, tout s'ouvre, y compris `/admin/users`.
2. Passe un compte de test au rôle `gestionnaire` depuis `/admin/users`, connecte-toi
   avec lui, et vérifie :
   - le menu ne montre que les commandes, les clients, les avis et les ventes ;
   - `/admin` redirige vers `/admin/orders` ;
   - ouvrir `/admin/products` à la main mène à l'écran de refus, PAS à la connexion ;
   - `curl` sur une route de catalogue rend `403` et non `401` ni `200`.
3. Désactive ce compte depuis `/admin/users` **sans le déconnecter**, puis recharge sa
   page : l'accès doit tomber immédiatement, sans attendre l'expiration du jeton.

Écris dans ton rapport le résultat de chacun de ces points. Le point 3 est le plus
important : c'est lui qui justifie de relire le rôle en base à chaque requête.

- [ ] **Étape 5 : vérifier et commiter**

```bash
npx tsc --noEmit && npx eslint src --ext .ts,.tsx && npm test && npm run build
```

Message : « Les écrans et le menu suivent les droits du compte ».

---

## Vérification finale du lot

- [ ] Aucune route d'administration hors `login`/`logout` sans `requireCapaciteApi`.
- [ ] Aucun écran protégé hors `refuse` sans `requireCapacitePage`.
- [ ] `npm test` au vert, `npm run build` en succès.
- [ ] **Le compte de secours** : vérifier qu'au moins un compte `owner` ou
      `superadmin` existe et actif. Un back-office où plus personne ne peut créer de
      comptes se rouvre par une requête SQL — faisable, mais à ne pas découvrir un
      dimanche.
