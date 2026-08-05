import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mlc-bois.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Back-office, API et tunnel d'achat n'ont rien à faire dans l'index
        disallow: ["/admin", "/api", "/panier", "/commande", "/confirmation", "/en/panier", "/en/commande", "/en/confirmation"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
