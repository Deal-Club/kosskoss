/**
 * Matière première des avis de démonstration.
 *
 * Ce corpus ne sert QU'À la démonstration : il alimente
 * `scripts/seed-avis-demo.ts`, qui marque chaque avis produit d'une empreinte
 * reconnaissable pour que `scripts/purge-avis-demo.ts` puisse les retirer tous
 * sans en oublier ni toucher à un avis véritable.
 *
 * Il n'a rien à faire sur la base de production : un avis fabriqué présenté à
 * un acheteur relève de la pratique commerciale trompeuse (article L121-4 21°
 * du code de la consommation) et vaut au flux marchand une suspension de
 * compte. Cible prévue : une branche Neon de développement, ou une base locale.
 */

/** Empreinte inscrite dans `moderatorNote`. Sert de clé de suppression. */
export const MARQUEUR_DEMO = "AVIS-DEMO-A-SUPPRIMER";

/** Auteur inscrit dans `moderatedBy`. Second filet pour la purge. */
export const MODERATEUR_DEMO = "demo-seed";

/**
 * Prénoms courants en France, toutes générations confondues : les acheteurs de
 * bois de chauffage vont du primo-accédant au retraité.
 */
export const PRENOMS = [
  "Julien", "Sandrine", "Thierry", "Nathalie", "Christophe", "Valérie", "Sébastien",
  "Isabelle", "Nicolas", "Céline", "Frédéric", "Sophie", "Laurent", "Karine",
  "Olivier", "Aurélie", "Stéphane", "Émilie", "Pascal", "Delphine", "David",
  "Sylvie", "Vincent", "Catherine", "Guillaume", "Martine", "Alexandre", "Patricia",
  "Jean-Marc", "Christine", "Philippe", "Anne", "Bruno", "Corinne", "Damien",
  "Élodie", "Fabrice", "Hélène", "Gérard", "Josiane", "Michel", "Monique",
  "Yannick", "Virginie", "Antoine", "Camille", "Benoît", "Marion", "Cédric",
  "Ludivine", "Xavier", "Amandine", "Grégory", "Charlotte", "Mathieu", "Estelle",
  "Denis", "Françoise", "Serge", "Chantal", "Éric", "Brigitte", "Hervé", "Nadine",
  "Romain", "Laëtitia", "Arnaud", "Sabrina", "Jérôme", "Peggy", "Franck", "Maryse",
];

/** Initiale du nom : l'usage sur les sites d'avis français. */
export const INITIALES = "ABCDEFGHJKLMNPRSTVZ".split("");

/**
 * Villes réparties selon les trois zones de livraison de la boutique :
 * A Paris et petite couronne, B grande couronne et départements limitrophes,
 * C reste de la France par transporteur.
 */
export const VILLES = [
  // Zone A
  "Paris", "Boulogne-Billancourt", "Montreuil", "Saint-Denis", "Vincennes",
  "Nanterre", "Créteil", "Levallois-Perret", "Issy-les-Moulineaux", "Pantin",
  // Zone B
  "Versailles", "Meaux", "Melun", "Pontoise", "Rambouillet", "Fontainebleau",
  "Étampes", "Provins", "Beauvais", "Compiègne", "Chartres", "Dreux", "Senlis",
  "Évry", "Cergy", "Mantes-la-Jolie", "Coulommiers", "Nemours",
  // Zone C
  "Orléans", "Reims", "Rouen", "Tours", "Amiens", "Troyes", "Le Mans", "Auxerre",
  "Blois", "Châteauroux", "Bourges", "Soissons", "Laon", "Nevers", "Sens",
];

/** Une famille de produits, pour choisir le vocabulaire des avis. */
export type Famille = "buches" | "vrac" | "palette" | "granules" | "compressees" | "poele";

interface Bloc {
  /** Ouvertures : la première phrase d'un avis. */
  ouvertures: string[];
  /** Corps : le détail concret, ce qui rend un avis crédible. */
  details: string[];
  /** Fermetures : la conclusion, souvent une intention de rachat. */
  fermetures: string[];
  /** Titres courts. */
  titres: string[];
}

