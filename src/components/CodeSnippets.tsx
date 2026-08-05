import { getSnippetsFor } from "@/server/codeSnippets";
import { splitSnippetForHead, type SnippetPlacement } from "@/server/codeSnippetInput";

/**
 * Injection des fragments posés depuis l'administration.
 *
 * Monté dans le layout de la boutique, donc jamais dans le back-office : /admin
 * est hors du routage multilingue et ne traverse pas ce layout. Un fragment
 * fautif ne peut pas fermer la porte du back-office derrière lui, ce qui
 * importe puisque c'est le seul endroit d'où le désactiver.
 *
 * POURQUOI LES SCRIPTS S'EXÉCUTENT QUAND MÊME. Un `<script>` posé par
 * `innerHTML` depuis le navigateur ne s'exécute pas ; celui-ci vient du rendu
 * serveur, donc du flux HTML, et l'analyseur du navigateur le traite comme
 * n'importe quel autre script de la page. La distinction n'est pas théorique :
 * elle est la raison pour laquelle ce composant reste un composant serveur.
 *
 * L'emplacement « En-tête » subit un traitement supplémentaire — voir
 * `splitSnippetForHead` : les `<meta>` et `<link>` en sont extraits pour être
 * rendus comme éléments React, que React remonte dans le `<head>`. Sans cela,
 * une balise de vérification de propriété resterait dans le corps de page, où
 * aucun moteur ne la lit.
 */
export async function CodeSnippets({ placement }: { placement: SnippetPlacement }) {
  const snippets = await getSnippetsFor(placement);
  if (snippets.length === 0) return null;

  return (
    <>
      {snippets.map((snippet) => {
        if (placement !== "head") {
          return (
            <div
              key={snippet.id}
              style={{ display: "contents" }}
              dangerouslySetInnerHTML={{ __html: snippet.content }}
            />
          );
        }

        const { hoisted, html } = splitSnippetForHead(snippet.content);
        return (
          <div key={snippet.id} style={{ display: "contents" }}>
            {hoisted.map((tag, index) =>
              tag.tag === "meta" ? (
                <meta key={index} {...tag.attributes} />
              ) : (
                <link key={index} {...tag.attributes} />
              ),
            )}
            {html && <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />}
          </div>
        );
      })}
    </>
  );
}

