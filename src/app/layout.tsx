import type { Metadata } from "next";
import { Cinzel, Manrope, Playfair_Display } from "next/font/google";
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

// Playfair Display porte les titres. La maquette du client les compose en
// bas-de-casse (« Des soins conçus pour sublimer les peaux noires & métissées »)
// et joue de deux graisses dans un même titre : deux choses que Cinzel ne sait
// pas faire. Les graisses 400 et 500 servent ce contraste, la 600 les accents.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-playfair",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
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
      className={`${cinzel.variable} ${playfair.variable} ${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
