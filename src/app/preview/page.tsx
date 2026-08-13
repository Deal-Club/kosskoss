import type { Metadata } from "next";
import { AnnouncementBar, SiteHeader, SiteFooter } from "@/components/kk/chrome";
import { Hero, ProductRail } from "@/components/kk/home";
import {
  DiagnosticReminder,
  InsightsSection,
  PromisesRow,
  ServicesBand,
} from "@/components/kk/home-sections";
import { AvisClients } from "@/components/kk/avis-clients";
import { NewsletterBand } from "@/components/kk/newsletter";
import { CartProvider } from "@/components/cart/CartProvider";
import { MOCK_SELECTION } from "@/data/kk/home-mock";
import type { KKReviewsSummary, KKTestimonialView } from "@/types/kk";

/**
 * Échantillon servant UNIQUEMENT à caler le rendu du bloc avis sur cette page
 * de design system (noindex, jamais publique). Les auteurs sont explicitement
 * nommés « Avis de démonstration » pour qu'aucune capture d'écran ne puisse
 * passer pour un vrai témoignage. La boutique, elle, ne lit que les avis
 * modérés en base.
 */
const PREVIEW_TESTIMONIALS: KKTestimonialView[] = [
  {
    id: "demo-1",
    quote:
      "Emplacement réservé à un avis client réel, publié après modération. Ce texte n'est pas un témoignage.",
    author: "Avis de démonstration",
    rating: 5,
    productName: "Produit d'exemple",
  },
  {
    id: "demo-2",
    quote:
      "Emplacement réservé à un avis client réel, publié après modération. Ce texte n'est pas un témoignage.",
    author: "Avis de démonstration",
    rating: 4,
    productName: "Produit d'exemple",
  },
  {
    id: "demo-3",
    quote:
      "Emplacement réservé à un avis client réel, publié après modération. Ce texte n'est pas un témoignage.",
    author: "Avis de démonstration",
    rating: 5,
    productName: "Produit d'exemple",
  },
];

/**
 * Agrégat de calage, pour cette page de design system uniquement.
 *
 * La boutique, elle, calcule sa note moyenne en base sur les seuls avis
 * modérés (`getReviewsSummary`) et masque la section tant qu'aucun avis n'est
 * publié : aucune note n'y est jamais écrite à la main.
 */
const PREVIEW_RESUME: KKReviewsSummary = {
  average: 4.6,
  total: 3,
  distribution: [
    { rating: 5, count: 2 },
    { rating: 4, count: 1 },
    { rating: 3, count: 0 },
    { rating: 2, count: 0 },
    { rating: 1, count: 0 },
  ],
};

// Page de prévisualisation du design system KossKoss Select — données de
// démonstration, non branchée sur la base. Jamais indexée.
export const metadata: Metadata = {
  title: "Aperçu design — KossKoss Select",
  robots: { index: false, follow: false },
};

export default function PreviewHomePage() {
  // `CartProvider` est indispensable ici : cette page vit hors du segment
  // [locale], donc hors du layout de la boutique qui le fournit — or l'en-tête
  // (compteur du panier) et les vignettes (ajout rapide) appellent `useCart`.
  // Sans lui, la page entière échoue au rendu.
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar />
        <SiteHeader />

        {/* Les blocs branchés sur la base — focus marque, routines, catégories
            — ne figurent pas ici : cette page n'a pas de connexion et sert à
            caler le rendu, pas à répéter l'accueil. */}
        <main className="flex-1">
          <Hero />
          <PromisesRow />
          <ProductRail
            eyebrow="Les plus choisis"
            title="Nos best-sellers"
            action="Tout voir"
            products={MOCK_SELECTION}
          />
          <InsightsSection
            entries={[
              {
                question: "Emplacement d'une question fréquente",
                answer: "Réponse de démonstration. La boutique lit ce bloc depuis la page /faq.",
              },
            ]}
            cases={[]}
          />
          <AvisClients avis={PREVIEW_TESTIMONIALS} resume={PREVIEW_RESUME} />
          <DiagnosticReminder />
          <ServicesBand />
          <NewsletterBand />
        </main>

        <SiteFooter />
      </div>
    </CartProvider>
  );
}
