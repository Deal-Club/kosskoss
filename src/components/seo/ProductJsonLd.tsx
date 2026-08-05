import { JsonLd, type JsonLdValue } from "@/components/seo/JsonLd";
import {
  MERCHANT_CURRENCY,
  MERCHANT_RETURN_POLICY,
  MERCHANT_SHIPPING,
  SHOP_NAME,
  buildMerchantRecord,
  getMerchantProductBySlug,
  merchantEffectivePriceCents,
  merchantProductType,
  merchantReferencePriceCents,
} from "@/server/merchant";
import type { Product } from "@/types/home";

// Balisage JSON-LD Product + Offer de la page produit.
//
// Les valeurs proviennent de `buildMerchantRecord()`, exactement comme le flux
// Merchant Center : prix, disponibilité, condition et identifiants ne peuvent donc
// pas diverger entre le flux, le balisage et la page. C'est précisément ce que
// Google contrôle avant d'accepter une fiche (« merchant listing »).
//
// Composant serveur : à placer dans la page produit, sans autre prop que le produit.

interface ProductJsonLdProps {
  /** Le produit tel que la page le rend déjà (note et nombre d'avis compris). */
  product: Pick<Product, "slug" | "rating" | "reviewCount">;
}

/** Valeur schema.org correspondant à la disponibilité du flux. */
const AVAILABILITY_URL: Record<string, string> = {
  in_stock: "https://schema.org/InStock",
  out_of_stock: "https://schema.org/OutOfStock",
  preorder: "https://schema.org/PreOrder",
  backorder: "https://schema.org/BackOrder",
};

/** Valeur schema.org correspondant à l'état du produit. */
const CONDITION_URL: Record<string, string> = {
  new: "https://schema.org/NewCondition",
  refurbished: "https://schema.org/RefurbishedCondition",
  used: "https://schema.org/UsedCondition",
};

/** Classes énergétiques UE, dans la nomenclature schema.org. */
const EU_ENERGY_CATEGORY: Record<string, string> = {
  "A+++": "https://schema.org/EUEnergyEfficiencyCategoryA3Plus",
  "A++": "https://schema.org/EUEnergyEfficiencyCategoryA2Plus",
  "A+": "https://schema.org/EUEnergyEfficiencyCategoryA1Plus",
  A: "https://schema.org/EUEnergyEfficiencyCategoryA",
  B: "https://schema.org/EUEnergyEfficiencyCategoryB",
  C: "https://schema.org/EUEnergyEfficiencyCategoryC",
  D: "https://schema.org/EUEnergyEfficiencyCategoryD",
  E: "https://schema.org/EUEnergyEfficiencyCategoryE",
  F: "https://schema.org/EUEnergyEfficiencyCategoryF",
  G: "https://schema.org/EUEnergyEfficiencyCategoryG",
};

/** Le nom de la propriété GTIN dépend de sa longueur (gtin8/12/13/14). */
function gtinProperties(gtin: string | undefined): Record<string, JsonLdValue | undefined> {
  if (!gtin) return {};
  const key =
    gtin.length === 8 ? "gtin8" : gtin.length === 12 ? "gtin12" : gtin.length === 14 ? "gtin14" : "gtin13";
  return { [key]: gtin, gtin };
}

export async function ProductJsonLd({ product }: ProductJsonLdProps) {
  if (!product.slug) return null;

  const row = await getMerchantProductBySlug(product.slug);
  if (!row) return null;

  const record = buildMerchantRecord(row);
  // Prix et prix barré viennent des mêmes fonctions que le flux : une campagne
  // en cours déplace les deux d'un bloc, et le balisage ne peut pas annoncer un
  // montant que le bloc d'achat ne montre pas.
  const currentPriceCents = merchantEffectivePriceCents(row);
  const referencePriceCents = merchantReferencePriceCents(row);
  const onSale = referencePriceCents > currentPriceCents;
  // L'ancien prix devient un StrikethroughPrice, comme le demande Google.
  const currentPrice = (currentPriceCents / 100).toFixed(2);

  const offer: Record<string, JsonLdValue | undefined> = {
    "@type": "Offer",
    url: record.link,
    priceCurrency: MERCHANT_CURRENCY,
    price: currentPrice,
    priceValidUntil: record.priceValidUntil,
    availability: AVAILABILITY_URL[record.availability],
    itemCondition: CONDITION_URL[record.condition],
    seller: { "@type": "Organization", name: SHOP_NAME },
  };

  if (onSale) {
    offer.priceSpecification = {
      "@type": "UnitPriceSpecification",
      priceType: "https://schema.org/StrikethroughPrice",
      price: (referencePriceCents / 100).toFixed(2),
      priceCurrency: MERCHANT_CURRENCY,
    };
  }

  if (record.shipping) {
    offer.shippingDetails = {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: "0.00",
        currency: MERCHANT_CURRENCY,
      },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: MERCHANT_SHIPPING.country,
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: MERCHANT_SHIPPING.minHandlingDays,
          maxValue: MERCHANT_SHIPPING.maxHandlingDays,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: MERCHANT_SHIPPING.minTransitDays,
          maxValue: MERCHANT_SHIPPING.maxTransitDays,
          unitCode: "DAY",
        },
      },
    };
  }

  offer.hasMerchantReturnPolicy = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: MERCHANT_RETURN_POLICY.country,
    returnPolicyCategory: MERCHANT_RETURN_POLICY.category,
    merchantReturnDays: MERCHANT_RETURN_POLICY.days,
    returnMethod: MERCHANT_RETURN_POLICY.method,
  };

  const data: Record<string, JsonLdValue | undefined> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${record.link}#product`,
    name: record.title,
    description: record.description,
    image: record.imageLink ? [record.imageLink] : undefined,
    sku: row.sku,
    mpn: record.mpn,
    ...gtinProperties(record.gtin),
    brand: { "@type": "Brand", name: row.brand },
    category: merchantProductType(row),
    url: record.link,
    offers: offer,
  };

  // La note n'est publiée que lorsqu'elle repose sur de vrais avis affichés sur la
  // page : Google interdit les notes agrégées sans avis correspondants.
  if (typeof product.rating === "number" && (product.reviewCount ?? 0) > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating.toFixed(1),
      reviewCount: product.reviewCount ?? 0,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (record.productHighlights.length > 0) {
    data.additionalProperty = record.productHighlights.map((highlight) => ({
      "@type": "PropertyValue",
      name: "Ausstattung",
      value: highlight,
    }));
  }

  const energyCategory = EU_ENERGY_CATEGORY[record.energyEfficiencyClass ?? ""];
  if (energyCategory) {
    data.hasEnergyConsumptionDetails = {
      "@type": "EnergyConsumptionDetails",
      hasEnergyEfficiencyCategory: energyCategory,
    };
  }

  return <JsonLd data={data} />;
}