/** Ce que disent les acheteurs satisfaits, par famille de produit. */
export const POSITIFS: Record<Famille, Bloc> = {
  buches: {
    ouvertures: [
      "Bois vraiment sec, ça se voit dès l'ouverture du colis.",
      "Deuxième commande cette année, toujours la même qualité.",
      "Les bûches sont bien fendues et calibrées, aucune n'était trop grosse pour mon insert.",
      "Livraison au jour dit, bois nickel.",
      "J'ai testé l'humidimètre par curiosité : 16 %, conforme à ce qui est annoncé.",
      "Le bois prend feu tout de suite, aucune fumée blanche.",
      "Commande passée un lundi, livrée le jeudi. Rien à redire.",
      "Franchement au-dessus de ce que je trouvais chez mon fournisseur habituel.",
      "Bûches propres, pas de terre ni de moisissure.",
      "Excellent rapport qualité prix pour du bois vraiment sec.",
    ],
    details: [
      "Ça chauffe bien et longtemps, je recharge moins souvent que l'an dernier.",
      "Peu de cendres à vider, une fois par semaine ça suffit.",
      "La flamme est calme, pas d'étincelles qui sautent quand on ouvre la porte.",
      "J'ai rangé sous l'abri, mais franchement j'aurais pu brûler direct.",
      "Le calibrage est régulier, ça se range bien sans perdre de place.",
      "Aucune bûche pourrie dans le lot, c'est assez rare pour le signaler.",
      "L'odeur est agréable, rien à voir avec du bois humide qui siffle.",
      "Bonne tenue en allure réduite le soir, je retrouve des braises le matin.",
      "Mon poêle est propre, la vitre reste claire plusieurs jours.",
      "Le volume annoncé correspond, j'ai vérifié en rangeant.",
    ],
    fermetures: [
      "Je recommanderai sans hésiter l'hiver prochain.",
      "Je recommande.",
      "Très satisfait, je reprends la même chose l'an prochain.",
      "Client conquis.",
      "Rien à redire, je reviendrai.",
      "Merci pour le sérieux.",
      "À conseiller.",
      "",
    ],
    titres: [
      "Bois vraiment sec", "Conforme à la description", "Très bonne qualité",
      "Parfait pour mon insert", "Rien à redire", "Je recommande",
      "Bois de qualité", "Excellent", "Très bon bois", "Satisfait",
      "Bûches bien calibrées", "Chauffe très bien", "",
    ],
  },
  vrac: {
    ouvertures: [
      "Livraison en vrac impeccable, le chauffeur a déposé exactement où je voulais.",
      "Bon rapport quantité prix pour du vrac.",
      "Le camion-grue a fait le travail proprement.",
      "Commande de 4 stères, tout était là.",
      "Le livreur a pris le temps de bien positionner le tas.",
      "Première commande en vrac, plutôt convaincu.",
      "Le volume correspond bien à ce qui est annoncé.",
      "Bois de feuillus corrects, mélange chêne et charme comme indiqué.",
    ],
    details: [
      "Il faut prévoir de la place et du temps pour ranger, mais le prix au stère est intéressant.",
      "Je stocke sous abri jusqu'à l'hiver prochain, comme c'est conseillé.",
      "Bois pas encore sec mais c'est annoncé clairement, aucune surprise.",
      "J'ai mis deux heures à tout rentrer, prévoyez de l'aide.",
      "La grue passe au-dessus du portail sans problème.",
      "Quelques bûches un peu grosses à refendre, rien de méchant.",
      "Le bois est propre, pas de terre mélangée.",
      "Bien calibré à 50 cm, ça rentre dans ma cheminée sans découpe.",
    ],
    fermetures: [
      "Je reprendrai la même quantité l'an prochain.",
      "Bon plan pour qui a la place de stocker.",
      "Je recommande.",
      "Satisfait de l'ensemble.",
      "À refaire.",
      "",
    ],
    titres: [
      "Bonne livraison", "Volume conforme", "Bon rapport qualité prix",
      "Livraison soignée", "Conforme", "Parfait", "Bien reçu", "",
    ],
  },
  palette: {
    ouvertures: [
      "Palette filmée, livrée en bon état par le transporteur.",
      "Très pratique la palette, on range facilement au garage.",
      "Le transporteur a appelé la veille, livraison le lendemain matin.",
      "Palette bien conditionnée, rien n'avait bougé pendant le transport.",
      "Le format palette est parfait quand on n'a pas beaucoup de place.",
      "Deuxième palette commandée, aussi bien que la première.",
      "Bois bien rangé sur la palette, facile à décharger petit à petit.",
    ],
    details: [
      "Les bûches sont bien sèches, ça brûle sans problème.",
      "Je prends une palette par saison, ça me suffit largement.",
      "Le transpalette du livreur a permis de la mettre au fond du garage.",
      "Le film plastique protège bien de l'humidité.",
      "Calibrage régulier, ça se range au millimètre.",
      "Pas de casse ni de bûches tombées à l'arrivée.",
      "Format idéal pour un appartement avec cave.",
    ],
    fermetures: [
      "Je recommande ce format.",
      "Je recommanderai.",
      "Très pratique, je reprends l'an prochain.",
      "Parfait pour mon usage.",
      "",
    ],
    titres: [
      "Format pratique", "Palette bien conditionnée", "Livraison impeccable",
      "Très bien", "Conforme", "Pratique à stocker", "",
    ],
  },
  granules: {
    ouvertures: [
      "Granulés de bonne qualité, très peu de poussière au fond du sac.",
      "Je reprends cette marque depuis deux saisons.",
      "Les sacs sont bien fermés, rien n'a coulé pendant le transport.",
      "Palette livrée le jour annoncé, tout était en bon état.",
      "Bon pouvoir calorifique, mon poêle consomme moins qu'avec l'ancienne marque.",
      "Certification bien réelle, la référence est indiquée sur le sac.",
      "Les granulés sont réguliers, pas de fines.",
      "Rien à redire sur la qualité de combustion.",
    ],
    details: [
      "Très peu de cendres, je vide le bac tous les dix jours environ.",
      "Le creuset reste propre, pas de mâchefer.",
      "Ma consommation a baissé par rapport aux granulés que je prenais avant.",
      "Les sacs de 15 kg sont maniables, même pour ma femme.",
      "La vis sans fin ne bourre pas, les granulés sont bien calibrés.",
      "Aucune odeur désagréable à la combustion.",
      "J'ai la place pour la palette entière au garage, c'est le bon format.",
      "Le taux de cendres annoncé se vérifie à l'usage.",
    ],
    fermetures: [
      "Je recommande cette marque.",
      "Je reprendrai.",
      "Très satisfait.",
      "À conseiller pour un poêle à granulés.",
      "Rien à redire.",
      "",
    ],
    titres: [
      "Très peu de cendres", "Bonne qualité", "Granulés réguliers",
      "Je recommande", "Conforme", "Bon rendement", "Parfait pour mon poêle",
      "Très bons granulés", "",
    ],
  },
  compressees: {
    ouvertures: [
      "Les bûches compressées tiennent vraiment longtemps.",
      "Très pratique en complément du bois classique.",
      "Palette bien filmée, aucune bûche cassée à l'arrivée.",
      "Je les utilise le soir pour tenir la nuit, très efficace.",
      "Bon complément quand on n'a pas envie de recharger sans arrêt.",
      "Densité impressionnante, ça ne ressemble pas à du bois ordinaire.",
    ],
    details: [
      "Une bûche tient facilement trois heures en allure réduite.",
      "Très peu de cendres comparé aux bûches traditionnelles.",
      "Pas de liant, ça se sent, aucune odeur chimique.",
      "Le stockage prend peu de place pour l'énergie qu'on y met.",
      "Attention à ne pas surcharger le foyer, ça chauffe fort.",
      "Je mélange avec du bois classique, le compromis est bon.",
    ],
    fermetures: [
      "Je recommande.",
      "Je reprendrai une palette.",
      "Très bon produit.",
      "Satisfait.",
      "",
    ],
    titres: [
      "Tient longtemps", "Très bon complément", "Forte densité",
      "Peu de cendres", "Conforme", "Efficace", "",
    ],
  },
  poele: {
    ouvertures: [
      "Poêle installé le mois dernier, très content pour l'instant.",
      "Bel objet, la finition est soignée.",
      "Livraison soignée, le poêle était bien protégé.",
      "Chauffe très bien mon salon de 40 m².",
      "Installation faite par un professionnel, aucun souci.",
      "Le rendement annoncé se vérifie à l'usage.",
      "Rapport qualité prix très correct pour cette puissance.",
    ],
    details: [
      "La vitre reste propre grâce au balayage d'air.",
      "Montée en température rapide, en vingt minutes la pièce est chaude.",
      "L'inertie est bonne, il chauffe encore longtemps après extinction.",
      "Le réglage d'air est précis, on tient facilement une allure douce.",
      "Poids conséquent, prévoyez de l'aide pour la mise en place.",
      "La peinture a un peu fumé les premières chauffes, c'est normal.",
      "Consommation raisonnable pour la surface chauffée.",
    ],
    fermetures: [
      "Je recommande.",
      "Très bon achat.",
      "Satisfait de mon achat.",
      "Bon investissement.",
      "",
    ],
    titres: [
      "Très bon poêle", "Belle finition", "Chauffe très bien",
      "Bon rapport qualité prix", "Satisfait", "Conforme à mes attentes", "",
    ],
  },
};

