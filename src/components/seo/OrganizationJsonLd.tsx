import { JsonLd, type JsonLdValue } from "@/components/seo/JsonLd";
import { MERCHANT_COUNTRY, MERCHANT_LANGUAGE, SHOP_NAME, SHOP_PHONE, siteUrl } from "@/server/merchant";

// Balisage Organization + WebSite du site.
//
// Google s'en sert pour rattacher la boutique à une entité connue : c'est l'un des
// signaux qui évitent la mention « informations trompeuses » et qui accélèrent la
// validation d'un compte Merchant Center récent.
//
// À placer une seule fois, dans la mise en page racine ou sur la page d'accueil.

interface OrganizationJsonLdProps {
  /** Profils officiels de la boutique — renforce l'identification de l'entité. */
  sameAs?: string[];
  /** Adresse postale du siège, telle qu'elle figure dans les mentions légales. */
  address?: {
    streetAddress: string;
    postalCode: string;
    addressLocality: string;
  };
}

export function OrganizationJsonLd({ sameAs, address }: OrganizationJsonLdProps) {
  const base = siteUrl();

  const organization: Record<string, JsonLdValue | undefined> = {
    "@type": "OnlineStore",
    "@id": `${base}#organization`,
    name: SHOP_NAME,
    url: base,
    logo: `${base}/images/logo-full.png`,
    image: `${base}/images/logo-full.png`,
    telephone: SHOP_PHONE,
    areaServed: MERCHANT_COUNTRY,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SHOP_PHONE,
      contactType: "customer service",
      areaServed: MERCHANT_COUNTRY,
      availableLanguage: [MERCHANT_LANGUAGE, "en"],
    },
    sameAs: sameAs && sameAs.length > 0 ? sameAs : undefined,
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address.streetAddress,
          postalCode: address.postalCode,
          addressLocality: address.addressLocality,
          addressCountry: MERCHANT_COUNTRY,
        }
      : undefined,
  };

  const website: Record<string, JsonLdValue | undefined> = {
    "@type": "WebSite",
    "@id": `${base}#website`,
    name: SHOP_NAME,
    url: base,
    inLanguage: MERCHANT_LANGUAGE,
    publisher: { "@id": `${base}#organization` },
  };

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [organization, website],
      }}
    />
  );
}
