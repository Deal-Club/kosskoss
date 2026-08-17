/**
 * Registre des écrans de la maquette de présentation client.
 *
 * Source unique de vérité pour `capture.mjs` (qui photographie le site en
 * ligne) et `construire.mjs` (qui bâtit le livrable HTML). Ajouter un écran ici
 * suffit : les deux scripts le prennent en compte au prochain passage.
 *
 * Ce registre ne décrit QUE des écrans accessibles sans connexion. Les écrans
 * de l'espace client connecté — compte, commandes, adresses, informations —
 * demandent un compte réel en base de production ; ils sont volontairement
 * hors de cette première version (voir « limites » dans le livrable).
 */

/** Les regroupements affichés dans le sommaire, dans l'ordre de lecture. */
export const PARCOURS = [
  {
    id: "vitrine",
    titre: "Vitrine",
    intro:
      "L'entrée sur la boutique. L'ordre des blocs part du besoin — diagnostic, routines — avant d'arriver au produit.",
  },
  {
    id: "achat",
    titre: "Parcours d'achat",
    intro:
      "De l'ajout au panier jusqu'au récapitulatif de commande. Capturé avec un panier réellement garni, pas simulé.",
  },
  {
    id: "compte",
    titre: "Espace client",
    intro:
      "Les portes d'entrée du compte. Les écrans une fois connecté ne figurent pas dans cette version.",
  },
  {
    id: "information",
    titre: "Information et cadre légal",
    intro: "Les pages que le client consulte avant d'acheter, et celles qui engagent la société.",
  },
];

/**
 * Un écran = une capture desktop et une capture mobile, sauf mention contraire.
 *
 * - `chemin` : l'URL relative sur le site en ligne.
 * - `etat` : nom d'une manœuvre à exécuter avant la photo (voir capture.mjs).
 * - `pleinePage` : false pour les états en surimpression (tiroir, menu), qui
 *   sont en position fixe et n'auraient aucun sens sur une photo de 5 000 px.
 * - `hotspots` : zones cliquables du prototype. Le sélecteur est résolu sur la
 *   page réelle et ses coordonnées converties en pourcentages de l'image, donc
 *   la zone reste juste même si le contenu de la page bouge.
 */
