import { defineRouting } from "next-intl/routing";

// Le français reste à la racine (/), l'anglais vit sous /en :
// la boutique s'adresse au marché français, c'est donc le français qui porte
// les URL courtes et le référencement.
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  // Pas de redirection d'après la langue du navigateur : « / » sert toujours
  // le français. Sinon un robot d'indexation anglophone serait renvoyé vers /en
  // et la version française, celle qui porte le référencement, ne serait plus
  // explorée. Le changement de langue reste un choix explicite du visiteur.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};
