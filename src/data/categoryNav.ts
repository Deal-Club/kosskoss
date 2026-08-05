// Structure de navigation mise en avant sur la page d'accueil et dans le menu
// du header (CategoryMenu). Ce module ne contient que des données : il est
// importé aussi bien côté serveur que côté client.
//
// Les libellés ne sont pas stockés ici : le slug sert de clé de traduction dans
// « common.groupNames » et « common.categoryNames », à renseigner dans
// src/messages/fr.json et src/messages/en.json pour chaque entrée ajoutée.
//
// La liste est volontairement vide : l'ancien catalogue électroménager a été
// retiré et le catalogue bois sera défini à partir des sites de référence. Tant
// qu'elle est vide, le menu et la rangée d'essences du header ne s'affichent
// pas — ils reviennent dès la première entrée ajoutée.
//
// Modèle d'une entrée :
//
//   {
//     slug: "buches",
//     href: "/buches",
//     items: [
//       { slug: "hetre", href: "/buches/hetre", image: "/images/bois/hetre.jpg" },
//     ],
//   }
//
// Le slug doit correspondre à celui du groupe ou de la catégorie en base : c'est
// lui qui relie la navigation au catalogue.

export interface CategoryNavItem {
  slug: string;
  href: string;
  image: string;
}

export interface CategoryNavGroup {
  slug: string;
  href: string;
  items: CategoryNavItem[];
}

export const categoryGroups: CategoryNavGroup[] = [
  {
    slug: "bois-de-chauffage",
    href: "/bois-de-chauffage",
    items: [
      {
        slug: "vrac",
        href: "/bois-de-chauffage/vrac",
        image: "/images/brennholz/lose-schuettung.jpg",
      },
      {
        slug: "palette",
        href: "/bois-de-chauffage/palette",
        image: "/images/brennholz/palette-box.jpg",
      },
      {
        slug: "granules",
        href: "/bois-de-chauffage/granules",
        image: "/images/brennholz/pellets.jpg",
      },
      {
        slug: "bois-compresse",
        href: "/bois-de-chauffage/bois-compresse",
        image: "/images/brennholz/briketts.jpg",
      },
    ],
  },
  {
    slug: "equipement",
    href: "/equipement",
    items: [
      {
        slug: "poele-a-bois",
        href: "/equipement/poele-a-bois",
        image: "/images/brennholz/kaminfeuer.jpg",
      },
    ],
  },
];
