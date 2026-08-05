import { Fragment } from "react";
import Link from "next/link";
import { parseRichText, type RichTextNode } from "@/lib/richText";

/**
 * Rendu du formatage restreint saisi dans l'administration.
 *
 * Le texte est transformé en éléments React, jamais en HTML : aucune balise
 * collée dans un champ ne peut s'exécuter.
 *
 * Les sauts de ligne simples deviennent des `<br />`. Un rédacteur qui passe à
 * la ligne dans le back-office s'attend à la voir passer sur le site ; sans ça,
 * une adresse écrite sur trois lignes s'afficherait sur une seule.
 */

/** Coupe un texte sur ses sauts de ligne et intercale des `<br />`. */
function withLineBreaks(value: string, keyPrefix: string) {
  const lines = value.split("\n");
  return lines.map((line, index) => (
    <Fragment key={`${keyPrefix}-l${index}`}>
      {index > 0 && <br />}
      {line}
    </Fragment>
  ));
}

function renderNodes(nodes: readonly RichTextNode[], keyPrefix: string) {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (node.kind) {
      case "text":
        return <Fragment key={key}>{withLineBreaks(node.value, key)}</Fragment>;

      case "strong":
        return (
          <strong key={key} className="font-bold text-foreground">
            {renderNodes(node.children, key)}
          </strong>
        );

      case "em":
        return <em key={key}>{renderNodes(node.children, key)}</em>;

      case "link": {
        const children = renderNodes(node.children, key);

        // Lien interne : navigation côté client, comme partout ailleurs.
        if (node.href.startsWith("/")) {
          return (
            <Link key={key} href={node.href} className="font-semibold text-primary hover:underline">
              {children}
            </Link>
          );
        }

        // mailto: et tel: ouvrent une application, pas un onglet.
        const opensTab = /^https?:\/\//i.test(node.href);
        return (
          <a
            key={key}
            href={node.href}
            className="font-semibold text-primary hover:underline"
            {...(opensTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {children}
          </a>
        );
      }
    }
  });
}

/** Affiche un texte formaté. À utiliser à la place d'une interpolation directe. */
export function RichText({ text }: { text: string }) {
  return <>{renderNodes(parseRichText(text), "rt")}</>;
}
