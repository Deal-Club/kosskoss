import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Montserrat } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Trois familles KossKoss Select.
//
// Cinzel ne sert plus qu'au logotype. C'est une capitale romaine sans vraie
// bas-de-casse : ses minuscules sont des petites capitales, ce qui rend
// exactement le « KossKoss » du logo officiel — mais rend un titre de section
// pénible à lire, et un paragraphe impossible.
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-cinzel",
  display: "swap",
});

// Cormorant Garamond porte les titres et les slogans — c'est la police
// secondaire imposée par la charte de marque (planche A-8). Elle remplace
// Playfair Display, qui n'y figurait pas.
//
// La charte demande Regular pour les titres, Medium/Bold pour les mises en
// avant : d'où 400, 500 et 600. Attention en la maniant — son œil est
// nettement plus petit que celui de Playfair, un titre y paraît donc plus
// menu à corps égal (compensation mesurée dans globals.css).
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

// Montserrat porte le texte courant, l'interface et les descriptions : c'est
// la police PRINCIPALE de la charte (planche A-8), en remplacement de Manrope.
// Light et Regular pour le contenu, Medium pour les sous-titres — les graisses
// 600 et 700 restent chargées pour les boutons et les étiquettes.
const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KossKoss Select — La sélection beauté qui vous choisit",
  description:
    "Concept-store cosmétique multimarque au Cameroun. Des soins sélectionnés avec exigence, un diagnostic beauté personnalisé, paiement Mobile Money.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // La langue vient du routage pour la boutique ; le back-office, hors
  // middleware, retombe sur la langue par défaut (français).
  const locale = await getLocale();

  // suppressHydrationWarning ne porte que sur <html> : les extensions de
  // navigateur y posent leurs propres attributs (data-qb-installed, thèmes
  // sombres, gestionnaires de mots de passe…) avant que React ne s'hydrate.
  // L'écart est alors inévitable et sans conséquence ; la vérification reste
  // entière pour tout le contenu de la page.
  return (
    <html
      lang={locale}
      className={`${cinzel.variable} ${cormorant.variable} ${montserrat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