export const ECRANS = [
  // ---------------------------------------------------------------- Vitrine
  {
    id: "accueil",
    parcours: "vitrine",
    titre: "Accueil",
    chemin: "/",
    intention:
      "Faire entrer par le besoin et non par le catalogue. Les blocs « solution » — diagnostic, routines — passent devant les blocs « produit ».",
    points: [
      "Les promesses arrivent en deuxième position, juste sous le hero : l'identité de marque désigne la peur de la contrefaçon comme le premier frein de la cible.",
      "Un seul rail de produits, contre deux auparavant. Deux rails faisaient de l'accueil un catalogue.",
      "Douze maisons distribuées affichées nommément — sur ce marché, montrer vaut mieux qu'affirmer.",
    ],
    // `main` et non la page entière : les mêmes liens existent dans la
    // navigation collante, et une zone posée là-dessus renverrait le client vers
    // un bouton d'en-tête au lieu de l'appel à l'action de la page.
    hotspots: [
      { selecteur: 'header a[href="/soins-visage"]', vers: "megamenu", devices: ["desktop"] },
      { selecteur: 'main a[href="/diagnostic"]', vers: "diagnostic" },
      { selecteur: 'main a[href="/routines"]', vers: "routines" },
    ],
  },
  {
    id: "megamenu",
    parcours: "vitrine",
    titre: "Méga-menu déployé",
    chemin: "/",
    etat: "megamenu",
    devices: ["desktop"],
    pleinePage: false,
    intention:
      "Donner à voir tout le rayon d'un coup d'œil, avec le nombre de références par catégorie et une mise en avant produit.",
    points: [
      "Le compte de références par catégorie est lu en base : il ne peut pas mentir sur ce qui est réellement en ligne.",
      "S'ouvre au survol sur ordinateur ; sur mobile, c'est le menu plein écran qui prend le relais.",
    ],
    hotspots: [{ selecteur: 'a[href="/soins-visage/hydratants"]', vers: "categorie" }],
  },
  {
    id: "menu-mobile",
    parcours: "vitrine",
    titre: "Menu mobile déployé",
    chemin: "/",
    etat: "menuMobile",
    devices: ["mobile"],
    pleinePage: false,
    intention:
      "L'équivalent mobile du méga-menu. C'est l'écran de navigation le plus utilisé sur ce marché, où le téléphone domine largement.",
    points: ["Navigation au pouce, catégories dépliables sans quitter la page."],
  },
  {
    id: "groupe",
    parcours: "vitrine",
    titre: "Rayon — Soins du visage",
    chemin: "/soins-visage",
    intention: "Le niveau intermédiaire : présenter les catégories d'un rayon avant d'entrer dans une liste de produits.",
    points: ["Chaque catégorie annonce son nombre de références."],
    hotspots: [{ selecteur: 'a[href="/soins-visage/hydratants"]', vers: "categorie" }],
  },
  {
    id: "categorie",
    parcours: "vitrine",
    titre: "Catégorie — Hydratants",
    chemin: "/soins-visage/hydratants",
    intention: "La liste de produits avec ses filtres. C'est l'écran où se joue la comparaison entre références.",
    points: [
      "Quinze références réelles, issues du catalogue client importé.",
      "Prix en francs CFA, marque affichée sur chaque vignette.",
    ],
    hotspots: [
      {
        selecteur: 'a[href="/soins-visage/hydratants/clinique-moisture-surge-100h"]',
        vers: "fiche",
      },
    ],
  },
  {
    id: "fiche",
    parcours: "vitrine",
    titre: "Fiche produit",
    chemin: "/soins-visage/hydratants/clinique-moisture-surge-100h",
    intention:
      "Lever le doute et déclencher l'ajout au panier. Deux chemins possibles : le panier classique, ou « Payer maintenant » qui saute l'étape.",
    points: [
      "Visuels hébergés sur Cloudinary, servis en AVIF/WebP selon le navigateur.",
      "Les avis affichés sont ceux, et seulement ceux, qui ont été modérés en back-office.",
    ],
    hotspots: [{ selecteur: 'button:has-text("Ajouter au panier")', vers: "tiroir-panier" }],
  },
  {
    id: "routines",
    parcours: "vitrine",
    titre: "Routines",
    chemin: "/routines",
    intention:
      "Le cœur de la promesse de marque : des routines prêtes à l'emploi, rangées par préoccupation plutôt que par type de produit.",
    points: ["Une routine s'achète d'un bloc, sans avoir à composer soi-même."],
    hotspots: [{ selecteur: 'a[href="/routines/routine-acne"]', vers: "routine-detail" }],
  },
  {
    id: "routine-detail",
    parcours: "vitrine",
    titre: "Routine — Acné",
    chemin: "/routines/routine-acne",
    intention: "Détailler les étapes d'une routine, dans l'ordre d'application, et permettre de tout ajouter au panier.",
    points: ["Chaque étape renvoie au produit qui la remplit."],
  },
  {
    id: "diagnostic",
    parcours: "vitrine",
    titre: "Diagnostic — première question",
    chemin: "/diagnostic",
    intention:
      "Recueillir ceux qui ne savent pas se situer. Cinq questions, une seule à l'écran, quatre réponses illustrées par un symptôme concret.",
    points: [
      "Les réponses décrivent une sensation — « film gras, pores dilatés », « inconfort, peau qui tire » — et non un terme de dermatologie.",
      "Aucun compte n'est demandé pour faire le diagnostic.",
    ],
    hotspots: [],
  },
  {
    id: "diagnostic-analyse",
    parcours: "vitrine",
    titre: "Diagnostic — analyse et résultat",
    chemin: "/diagnostic",
    etat: "diagnosticComplet",
    intention: "Rendre le résultat : le profil de peau déduit, et la routine qui y répond.",
    points: ["L'écran d'analyse marque une pause avant le résultat : il donne du poids à la recommandation."],
  },
  {
    id: "diagnostic-resultat",
    parcours: "vitrine",
    titre: "Diagnostic — routine recommandée",
    chemin: "/diagnostic",
    etat: "diagnosticResultat",
    intention:
      "Transformer le diagnostic en achat : le profil de peau déduit, et la routine qui y répond, prête à mettre au panier.",
    points: ["C'est l'aboutissement du parcours « je ne sais pas par où commencer »."],
  },
  {
    id: "marques",
    parcours: "vitrine",
    titre: "Marques distribuées",
    chemin: "/marques",
    intention:
      "Répondre à la question « à qui j'achète ? ». Sur un marché où la contrefaçon est le premier frein, la liste des maisons est un argument de vente.",
    points: [],
  },
  {
    id: "recherche",
    parcours: "vitrine",
    titre: "Résultats de recherche",
    chemin: "/recherche?q=creme",
    intention: "Servir le visiteur qui sait déjà ce qu'il cherche.",
    points: [],
  },
  {
    id: "favoris",
    parcours: "vitrine",
    titre: "Favoris — état vide",
    chemin: "/favoris",
    intention:
      "Montrer un état vide traité, et non une page blanche. C'est l'écran que voit le tout premier visiteur.",
    points: ["Les favoris fonctionnent sans compte, puis se rattachent au compte à la connexion."],
  },

  // ------------------------------------------------------------------ Achat
  {
    id: "tiroir-panier",
    parcours: "achat",
    titre: "Tiroir du panier",
    chemin: "/soins-visage/hydratants/clinique-moisture-surge-100h",
    etat: "ajoutPanier",
    pleinePage: false,
    intention:
      "Confirmer l'ajout sans faire quitter la page en cours. Le visiteur peut continuer ses achats ou filer au panier.",
    points: ["Le panier vit dans le navigateur : il survit à un rechargement, sans imposer de compte."],
    hotspots: [{ selecteur: 'a[href="/panier"]', vers: "panier" }],
  },
  {
    id: "panier",
    parcours: "achat",
    titre: "Panier",
    chemin: "/panier",
    etat: "panierGarni",
    intention: "Laisser corriger les quantités et donner le total avant de s'engager dans la commande.",
    points: ["Capturé avec un vrai produit dedans, ajouté en pilotant le site."],
    hotspots: [{ selecteur: 'a[href="/commande"]', vers: "commande" }],
  },
  {
    id: "commande",
    parcours: "achat",
    titre: "Commande",
    chemin: "/commande",
    etat: "panierGarni",
    intention: "Recueillir livraison et paiement en une page, sans compte obligatoire.",
    points: [
      "Aucune commande n'a été passée pour cette maquette : la capture s'arrête avant l'envoi du formulaire.",
    ],
  },

  // ----------------------------------------------------------------- Compte
  {
    id: "connexion",
    parcours: "compte",
    titre: "Connexion",
    chemin: "/compte/connexion",
    intention: "Retrouver son compte, avec un renvoi visible vers l'inscription et vers le mot de passe oublié.",
    points: [],
  },
  {
    id: "inscription",
    parcours: "compte",
    titre: "Inscription",
    chemin: "/compte/inscription",
    intention: "Créer un compte en demandant le minimum.",
    points: [],
  },
  {
    id: "mot-de-passe-oublie",
    parcours: "compte",
    titre: "Mot de passe oublié",
    chemin: "/compte/mot-de-passe-oublie",
    intention: "Renvoyer un lien de réinitialisation par courriel.",
    points: [],
  },

  // ------------------------------------------------------------ Information
  {
    id: "faq",
    parcours: "information",
    titre: "Questions fréquentes",
    chemin: "/faq",
    intention:
      "Répondre aux freins avant l'achat. Les mêmes réponses alimentent le bloc FAQ de l'accueil — une seule source, deux affichages.",
    points: ["Réponses en accordéon, balisées pour être reprises par les moteurs de réponse."],
  },
  {
    id: "livraison",
    parcours: "information",
    titre: "Livraison",
    chemin: "/livraison",
    intention: "Dire les zones servies, les délais et les frais avant que la question ne bloque la commande.",
    points: [],
  },
  {
    id: "moyens-de-paiement",
    parcours: "information",
    titre: "Moyens de paiement",
    chemin: "/moyens-de-paiement",
    intention: "Rassurer sur le paiement, Mobile Money compris.",
    points: [],
  },
  {
    id: "a-propos",
    parcours: "information",
    titre: "À propos",
    chemin: "/a-propos",
    intention: "Poser l'identité du concept-store et la sélection qu'il revendique.",
    points: [],
  },
  {
    id: "contact",
    parcours: "information",
    titre: "Contact",
    chemin: "/contact",
    intention: "Ouvrir un canal direct, WhatsApp en tête — c'est celui réellement en service.",
    points: [],
  },
  {
    id: "cgv",
    parcours: "information",
    titre: "Conditions générales de vente",
    chemin: "/cgv",
    intention: "Le texte qui engage la société.",
    points: [
      "Plusieurs mentions d'entreprise restent à compléter avant l'ouverture commerciale — voir docs/LEGAL.md.",
    ],
  },
];

/** Les deux tailles capturées. `dsf` = densité de pixels du rendu. */
export const APPAREILS = {
  desktop: { largeur: 1440, hauteur: 900, dsf: 1, libelle: "Ordinateur — 1440 px" },
  mobile: { largeur: 390, hauteur: 844, dsf: 2, libelle: "Mobile — 390 px" },
};

/** Comparatifs avec les maquettes fournies par le client. */
export const COMPARATIFS = [
  {
    ecran: "accueil",
    image: "maquette-client-accueil.jpeg",
    titre: "Sa maquette de l'accueil",
  },
];