/**
 * Ce que disent les acheteurs mécontents. Un avis négatif crédible porte sur
 * un point précis — un retard, un calibrage, un écart de volume — et non sur
 * un rejet global : c'est ce qui distingue un vrai mécontentement d'un
 * dénigrement de façade.
 */
export const NEGATIFS: Record<Famille, Bloc> = {
  buches: {
    ouvertures: [
      "Bois correct mais livraison décalée de trois jours sans prévenir.",
      "Quelques bûches trop grosses pour mon foyer, j'ai dû refendre.",
      "Le taux d'humidité annoncé n'était pas au rendez-vous sur mon lot.",
      "Déçu par le calibrage, très irrégulier sur cette commande.",
    ],
    details: [
      "Le service client a répondu mais après plusieurs relances.",
      "Sur deux stères, j'ai bien un quart de bûches inutilisables en l'état.",
      "Dommage, la qualité du bois lui-même est correcte.",
      "J'ai dû stocker un mois de plus avant de pouvoir brûler.",
    ],
    fermetures: [
      "Je ne recommanderai pas en l'état.",
      "À revoir.",
      "Décevant pour le prix.",
      "",
    ],
    titres: ["Décevant", "Calibrage irrégulier", "Livraison en retard", "Pas conforme", ""],
  },
  vrac: {
    ouvertures: [
      "Volume livré inférieur à ce que j'avais commandé, à mon avis.",
      "Le chauffeur n'a pas pu accéder chez moi, j'ai dû tout transporter à la brouette.",
      "Beaucoup de petites chutes dans le tas, peu exploitables.",
    ],
    details: [
      "J'ai rangé et compté, je suis loin du compte annoncé.",
      "Aucune information sur les contraintes d'accès avant la livraison.",
      "Le bois était plus humide que ce à quoi je m'attendais.",
    ],
    fermetures: ["Déçu.", "Je ne reprendrai pas en vrac.", "À améliorer.", ""],
    titres: ["Volume discutable", "Accès problématique", "Déçu", ""],
  },
  palette: {
    ouvertures: [
      "Palette arrivée avec le film déchiré, des bûches étaient tombées.",
      "Livraison annoncée le matin, le transporteur est passé à 19 h.",
      "La palette n'a pas pu être déposée où je voulais.",
    ],
    details: [
      "Le transporteur n'avait pas de transpalette, j'ai déchargé à la main.",
      "Le bois lui-même est correct, c'est la livraison qui pose problème.",
      "Personne n'a appelé la veille contrairement à ce qui est annoncé.",
    ],
    fermetures: ["Livraison à revoir.", "Déçu par le transport.", "", ""],
    titres: ["Problème de livraison", "Transport à revoir", "Déçu", ""],
  },
  granules: {
    ouvertures: [
      "Beaucoup de fines au fond des sacs sur cette palette.",
      "Mon poêle s'encrasse plus vite qu'avec ma marque habituelle.",
      "Deux sacs étaient percés à l'arrivée.",
    ],
    details: [
      "Je dois nettoyer le creuset deux fois plus souvent.",
      "La consommation est plus élevée que ce que j'espérais.",
      "Dommage car le prix était intéressant.",
    ],
    fermetures: ["Je reprendrai une autre marque.", "Décevant.", "", ""],
    titres: ["Trop de fines", "Encrassement", "Décevant", ""],
  },
  compressees: {
    ouvertures: [
      "Bûches qui se délitent rapidement, je n'ai pas la tenue annoncée.",
      "Plusieurs bûches cassées dans la palette.",
    ],
    details: [
      "Il faut recharger plus souvent que ce à quoi je m'attendais.",
      "Le stockage doit être vraiment sec sinon elles gonflent.",
    ],
    fermetures: ["Mitigé.", "Pas convaincu.", "", ""],
    titres: ["Tenue décevante", "Mitigé", "Casse au transport", ""],
  },
  poele: {
    ouvertures: [
      "Délai de livraison bien plus long qu'annoncé.",
      "Une pièce manquait dans le carton, il a fallu attendre.",
      "La notice est très sommaire.",
    ],
    details: [
      "Le service après-vente a fini par régler le problème, mais lentement.",
      "L'appareil fonctionne bien, c'est l'accompagnement qui pèche.",
      "Prévoir un installateur, ce n'est pas à la portée de tout le monde.",
    ],
    fermetures: ["Mitigé.", "Produit correct, service à revoir.", "", ""],
    titres: ["Délai trop long", "Pièce manquante", "Mitigé", ""],
  },
};
