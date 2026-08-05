// Balise <script type="application/ld+json"> commune aux différents balisages.
// Le « < » est réencodé pour qu'aucune donnée produit ne puisse fermer la balise
// script prématurément.

export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue | undefined };

export function JsonLd({ data }: { data: Record<string, JsonLdValue | undefined> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // Le JSON est produit ici, jamais fourni par l'utilisateur final.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
