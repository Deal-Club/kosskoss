import { getSnippetsFor } from "@/server/codeSnippets";
import { readConsent } from "@/server/consent";
import { allowsCategory } from "@/lib/consent";
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
 *
 * CONSENTEMENT. Chaque fragment déclare sa catégorie ; seuls ceux que le
 * visiteur a acceptés sont rendus. Le filtre est appliqué ICI, au rendu serveur,
 * et non par un script qui masquerait après coup : un pixel présent dans le HTML
 * est un pixel déjà parti. Un fragment refusé n'atteint donc jamais le
 * navigateur.
 *
 * Conséquence à connaître : la page rendue dépend du cookie de consentement.
 * C'est aussi pourquoi le bandeau recharge la page après un choix — un fragment
 * réinjecté par une simple actualisation React ne s'exécuterait pas, pour la
 * raison expliquée juste au-dessus.
 */
export async function CodeSnippets({ placement }: { placement: SnippetPlacement }) {
  const [tous, consent] = await Promise.all([getSnippetsFor(placement), readConsent()]);

  const snippets = tous.filter((snippet) => allowsCategory(consent, snippet.category));
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

