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
        Votre compte n&rsquo;a pas le droit d&rsquo;ouvrir {demande}.
        {role ? ` Il est enregistré comme « ${LIBELLES_ROLES[role]} ».` : ""}
      </p>

      {capacites.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune section ne vous est ouverte. Si ce n&rsquo;est pas attendu, demandez au
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
