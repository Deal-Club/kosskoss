import { JsonLd, type JsonLdValue } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/server/merchant";

// Balisage BreadcrumbList, à poser à côté du composant <Breadcrumb /> visible.
// La liste doit refléter exactement le fil d'Ariane affiché : Google compare les
// deux et ignore le balisage en cas d'écart.

export interface BreadcrumbJsonLdItem {
  label: string;
  /** Chemin interne ("/haushalt/waschmaschinen") ou URL absolue. */
  href?: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbJsonLdItem[] }) {
  if (items.length === 0) return null;

  const elements: JsonLdValue[] = items.map((item, index) => {
    const element: Record<string, JsonLdValue | undefined> = {
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
    };
    // Le dernier maillon reste sans URL : c'est la page courante.
    if (item.href) element.item = absoluteUrl(item.href);
    return element;
  });

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: elements,
      }}
    />
  );
}
