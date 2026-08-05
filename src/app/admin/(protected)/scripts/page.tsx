import { Code2 } from "lucide-react";
import { requireAdminSession } from "@/lib/dal";
import { listSnippets } from "@/server/codeSnippets";
import { CodeSnippetManager, type SnippetRow } from "@/components/admin/CodeSnippetManager";

/**
 * Scripts & balises : gestionnaires de balises, pixels, vérifications de
 * propriété, posés sans passer par un déploiement.
 *
 * L'écran est délibérément sobre sur un point : il ne prétend pas valider le
 * code collé. Ce qui est écrit ici s'exécute chez chaque visiteur de la
 * boutique, exactement comme du code déployé.
 */
export default async function AdminScriptsPage() {
  await requireAdminSession();
  const snippets = await listSnippets();

  const rows: SnippetRow[] = snippets.map((snippet) => ({
    id: snippet.id,
    name: snippet.name,
    placement: snippet.placement,
    content: snippet.content,
    enabled: snippet.enabled,
    position: snippet.position,
    updatedAt: snippet.updatedAt.toISOString(),
    updatedBy: snippet.updatedBy,
  }));

  const actifs = rows.filter((row) => row.enabled).length;

  return (
    <div>
      <div className="mb-6 flex items-start gap-3">
        <Code2 className="mt-1 h-6 w-6 shrink-0 text-primary" />
        <div>
          <h1 className="text-2xl font-black text-foreground">Scripts &amp; balises</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Code injecté dans les pages de la boutique : gestionnaire de balises, pixel de mesure,
            balise de vérification de propriété. {rows.length} fragment
            {rows.length > 1 ? "s" : ""}, dont {actifs} actif{actifs > 1 ? "s" : ""}. Une
            modification est visible sur la boutique immédiatement.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-sm border border-border bg-muted/50 p-4 text-sm text-foreground/80">
        <p className="font-bold text-foreground">À lire avant de coller quoi que ce soit</p>
        <ul className="mt-2 space-y-1.5">
          <li>
            Le code collé ici s&apos;exécute chez chaque visiteur, avec les mêmes pouvoirs que le
            code du site : ne collez que ce qui vient d&apos;un service que vous avez choisi.
          </li>
          <li>
            Le back-office n&apos;est jamais concerné : l&apos;injection n&apos;a lieu que sur la
            boutique. Un fragment fautif ne peut donc pas vous enfermer dehors.
          </li>
          <li>
            Un fragment qui dépose un cookie non nécessaire — mesure d&apos;audience, publicité,
            réseau social — demande le consentement du visiteur, et la page « Politique de
            confidentialité » doit alors être mise à jour.
          </li>
        </ul>
      </div>

      <CodeSnippetManager snippets={rows} />
    </div>
  );
}
