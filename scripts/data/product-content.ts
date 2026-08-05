import type { ProductContent } from "../../src/lib/productContent";

/**
 * Contenu rédigé produit par produit, indexé par slug.
 *
 * Chaque GTIN est accompagné en commentaire de la source où il a été relevé :
 * sans source vérifiable, le champ reste absent et le flux bascule
 * automatiquement sur identifier_exists « no ».
 *
 * L'indexation se fait par slug, et non par SKU : `slug` est `@unique` dans
 * `prisma/schema.prisma`, alors que le SKU ne l'est pas — il est dérivé par
 * troncature du slug à 12 caractères alphanumériques dans
 * `scripts/seed-bois-variations.ts` (`skuFromSlug`), ce qui produit des
 * collisions (ex. "bois-palette-30cm" et "bois-palette-33cm" partagent tous
 * deux le SKU "BOISPALETTE3"). Le slug, lui, distingue correctement les
 * 35 produits en base ; c'est donc la clé fiable pour `apply-product-content.ts`.
 */
export const PRODUCT_CONTENT: ProductContent[] = [
  // --- Bûches prêtes à brûler, marque MLC Bois ---
  //
  // Ces quatre fiches partagent le même procédé (séchoir, moins de 18 %
  // d'humidité sur brut) mais pas le même bois : chaque texte part de ce que
  // l'essence apporte réellement au foyer — braise longue pour le chêne, peu
  // de cendres pour le frêne, flamme vive pour le bouleau, régularité pour le
  // hêtre — plutôt que de décliner un gabarit commun.
  {
    slug: "mlc-bois-hetre-pret-a-bruler-25-cm-2-metre-cube",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-PAB-HET-25",
    shortDescription:
      "Bûches de hêtre fendues à 25 cm, séchées en séchoir sous 18 % d'humidité sur brut, livrées par 2 mètres cubes apparents, prêtes à brûler.",
    description:
      "Bûches de hêtre pur, fendues et recoupées à 25 cm, livrées par 2 mètres cubes apparents — soit environ " +
      "1,4 stère une fois le bois empilé. Le lot est déversé à l'endroit que vous indiquez au livreur, sans " +
      "emballage individuel : rien à défaire ni à évacuer après le passage du camion." +
      "\n\n" +
      "Le hêtre compte parmi les feuillus les plus denses employés en chauffage domestique. Il brûle avec une " +
      "flamme calme et régulière, projette très peu d'étincelles et laisse une braise homogène qui tient la " +
      "température entre deux recharges. C'est cette régularité qui en fait le bois le plus polyvalent de la " +
      "gamme : il convient au feu d'agrément en foyer ouvert comme à une chauffe suivie en insert ou en poêle " +
      "à bûches." +
      "\n\n" +
      "Le séchage est conduit en séchoir jusqu'à un taux d'humidité sur brut inférieur à 18 %, mesuré avant " +
      "expédition. À ce niveau, l'évaporation de l'eau ne consomme plus l'essentiel de l'énergie dégagée : le " +
      "pouvoir calorifique atteint environ 2 100 kWh par stère, la vitre de l'appareil reste propre plus " +
      "longtemps et le dépôt de bistre dans le conduit s'en trouve nettement réduit." +
      "\n\n" +
      "La coupe à 25 cm vise les chambres de combustion compactes : petits inserts, poêles à bûches d'appoint, " +
      "foyers de faible profondeur. Une bûche courte se charge plus facilement à plat et laisse davantage de " +
      "place à l'air de combustion autour du chargement." +
      "\n\n" +
      "Livré prêt à brûler, ce bois ne demande aucun séchage complémentaire. Pour qu'il conserve son taux " +
      "d'humidité jusqu'à la flambée, empilez-le sur un support surélevé de quelques centimètres, laissez l'air " +
      "circuler sur les côtés et ne couvrez que le dessus de la pile : une bâche qui descend jusqu'au sol " +
      "enferme l'humidité du terrain et défait le travail du séchoir.",
    descriptionEn:
      "Pure beech logs, split and cut to 25 cm, supplied by the loose cubic metre: this lot holds 2, about " +
      "1.4 stère once stacked (one loose cubic metre equals roughly 0.7 stère, the French unit for stacked " +
      "wood). The load is tipped where you direct the driver, with no individual packaging: nothing to unwrap " +
      "and nothing to dispose of once the truck has left." +
      "\n\n" +
      "Beech is among the densest hardwoods used for domestic heating. It burns with a calm, steady flame, " +
      "throws very few sparks and leaves an even bed of embers that holds the temperature between reloads. " +
      "That steadiness makes it the most versatile wood in the range: it suits an open fire as readily as " +
      "sustained heating in an insert or a log stove." +
      "\n\n" +
      "Drying is carried out in a kiln down to a moisture content on a wet basis below 18%, measured before " +
      "dispatch. At that level, evaporating water no longer absorbs most of the energy released: the calorific " +
      "value reaches about 2,100 kWh per stère, the appliance glass stays clear for longer and creosote " +
      "build-up in the flue is markedly reduced." +
      "\n\n" +
      "The 25 cm cut is aimed at compact fireboxes: small inserts, secondary log stoves, shallow hearths. " +
      "A short log is easier to load flat and leaves more room for combustion air around the charge." +
      "\n\n" +
      "Delivered ready to burn, this wood needs no further seasoning. To keep it at that moisture level until " +
      "it reaches the fire, stack it on a support raised a few centimetres off the ground, let air move along " +
      "the sides and cover only the top of the pile: a sheet running down to the ground traps moisture rising " +
      "from the soil and undoes the work of the kiln.",
    shortDescriptionEn:
      "Beech logs split to 25 cm, kiln dried below 18% moisture on a wet basis, supplied in 2 loose cubic metres, ready to burn.",
    bullets: [
      "Produit : Bûches de bois de chauffage prêtes à brûler",
      "Type de produit : Bûches fendues séchées en séchoir",
      "Composition : Hêtre",
      "Conditionnement : Vrac, déversé à l'endroit indiqué au livreur",
      "Quantité : 2 mètres cubes apparents, soit environ 1,4 stère",
      "Taille : Bûches fendues de 25 cm",
      "Taux d'humidité : Inférieur à 18 % sur brut, contrôlé avant expédition",
      "Pouvoir calorifique : Environ 2 100 kWh par stère",
      "Appareils compatibles : Foyers ouverts, inserts et poêles à bûches à chambre compacte",
      "Utilisation recommandée : Prêt à brûler dès la livraison, sans séchage complémentaire",
      "Stockage conseillé : Pile surélevée et ventilée, couverte sur le dessus uniquement",
    ],
    bulletsEn: [
      "Product: Firewood logs, ready to burn",
      "Product type: Split logs, kiln dried",
      "Composition: Beech",
      "Packaging: Loose, tipped where you direct the driver",
      "Quantity: 2 loose cubic metres, about 1.4 stère",
      "Size: Split logs, 25 cm",
      "Moisture content: Below 18% on a wet basis, checked before dispatch",
      "Calorific value: About 2,100 kWh per stère",
      "Suitable appliances: Open fires, inserts and log stoves with a compact firebox",
      "Recommended use: Ready to burn on delivery, no further seasoning needed",
      "Storage: Raised, ventilated stack, covered on top only",
    ],
  },
  {
    slug: "mlc-bois-chene-pret-a-bruler-50-cm-2-metre-cube",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-PAB-CHE-50",
    shortDescription:
      "Bûches de chêne fendues à 50 cm, séchées sous 18 % d'humidité sur brut, à braise longue, livrées par 2 mètres cubes apparents.",
    description:
      "Bûches de chêne fendues à 50 cm, livrées par 2 mètres cubes apparents, soit environ 1,4 stère de bois " +
      "empilé. Le bois arrive en vrac et se dépose à l'endroit indiqué au livreur ; aucun emballage n'est à " +
      "retirer avant de commencer à empiler." +
      "\n\n" +
      "Le chêne est le bois de fond de feu par excellence. Sa densité élevée lui donne une combustion lente et " +
      "surtout une phase de braise nettement plus longue que celle des autres feuillus : un chargement tient la " +
      "chauffe pendant une durée que peu d'essences égalent, et il n'est pas rare de retrouver des braises " +
      "vives au matin dans un appareil bien réglé. C'est le bois à privilégier pour une chauffe continue plutôt " +
      "que pour une flambée d'agrément ; il gagne à être allumé avec quelques bûches d'une essence plus vive, " +
      "qui montent le foyer en température plus vite." +
      "\n\n" +
      "Le chêne est aussi l'essence la plus longue à sécher à l'air libre, où deux ans ne suffisent pas " +
      "toujours. Celui-ci passe au séchoir jusqu'à un taux d'humidité sur brut inférieur à 18 %, contrôlé avant " +
      "expédition : le bois est utilisable dès la livraison, sans les mois d'attente qu'exigerait un chêne " +
      "fraîchement fendu. À ce taux, le pouvoir calorifique atteint environ 2 100 kWh par stère." +
      "\n\n" +
      "La coupe à 50 cm s'adresse aux appareils à grande chambre de combustion et aux cheminées de belle " +
      "profondeur. Les bûches longues réduisent le nombre de recharges sur une soirée et se manipulent en " +
      "moins de gestes, à volume de bois égal." +
      "\n\n" +
      "Stockez la pile à l'abri de la pluie, surélevée du sol et ouverte à l'air sur les côtés, en ne " +
      "protégeant que le dessus. Ce bois étant déjà sec, la question n'est plus de le sécher mais de " +
      "l'empêcher de reprendre l'humidité qu'il a perdue au séchoir.",
    descriptionEn:
      "Oak logs split to 50 cm, supplied by the loose cubic metre: this lot holds 2, about 1.4 stère once " +
      "stacked (one loose cubic metre equals roughly 0.7 stère, the French unit for stacked wood). The wood " +
      "arrives loose and is tipped where you direct the driver; there is no packaging to remove before you " +
      "start stacking." +
      "\n\n" +
      "Oak is the base-load firewood par excellence. Its high density gives it a slow burn and, above all, an " +
      "ember phase noticeably longer than that of other hardwoods: one charge holds the heat for a stretch few " +
      "species can match, and it is common to find live embers the next morning in a well-adjusted appliance. " +
      "This is the wood to choose for sustained heating rather than for a decorative blaze; it benefits from " +
      "being lit alongside a few logs of a livelier species, which bring the firebox up to temperature faster." +
      "\n\n" +
      "Oak is also the slowest species to season in the open air, where two years are not always enough. This " +
      "wood goes through a kiln to a moisture content on a wet basis below 18%, checked before dispatch: it can " +
      "be used from the day it arrives, without the months of waiting that freshly split oak would demand. At " +
      "that moisture level, the calorific value reaches about 2,100 kWh per stère." +
      "\n\n" +
      "The 50 cm cut is aimed at appliances with a large firebox and at deep fireplaces. Long logs cut down the " +
      "number of reloads over an evening and take fewer movements to handle for the same volume of wood." +
      "\n\n" +
      "Store the stack out of the rain, raised off the ground and open to the air along the sides, covering the " +
      "top only. As this wood is already dry, the point is no longer to season it but to stop it taking back " +
      "the moisture the kiln removed.",
    shortDescriptionEn:
      "Oak logs split to 50 cm, kiln dried below 18% moisture on a wet basis, long ember phase, supplied in 2 loose cubic metres.",
    bullets: [
      "Produit : Bûches de bois de chauffage prêtes à brûler",
      "Type de produit : Bûches fendues séchées en séchoir",
      "Composition : Chêne",
      "Conditionnement : Vrac, déversé à l'endroit indiqué au livreur",
      "Quantité : 2 mètres cubes apparents, soit environ 1,4 stère",
      "Taille : Bûches fendues de 50 cm",
      "Taux d'humidité : Inférieur à 18 % sur brut, contrôlé avant expédition",
      "Pouvoir calorifique : Environ 2 100 kWh par stère",
      "Appareils compatibles : Inserts, poêles à bûches et cheminées à grande chambre de combustion",
      "Utilisation recommandée : Chauffe continue et feu de fond, prêt à brûler dès la livraison",
      "Stockage conseillé : Pile surélevée et ventilée, couverte sur le dessus uniquement",
    ],
    bulletsEn: [
      "Product: Firewood logs, ready to burn",
      "Product type: Split logs, kiln dried",
      "Composition: Oak",
      "Packaging: Loose, tipped where you direct the driver",
      "Quantity: 2 loose cubic metres, about 1.4 stère",
      "Size: Split logs, 50 cm",
      "Moisture content: Below 18% on a wet basis, checked before dispatch",
      "Calorific value: About 2,100 kWh per stère",
      "Suitable appliances: Inserts, log stoves and fireplaces with a large firebox",
      "Recommended use: Sustained heating and base-load fires, ready to burn on delivery",
      "Storage: Raised, ventilated stack, covered on top only",
    ],
  },
  {
    slug: "mlc-bois-bouleau-pret-a-bruler-25-cm-2-3-metre-cube",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-PAB-BOU-25",
    shortDescription:
      "Bûches de bouleau fendues à 25 cm, séchées sous 18 % d'humidité sur brut, à flamme claire, livrées par 2,3 mètres cubes apparents.",
    description:
      "Bûches de bouleau fendues à 25 cm, livrées par 2,3 mètres cubes apparents, soit environ 1,6 stère de " +
      "bois empilé — le volume le plus généreux des formats courts de la gamme. Livraison en vrac, déversée à " +
      "l'endroit que vous indiquez au livreur." +
      "\n\n" +
      "Le bouleau se distingue nettement des feuillus lourds. Son bois clair, à l'écorce blanche " +
      "caractéristique, s'enflamme vite et donne une flamme haute et lumineuse, accompagnée d'un parfum que " +
      "beaucoup recherchent en foyer ouvert. La contrepartie de cette vivacité est une combustion plus rapide " +
      "et une braise moins durable que celle du chêne ou du hêtre : le bouleau se comporte moins en bois de " +
      "fond de feu qu'en bois de montée en température et de mi-saison, quand on cherche une chauffe franche " +
      "sans faire tourner l'appareil toute la journée." +
      "\n\n" +
      "Cette densité plus faible se lit dans le rendement : à moins de 18 % d'humidité sur brut, le pouvoir " +
      "calorifique s'établit autour de 1 900 kWh par stère, soit un peu en retrait des feuillus les plus " +
      "denses. Le séchage est réalisé en séchoir et le taux vérifié avant expédition, si bien que le bois " +
      "s'allume sans difficulté dès la livraison." +
      "\n\n" +
      "La longueur de 25 cm convient aux foyers et poêles à chambre de combustion compacte. Beaucoup " +
      "d'utilisateurs associent ce bouleau à une essence plus dense : les bûches claires lancent le feu et " +
      "montent la température, les bûches lourdes prennent ensuite le relais pour la durée." +
      "\n\n" +
      "Le bouleau reprend l'humidité plus vite que les bois denses : abritez-le dès la livraison. Une pile " +
      "surélevée, aérée sur les côtés et couverte seulement en partie haute conserve le bénéfice du séchoir " +
      "jusqu'à la flambée.",
    descriptionEn:
      "Birch logs split to 25 cm, supplied by the loose cubic metre: this lot holds 2.3, about 1.6 stère once " +
      "stacked (one loose cubic metre equals roughly 0.7 stère, the French unit for stacked wood) — the most " +
      "generous volume among the short formats in the range. Delivered loose and tipped where you direct the " +
      "driver." +
      "\n\n" +
      "Birch stands clearly apart from the heavy hardwoods. Its pale wood, with its distinctive white bark, " +
      "catches quickly and gives a tall, bright flame along with a scent many people look for in an open fire. " +
      "The flip side of that liveliness is a faster burn and a shorter-lived ember bed than oak or beech: " +
      "birch behaves less as a base-load fuel than as a wood for bringing a fire up to temperature and for " +
      "the shoulder seasons, when you want a brisk heat without running the appliance all day." +
      "\n\n" +
      "That lower density shows in the output: below 18% moisture on a wet basis, the calorific value settles " +
      "at around 1,900 kWh per stère, slightly behind the densest hardwoods. Drying is done in a kiln and the " +
      "moisture level checked before dispatch, so the wood lights readily from the day it arrives." +
      "\n\n" +
      "The 25 cm length suits fireplaces and stoves with a compact firebox. Many people pair this birch with a " +
      "denser species: the pale logs start the fire and raise the temperature, the heavy logs then take over " +
      "for duration." +
      "\n\n" +
      "Birch takes moisture back faster than dense woods, so shelter it as soon as it arrives. A raised stack, " +
      "open to the air along the sides and covered only across the top, preserves the benefit of the kiln " +
      "right up to the fire.",
    shortDescriptionEn:
      "Birch logs split to 25 cm, kiln dried below 18% moisture on a wet basis, bright flame, supplied in 2.3 loose cubic metres.",
    bullets: [
      "Produit : Bûches de bois de chauffage prêtes à brûler",
      "Type de produit : Bûches fendues séchées en séchoir",
      "Composition : Bouleau",
      "Conditionnement : Vrac, déversé à l'endroit indiqué au livreur",
      "Quantité : 2,3 mètres cubes apparents, soit environ 1,6 stère",
      "Taille : Bûches fendues de 25 cm",
      "Taux d'humidité : Inférieur à 18 % sur brut, contrôlé avant expédition",
      "Pouvoir calorifique : Environ 1 900 kWh par stère",
      "Appareils compatibles : Foyers ouverts, inserts et poêles à bûches à chambre compacte",
      "Utilisation recommandée : Allumage, montée en température et chauffe de mi-saison",
      "Stockage conseillé : Pile surélevée et ventilée, couverte sur le dessus uniquement",
    ],
    bulletsEn: [
      "Product: Firewood logs, ready to burn",
      "Product type: Split logs, kiln dried",
      "Composition: Birch",
      "Packaging: Loose, tipped where you direct the driver",
      "Quantity: 2.3 loose cubic metres, about 1.6 stère",
      "Size: Split logs, 25 cm",
      "Moisture content: Below 18% on a wet basis, checked before dispatch",
      "Calorific value: About 1,900 kWh per stère",
      "Suitable appliances: Open fires, inserts and log stoves with a compact firebox",
      "Recommended use: Lighting, bringing a fire up to temperature, shoulder-season heating",
      "Storage: Raised, ventilated stack, covered on top only",
    ],
  },
  {
    slug: "mlc-bois-frene-pret-a-bruler-50-cm-2-5-metre-cube",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-PAB-FRE-50",
    shortDescription:
      "Bûches de frêne fendues à 50 cm, séchées sous 18 % d'humidité sur brut, combustion peu cendreuse, livrées par 2,5 mètres cubes apparents.",
    description:
      "Bûches de frêne fendues à 50 cm, livrées par 2,5 mètres cubes apparents, soit environ 1,75 stère de bois " +
      "empilé : c'est le volume le plus important de la gamme prête à brûler, pour une saison de chauffe " +
      "couverte en une seule livraison. Le bois est déversé en vrac à l'emplacement indiqué au livreur." +
      "\n\n" +
      "Le frêne est apprécié pour une raison très concrète : il encrasse peu. Sa combustion laisse " +
      "sensiblement moins de résidus que la plupart des feuillus, ce qui espace les vidages de cendrier et " +
      "allège l'entretien courant du foyer — un critère qui compte quand l'appareil tourne tous les jours. La " +
      "flamme, elle, est calme et régulière, sans crépitement marqué ni projection." +
      "\n\n" +
      "C'est aussi un bois dense, qui figure au même rang que le chêne et le hêtre pour le rendement : séché " +
      "en séchoir sous 18 % d'humidité sur brut, taux vérifié avant expédition, il dégage environ 2 100 kWh " +
      "par stère. Il combine donc la tenue en chauffe des feuillus lourds et un allumage plus facile que le " +
      "chêne, ce qui en fait un bois d'usage quotidien sans contrainte particulière." +
      "\n\n" +
      "La coupe à 50 cm demande une chambre de combustion profonde : inserts de grande largeur, poêles à " +
      "bûches de forte puissance, cheminées à foyer ouvert. Vérifiez la profondeur utile de votre appareil " +
      "avant de retenir ce format ; sur une chambre courte, une bûche de 50 cm ne se charge pas correctement." +
      "\n\n" +
      "Aucun séchage complémentaire n'est nécessaire. Prévoyez simplement un emplacement couvert et ventilé " +
      "pour 2,5 mètres cubes apparents, sur support surélevé, avec une protection limitée au dessus de la pile " +
      "pour que l'air continue de circuler entre les bûches.",
    descriptionEn:
      "Ash logs split to 50 cm, supplied by the loose cubic metre: this lot holds 2.5, about 1.75 stère once " +
      "stacked (one loose cubic metre equals roughly 0.7 stère, the French unit for stacked wood). It is the " +
      "largest volume in the ready-to-burn range, covering a heating season in a single delivery. The wood is " +
      "tipped loose at the spot you show the driver." +
      "\n\n" +
      "Ash is valued for a very practical reason: it fouls the appliance little. Its combustion leaves " +
      "appreciably less residue than most hardwoods, which spaces out ash-pan emptying and lightens routine " +
      "firebox maintenance — something that counts when the appliance runs every day. The flame itself is calm " +
      "and steady, without marked crackling or spitting." +
      "\n\n" +
      "It is also a dense wood, on a par with oak and beech for output: kiln dried below 18% moisture on a wet " +
      "basis, checked before dispatch, it releases about 2,100 kWh per stère. It therefore combines the " +
      "staying power of the heavy hardwoods with easier lighting than oak, which makes it an everyday wood " +
      "with no particular constraints." +
      "\n\n" +
      "The 50 cm cut calls for a deep firebox: wide inserts, high-output log stoves, open fireplaces. Check " +
      "the usable depth of your appliance before settling on this format; in a short firebox, a 50 cm log will " +
      "not load properly." +
      "\n\n" +
      "No further seasoning is required. Simply plan a covered, ventilated spot for 2.5 loose cubic metres, on " +
      "a raised support, with cover limited to the top of the stack so that air keeps moving between the logs.",
    shortDescriptionEn:
      "Ash logs split to 50 cm, kiln dried below 18% moisture on a wet basis, low-residue burn, supplied in 2.5 loose cubic metres.",
    bullets: [
      "Produit : Bûches de bois de chauffage prêtes à brûler",
      "Type de produit : Bûches fendues séchées en séchoir",
      "Composition : Frêne",
      "Conditionnement : Vrac, déversé à l'endroit indiqué au livreur",
      "Quantité : 2,5 mètres cubes apparents, soit environ 1,75 stère",
      "Taille : Bûches fendues de 50 cm",
      "Taux d'humidité : Inférieur à 18 % sur brut, contrôlé avant expédition",
      "Pouvoir calorifique : Environ 2 100 kWh par stère",
      "Appareils compatibles : Inserts, poêles à bûches et cheminées à grande chambre de combustion",
      "Utilisation recommandée : Chauffe quotidienne, avec entretien de foyer réduit",
      "Stockage conseillé : Pile surélevée et ventilée, couverte sur le dessus uniquement",
    ],
    bulletsEn: [
      "Product: Firewood logs, ready to burn",
      "Product type: Split logs, kiln dried",
      "Composition: Ash",
      "Packaging: Loose, tipped where you direct the driver",
      "Quantity: 2.5 loose cubic metres, about 1.75 stère",
      "Size: Split logs, 50 cm",
      "Moisture content: Below 18% on a wet basis, checked before dispatch",
      "Calorific value: About 2,100 kWh per stère",
      "Suitable appliances: Inserts, log stoves and fireplaces with a large firebox",
      "Recommended use: Everyday heating, with reduced firebox maintenance",
      "Storage: Raised, ventilated stack, covered on top only",
    ],
  },

  // --- Bois en vrac ---
  //
  // Même mélange de feuillus et même taux d'humidité sur les trois longueurs :
  // ce qui les sépare est l'appareil visé et la manutention. Chaque fiche est
  // donc écrite depuis cet angle — grands foyers pour le 50 cm, standard du
  // marché pour le 33 cm, chambres compactes pour le 25 cm.
  {
    slug: "bois-vrac-50cm",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-VRAC-50",
    shortDescription:
      "Bûches de feuillus durs — chêne, charme et hêtre — de 50 cm, livrées en vrac par camion-grue, humidité autour de 30 %, de 1 à 6 stères.",
    description:
      "Bois de chauffage en bûches de 50 cm, issu d'un mélange de feuillus durs : chêne, charme et hêtre. Le " +
      "bois est vendu au stère, de 1 à 6 stères selon le volume retenu, et livré en vrac par camion-grue qui " +
      "le dépose au sol à l'endroit convenu. Aucun emballage, aucune palette à retourner : c'est la formule la " +
      "plus économique au stère, en échange du temps d'empilage." +
      "\n\n" +
      "Les trois essences ont été retenues pour leur densité. Le chêne apporte la braise longue et la tenue en " +
      "fin de flambée, le charme une combustion lente et une chaleur soutenue, le hêtre une flamme calme et " +
      "régulière. Le mélange donne un feu équilibré, sans les à-coups d'un bois trop tendre." +
      "\n\n" +
      "L'humidité se situe autour de 30 %. C'est un bois mi-sec, et non un bois prêt à brûler : il demande un " +
      "temps de stockage à l'abri avant d'être utilisé en foyer fermé, le temps de descendre sous les 20 % " +
      "recommandés pour une combustion propre. Brûlé trop tôt, il chauffe moins, noircit la vitre et encrasse " +
      "le conduit. C'est la contrepartie assumée d'un tarif au stère inférieur à celui du bois séché en " +
      "séchoir, pour qui achète à l'avance et dispose de la place pour laisser sécher." +
      "\n\n" +
      "La longueur de 50 cm s'adresse aux cheminées à foyer ouvert et aux inserts à grande chambre de " +
      "combustion. À volume égal, une bûche longue se manipule en moins de gestes et espace les recharges ; " +
      "en revanche elle ne passe pas dans un appareil compact, dont la profondeur utile dépasse rarement " +
      "35 cm." +
      "\n\n" +
      "Prévoyez un accès dégagé pour le camion et une aire de dépose stable, ainsi que l'espace de stockage " +
      "correspondant au volume commandé. Empilez le bois surélevé de quelques centimètres, à distance des " +
      "murs pour laisser l'air circuler, et ne couvrez que le dessus de la pile : une bâche descendue jusqu'au " +
      "sol empêcherait l'humidité de s'évacuer.",
    descriptionEn:
      "Firewood in 50 cm logs, from a mix of dense hardwoods: oak, hornbeam and beech. The wood is sold by the " +
      "stère (the French unit for stacked wood, roughly 0.7 m³), from 1 to 6 stères depending on the volume " +
      "chosen, and delivered loose by crane truck, which sets it down at the agreed spot. No packaging and no " +
      "pallet to return: this is the most economical option per stère, in exchange for the time spent " +
      "stacking." +
      "\n\n" +
      "The three species were chosen for their density. Oak brings the long ember phase and the staying power " +
      "at the end of a burn, hornbeam a slow combustion and sustained heat, beech a calm and regular flame. " +
      "The mix gives a balanced fire, without the surges of a softer wood." +
      "\n\n" +
      "Moisture content sits around 30%. This is part-seasoned wood, not ready-to-burn wood: it needs a period " +
      "of covered storage before use in a closed firebox, long enough to fall below the 20% recommended for " +
      "clean combustion. Burnt too early, it gives less heat, blackens the glass and fouls the flue. That is " +
      "the accepted trade-off behind a price per stère lower than kiln-dried wood, for anyone buying ahead " +
      "with the space to let it season." +
      "\n\n" +
      "The 50 cm length is aimed at open fireplaces and inserts with a large firebox. For the same volume, a " +
      "long log takes fewer movements to handle and spaces out reloads; it will not, however, fit a compact " +
      "appliance, whose usable depth rarely exceeds 35 cm." +
      "\n\n" +
      "Allow clear access for the truck and a stable unloading area, along with storage space matching the " +
      "volume ordered. Stack the wood raised a few centimetres off the ground, away from walls so air can " +
      "circulate, and cover only the top of the pile: a sheet taken down to the ground would stop the moisture " +
      "escaping.",
    shortDescriptionEn:
      "Loose-tipped hardwood logs — oak, hornbeam, beech — 50 cm, delivered by crane truck, about 30% moisture, 1 to 6 stères.",
    bullets: [
      "Produit : Bois de chauffage en bûches",
      "Type de produit : Bûches de feuillus durs, livrées en vrac",
      "Composition : Chêne, charme et hêtre",
      "Conditionnement : Vrac sans emballage, déversé au sol par camion-grue",
      "Quantité : De 1 à 6 stères selon la variante retenue",
      "Taille : Bûches coupées à 50 cm",
      "Taux d'humidité : Environ 30 %, bois mi-sec",
      "Appareils compatibles : Cheminées à foyer ouvert et inserts à grande chambre de combustion",
      "Utilisation recommandée : Séchage complémentaire à l'abri avant usage en foyer fermé",
      "Stockage conseillé : Pile surélevée et ventilée, couverte sur le dessus uniquement",
    ],
    bulletsEn: [
      "Product: Firewood logs",
      "Product type: Dense hardwood logs, delivered loose",
      "Composition: Oak, hornbeam and beech",
      "Packaging: Loose and unpackaged, tipped on the ground by crane truck",
      "Quantity: 1 to 6 stères depending on the option chosen",
      "Size: Logs cut to 50 cm",
      "Moisture content: Around 30%, part-seasoned wood",
      "Suitable appliances: Open fireplaces and inserts with a large firebox",
      "Recommended use: Further covered seasoning before use in a closed firebox",
      "Storage: Raised, ventilated stack, covered on top only",
    ],
  },
  {
    slug: "bois-vrac-33cm",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-VRAC-33",
    shortDescription:
      "Bûches de feuillus durs — chêne, charme et hêtre — de 33 cm, livrées en vrac par camion-grue, humidité autour de 30 %, de 1 à 7 stères.",
    description:
      "Bois de chauffage en bûches de 33 cm, coupé dans un mélange de feuillus durs — chêne, charme et hêtre — " +
      "et livré en vrac, sans conditionnement. Le volume se choisit de 1 à 7 stères, la livraison s'effectuant " +
      "par camion-grue qui dépose le bois au sol à l'emplacement indiqué." +
      "\n\n" +
      "Le 33 cm est le format le plus répandu du marché français, et celui qui pose le moins de questions de " +
      "compatibilité : la grande majorité des inserts et des poêles à bûches vendus en France acceptent cette " +
      "longueur, souvent chargée à l'horizontale comme à la verticale selon la forme du foyer. Si vous ne " +
      "connaissez pas la profondeur utile de votre appareil, c'est la longueur qui présente le moins de " +
      "risques." +
      "\n\n" +
      "Le mélange associe trois essences denses. Le chêne assure le fond de feu et la braise, le charme " +
      "prolonge la chauffe, le hêtre donne une flamme régulière et facile à conduire. Aucune essence tendre " +
      "n'entre dans le mélange : le rendement reste homogène d'une bûche à l'autre." +
      "\n\n" +
      "L'humidité se situe autour de 30 %, ce qui correspond à un bois mi-sec. Il doit être stocké à l'abri " +
      "avant d'être brûlé en foyer fermé, jusqu'à passer sous les 20 % communément recommandés. Un contrôle au " +
      "testeur d'humidité, sur une bûche fendue en deux et mesurée au cœur, donne la réponse en quelques " +
      "secondes et évite de charger l'appareil trop tôt." +
      "\n\n" +
      "La livraison suppose un accès dégagé et une aire de dépose stable, ainsi qu'un espace de stockage " +
      "disponible : le bois arrive en tas et c'est à vous de l'empiler. Comptez une bonne heure à deux " +
      "personnes pour 2 stères. Une pile surélevée, aérée sur les côtés et couverte uniquement en partie haute " +
      "assure la poursuite du séchage.",
    descriptionEn:
      "Firewood in 33 cm logs, cut from a mix of dense hardwoods — oak, hornbeam and beech — and delivered " +
      "loose, with no packaging. Volume can be chosen from 1 to 7 stères (the French unit for stacked wood, " +
      "roughly 0.7 m³ each), with delivery by crane truck, which sets the wood down at the spot you indicate." +
      "\n\n" +
      "33 cm is the most widespread format on the French market, and the one that raises the fewest " +
      "compatibility questions: the great majority of inserts and log stoves sold in France take this length, " +
      "often loaded either flat or upright depending on the shape of the firebox. If you do not know the " +
      "usable depth of your appliance, this is the least risky length to choose." +
      "\n\n" +
      "The mix brings together three dense species. Oak provides the base of the fire and the embers, hornbeam " +
      "extends the burn, beech gives a steady flame that is easy to control. No soft species goes into the " +
      "mix: output stays consistent from one log to the next." +
      "\n\n" +
      "Moisture content sits around 30%, which corresponds to part-seasoned wood. It should be stored under " +
      "cover before being burnt in a closed firebox, until it drops below the 20% commonly recommended. A " +
      "check with a moisture meter, on a log split in two and measured at the core, gives the answer in " +
      "seconds and avoids loading the appliance too early." +
      "\n\n" +
      "Delivery requires clear access and a stable unloading area, as well as available storage space: the " +
      "wood arrives in a heap and it is up to you to stack it. Allow a good hour with two people for 2 stères. " +
      "A raised stack, open to the air along the sides and covered across the top only, lets the seasoning " +
      "continue.",
    shortDescriptionEn:
      "Loose-tipped hardwood logs — oak, hornbeam, beech — 33 cm, delivered by crane truck, about 30% moisture, 1 to 7 stères.",
    bullets: [
      "Produit : Bois de chauffage en bûches",
      "Type de produit : Bûches de feuillus durs, livrées en vrac",
      "Composition : Chêne, charme et hêtre",
      "Conditionnement : Vrac sans emballage, déversé au sol par camion-grue",
      "Quantité : De 1 à 7 stères selon la variante retenue",
      "Taille : Bûches coupées à 33 cm",
      "Taux d'humidité : Environ 30 %, bois mi-sec",
      "Appareils compatibles : La plupart des inserts et poêles à bûches du marché",
      "Utilisation recommandée : Séchage complémentaire à l'abri avant usage en foyer fermé",
      "Stockage conseillé : Pile surélevée et ventilée, couverte sur le dessus uniquement",
    ],
    bulletsEn: [
      "Product: Firewood logs",
      "Product type: Dense hardwood logs, delivered loose",
      "Composition: Oak, hornbeam and beech",
      "Packaging: Loose and unpackaged, tipped on the ground by crane truck",
      "Quantity: 1 to 7 stères depending on the option chosen",
      "Size: Logs cut to 33 cm",
      "Moisture content: Around 30%, part-seasoned wood",
      "Suitable appliances: Most inserts and log stoves on the market",
      "Recommended use: Further covered seasoning before use in a closed firebox",
      "Storage: Raised, ventilated stack, covered on top only",
    ],
  },
  {
    slug: "bois-vrac-25cm",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-VRAC-25",
    shortDescription:
      "Bûches de feuillus durs — chêne, charme et hêtre — de 25 cm, livrées en vrac par camion-grue, humidité autour de 30 %, de 1 à 7 stères.",
    description:
      "Bois de chauffage en bûches courtes de 25 cm, issu d'un mélange de feuillus durs : chêne, charme et " +
      "hêtre. Livraison en vrac par camion-grue, qui dépose le bois au sol sans conditionnement ; le volume se " +
      "choisit de 1 à 7 stères." +
      "\n\n" +
      "C'est la longueur des chambres de combustion compactes : petits inserts, poêles à bûches d'appoint, " +
      "foyers peu profonds, appareils de faible puissance installés dans un logement bien isolé. Une bûche de " +
      "25 cm laisse de la place autour du chargement pour l'air de combustion, ce qui aide à monter en " +
      "température et à tenir un feu propre dans un petit volume de foyer." +
      "\n\n" +
      "Le format court a un autre avantage, moins souvent cité : la manutention. Les bûches sont plus légères " +
      "à l'unité, s'empilent plus régulièrement et se rangent dans des espaces où une bûche de 50 cm ne " +
      "passerait pas — cave étroite, sous-escalier, coffre à bois d'intérieur. Il sèche aussi un peu plus vite " +
      "qu'un format long, la surface exposée étant proportionnellement plus grande." +
      "\n\n" +
      "Le mélange est composé d'essences denses uniquement : chêne pour la braise et la tenue, charme pour la " +
      "chauffe lente, hêtre pour la régularité de la flamme. L'humidité tourne autour de 30 %, celle d'un bois " +
      "mi-sec : un temps de stockage à l'abri reste nécessaire avant utilisation en foyer fermé, l'objectif " +
      "étant de descendre sous 20 % avant de charger l'appareil." +
      "\n\n" +
      "Prévoyez un accès dégagé pour le camion, une aire de dépose stable et la place de stocker le volume " +
      "commandé. Le bois arrive en tas ; empilez-le surélevé de quelques centimètres, en laissant l'air " +
      "circuler sur les côtés, et ne couvrez que le dessus de la pile.",
    descriptionEn:
      "Firewood in short 25 cm logs, from a mix of dense hardwoods: oak, hornbeam and beech. Delivered loose " +
      "by crane truck, which sets the wood down on the ground with no packaging; volume can be chosen from 1 " +
      "to 7 stères (the French unit for stacked wood, roughly 0.7 m³ each)." +
      "\n\n" +
      "This is the length for compact fireboxes: small inserts, secondary log stoves, shallow hearths, " +
      "low-output appliances fitted in a well-insulated home. A 25 cm log leaves room around the charge for " +
      "combustion air, which helps bring the fire up to temperature and keep it clean in a small firebox." +
      "\n\n" +
      "The short format has another advantage, less often mentioned: handling. The logs are lighter " +
      "individually, stack more evenly and fit into spaces a 50 cm log never would — a narrow cellar, an " +
      "under-stair recess, an indoor log box. It also seasons a little faster than a long format, since the " +
      "exposed surface is proportionally greater." +
      "\n\n" +
      "The mix contains dense species only: oak for embers and staying power, hornbeam for a slow burn, beech " +
      "for a steady flame. Moisture content is around 30%, that of part-seasoned wood: a period of covered " +
      "storage is still needed before use in a closed firebox, the aim being to fall below 20% before loading " +
      "the appliance." +
      "\n\n" +
      "Allow clear access for the truck, a stable unloading area and room to store the volume ordered. The " +
      "wood arrives in a heap; stack it raised a few centimetres off the ground, leaving air to circulate " +
      "along the sides, and cover only the top of the pile.",
    shortDescriptionEn:
      "Loose-tipped hardwood logs — oak, hornbeam, beech — 25 cm, delivered by crane truck, about 30% moisture, 1 to 7 stères.",
    bullets: [
      "Produit : Bois de chauffage en bûches",
      "Type de produit : Bûches de feuillus durs, livrées en vrac",
      "Composition : Chêne, charme et hêtre",
      "Conditionnement : Vrac sans emballage, déversé au sol par camion-grue",
      "Quantité : De 1 à 7 stères selon la variante retenue",
      "Taille : Bûches coupées à 25 cm",
      "Taux d'humidité : Environ 30 %, bois mi-sec",
      "Appareils compatibles : Foyers et poêles à bûches à chambre de combustion compacte",
      "Utilisation recommandée : Séchage complémentaire à l'abri avant usage en foyer fermé",
      "Stockage conseillé : Pile surélevée et ventilée, couverte sur le dessus uniquement",
    ],
    bulletsEn: [
      "Product: Firewood logs",
      "Product type: Dense hardwood logs, delivered loose",
      "Composition: Oak, hornbeam and beech",
      "Packaging: Loose and unpackaged, tipped on the ground by crane truck",
      "Quantity: 1 to 7 stères depending on the option chosen",
      "Size: Logs cut to 25 cm",
      "Moisture content: Around 30%, part-seasoned wood",
      "Suitable appliances: Fireplaces and log stoves with a compact firebox",
      "Recommended use: Further covered seasoning before use in a closed firebox",
      "Storage: Raised, ventilated stack, covered on top only",
    ],
  },

  // --- Bois sur palette ---
  //
  // Les cinq longueurs partagent le même bois et le même conditionnement : ce
  // qui les sépare est la chambre de combustion visée, le volume des lots et la
  // manutention. Chaque fiche est écrite depuis cet angle-là, l'argument commun
  // — extra-sec sous 20 %, livré rangé sous film — étant abordé sous un aspect
  // différent à chaque fois plutôt que recopié.
  {
    slug: "bois-palette-40cm",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-PAL-40",
    shortDescription:
      "Bûches de feuillus durs extra-secs — chêne, charme et hêtre — de 40 cm, sur palette filmée, humidité sous 20 %, de 1,5 à 2,5 stères.",
    description:
      "Bois de chauffage extra-sec en bûches de 40 cm, coupé dans un mélange de feuillus durs — chêne, charme " +
      "et hêtre — et livré sur palette filmée, rangé et prêt à brûler. Les lots vont de 1,5 à 2,5 stères ; " +
      "c'est le seul format de la gamme à descendre jusqu'à 1,5 stère, ce qui en fait le lot d'appoint pour " +
      "compléter une réserve en cours de saison sans engager le volume d'une palette pleine." +
      "\n\n" +
      "Le 40 cm est une longueur intermédiaire, entre le format standard des inserts et les bûches de " +
      "cheminée. Il s'adresse aux foyers ouverts et aux inserts à grande chambre de combustion, où une bûche " +
      "de 33 cm laisse de la place perdue sur les côtés. Vérifiez la largeur ou la profondeur utile de votre " +
      "appareil avant de retenir ce format : dans un foyer prévu pour 33 cm, une bûche de 40 cm ne se charge " +
      "pas." +
      "\n\n" +
      "Le bois est séché en atelier jusqu'à un taux d'humidité inférieur à 20 %, le seuil communément retenu " +
      "pour une combustion propre. En pratique, cela veut dire une montée en température rapide, une vitre qui " +
      "reste claire et beaucoup moins de dépôt dans le conduit qu'avec un bois mi-sec brûlé trop tôt. Aucun " +
      "temps de stockage préalable n'est nécessaire : le bois peut passer de la palette au foyer le jour même." +
      "\n\n" +
      "Les trois essences sont toutes des feuillus denses. Le chêne apporte la braise et la tenue en fin de " +
      "flambée, le charme une chauffe lente et régulière, le hêtre une flamme calme et facile à conduire. " +
      "Aucun bois tendre n'entre dans le mélange, ce qui rend le comportement du feu homogène d'une recharge " +
      "à l'autre." +
      "\n\n" +
      "La palette se décharge au transpalette ou à l'engin de manutention et se stocke telle quelle : le bois " +
      "arrive empilé, il n'y a pas de tas à ranger. Retirez le film dès la réception — il protège pendant le " +
      "transport, mais laissé en place il enferme l'humidité et fait transpirer le bois. Ensuite, un " +
      "emplacement couvert et aéré suffit à conserver le taux d'humidité jusqu'à la dernière bûche.",
    descriptionEn:
      "Extra-dry firewood in 40 cm logs, cut from a mix of dense hardwoods — oak, hornbeam and beech — and " +
      "delivered on a shrink-wrapped pallet, stacked and ready to burn. Lots run from 1.5 to 2.5 stères (the " +
      "French unit for stacked wood, roughly 0.7 m³ each); this is the only format in the range that goes down " +
      "to 1.5 stère, which makes it the top-up lot for replenishing a store mid-season without committing to a " +
      "full pallet." +
      "\n\n" +
      "40 cm is an intermediate length, between the standard insert format and true fireplace logs. It is " +
      "aimed at open fires and inserts with a large firebox, where a 33 cm log leaves wasted space at the " +
      "sides. Check the usable width or depth of your appliance before settling on this format: in a firebox " +
      "designed for 33 cm, a 40 cm log will not load." +
      "\n\n" +
      "The wood is dried on site to a moisture content below 20%, the threshold commonly accepted for clean " +
      "combustion. In practice that means a fast rise to temperature, glass that stays clear and far less " +
      "deposit in the flue than part-seasoned wood burnt too early. No prior storage period is needed: the " +
      "wood can go from pallet to fire the same day." +
      "\n\n" +
      "All three species are dense hardwoods. Oak brings the embers and the staying power at the end of a " +
      "burn, hornbeam a slow and steady heat, beech a calm flame that is easy to control. No softwood goes " +
      "into the mix, which keeps the behaviour of the fire consistent from one reload to the next." +
      "\n\n" +
      "The pallet is unloaded with a pallet truck or forklift and stores as it arrives: the wood comes " +
      "stacked, so there is no heap to sort out. Remove the film on receipt — it protects the load in transit, " +
      "but left in place it traps moisture and makes the wood sweat. After that, a covered, airy spot is " +
      "enough to hold the moisture level down to the last log.",
    shortDescriptionEn:
      "Extra-dry hardwood logs — oak, hornbeam, beech — 40 cm, shrink-wrapped pallet, below 20% moisture, 1.5 to 2.5 stères.",
    bullets: [
      "Produit : Bois de chauffage en bûches",
      "Type de produit : Bûches de feuillus durs extra-secs, sur palette",
      "Composition : Chêne, charme et hêtre",
      "Conditionnement : Palette filmée, film à retirer dès la réception",
      "Quantité : De 1,5 à 2,5 stères selon la variante retenue",
      "Taille : Bûches coupées à 40 cm",
      "Taux d'humidité : Inférieur à 20 %, bois extra-sec",
      "Appareils compatibles : Foyers ouverts et inserts à grande chambre de combustion",
      "Utilisation recommandée : Prêt à brûler dès la livraison, sans séchage complémentaire",
      "Stockage conseillé : Palette conservée telle quelle, à l'abri et ventilée, film retiré",
    ],
    bulletsEn: [
      "Product: Firewood logs",
      "Product type: Extra-dry dense hardwood logs, palletised",
      "Composition: Oak, hornbeam and beech",
      "Packaging: Shrink-wrapped pallet, film to be removed on receipt",
      "Quantity: 1.5 to 2.5 stères depending on the option chosen",
      "Size: Logs cut to 40 cm",
      "Moisture content: Below 20%, extra-dry wood",
      "Suitable appliances: Open fires and inserts with a large firebox",
      "Recommended use: Ready to burn on delivery, no further drying needed",
      "Storage: Keep on the pallet, under cover and ventilated, film removed",
    ],
  },
  {
    slug: "bois-palette-33cm",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-PAL-33",
    shortDescription:
      "Bûches de feuillus durs extra-secs — chêne, charme et hêtre — de 33 cm, sur palette filmée, humidité sous 20 %, de 2,5 à 3 stères.",
    description:
      "Bois de chauffage extra-sec en bûches de 33 cm, issu d'un mélange de feuillus durs — chêne, charme et " +
      "hêtre — livré sur palette filmée. Deux volumes sont proposés, 2,5 et 3 stères : ce sont les lots les " +
      "plus importants de la gamme sur palette, dimensionnés pour couvrir une saison de chauffage complète " +
      "en une seule livraison plutôt que d'enchaîner les réassorts." +
      "\n\n" +
      "Le 33 cm est le format de référence du marché français. C'est la longueur pour laquelle la grande " +
      "majorité des inserts et des poêles à bûches vendus en France sont dimensionnés, et celle qui pose le " +
      "moins de questions au moment de choisir : si la notice de votre appareil indique une longueur de bûche " +
      "maximale de 33 ou 35 cm, ce format entre sans forcer." +
      "\n\n" +
      "Par rapport aux formats courts, la bûche de 33 cm apporte simplement plus de matière par recharge. Sur " +
      "une soirée, cela se traduit par moins d'allers-retours vers la réserve et une chauffe plus continue, " +
      "l'appareil redescendant moins souvent en température entre deux chargements." +
      "\n\n" +
      "Le bois est séché jusqu'à moins de 20 % d'humidité et livré prêt à brûler. Le mélange ne comporte que " +
      "des essences denses : le chêne pour la braise longue, le charme pour la régularité de la chauffe, le " +
      "hêtre pour une flamme propre et bien tenue. C'est un bois d'usage quotidien, pas un bois d'agrément " +
      "réservé aux flambées du week-end." +
      "\n\n" +
      "La palette arrive rangée et filmée. Prévoyez un accès permettant la dépose au transpalette ou à " +
      "l'engin de manutention, ainsi qu'une surface plane et abritée pour la recevoir. Le film se retire à la " +
      "réception : sa fonction s'arrête au transport, et le bois a besoin de respirer une fois posé. Conservé " +
      "sur sa palette, à l'abri de la pluie et ouvert à l'air, le bois garde son taux d'humidité toute la " +
      "saison.",
    descriptionEn:
      "Extra-dry firewood in 33 cm logs, from a mix of dense hardwoods — oak, hornbeam and beech — delivered " +
      "on a shrink-wrapped pallet. Two volumes are offered, 2.5 and 3 stères (the French unit for stacked " +
      "wood, roughly 0.7 m³ each): these are the largest lots in the palletised range, sized to cover a full " +
      "heating season in a single delivery rather than through repeated top-ups." +
      "\n\n" +
      "33 cm is the reference format on the French market. It is the length most inserts and log stoves sold " +
      "in France are designed around, and the one that raises the fewest questions at the point of choosing: " +
      "if your appliance manual gives a maximum log length of 33 or 35 cm, this format goes in without " +
      "forcing." +
      "\n\n" +
      "Compared with the shorter formats, a 33 cm log simply carries more material per reload. Over an " +
      "evening that means fewer trips to the woodpile and a more continuous heat, with the appliance dropping " +
      "back in temperature less often between charges." +
      "\n\n" +
      "The wood is dried to below 20% moisture and delivered ready to burn. The mix contains dense species " +
      "only: oak for the long ember phase, hornbeam for steady heat, beech for a clean, well-held flame. This " +
      "is an everyday wood, not a decorative one kept for weekend fires." +
      "\n\n" +
      "The pallet arrives stacked and wrapped. Allow access for unloading by pallet truck or forklift, along " +
      "with a level, sheltered surface to receive it. The film comes off on receipt: its job ends with " +
      "transport, and the wood needs to breathe once set down. Kept on its pallet, out of the rain and open " +
      "to the air, the wood holds its moisture level through the season.",
    shortDescriptionEn:
      "Extra-dry hardwood logs — oak, hornbeam, beech — 33 cm, shrink-wrapped pallet, below 20% moisture, 2.5 to 3 stères.",
    bullets: [
      "Produit : Bois de chauffage en bûches",
      "Type de produit : Bûches de feuillus durs extra-secs, sur palette",
      "Composition : Chêne, charme et hêtre",
      "Conditionnement : Palette filmée, film à retirer dès la réception",
      "Quantité : 2,5 ou 3 stères selon la variante retenue",
      "Taille : Bûches coupées à 33 cm",
      "Taux d'humidité : Inférieur à 20 %, bois extra-sec",
      "Appareils compatibles : La plupart des inserts et poêles à bûches du marché",
      "Utilisation recommandée : Chauffe quotidienne, prêt à brûler dès la livraison",
      "Stockage conseillé : Palette conservée telle quelle, à l'abri et ventilée, film retiré",
    ],
    bulletsEn: [
      "Product: Firewood logs",
      "Product type: Extra-dry dense hardwood logs, palletised",
      "Composition: Oak, hornbeam and beech",
      "Packaging: Shrink-wrapped pallet, film to be removed on receipt",
      "Quantity: 2.5 or 3 stères depending on the option chosen",
      "Size: Logs cut to 33 cm",
      "Moisture content: Below 20%, extra-dry wood",
      "Suitable appliances: Most inserts and log stoves on the market",
      "Recommended use: Everyday heating, ready to burn on delivery",
      "Storage: Keep on the pallet, under cover and ventilated, film removed",
    ],
  },
  {
    // 12e entrée : produit auparavant non couvert (voir note en tête de fichier),
    // désormais distinguable de la palette 33 cm grâce à l'indexation par slug.
    slug: "bois-palette-30cm",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-PAL-30",
    shortDescription:
      "Bûches de feuillus durs extra-secs — chêne, charme et hêtre — de 30 cm, sur palette filmée, humidité sous 20 %, de 2 à 3 stères.",
    description:
      "Bois de chauffage extra-sec en bûches de 30 cm, coupé dans un mélange de feuillus durs — chêne, charme " +
      "et hêtre — et livré sur palette filmée, prêt à brûler. Trois volumes sont proposés : 2, 2,5 et " +
      "3 stères." +
      "\n\n" +
      "Le 30 cm existe pour une raison très pratique : la marge. Une bûche annoncée à 33 cm peut, selon la " +
      "coupe, dépasser de un ou deux centimètres, et un foyer dont la profondeur utile est tout juste de " +
      "33 cm devient alors pénible à charger — la bûche bute, il faut la tourner ou la reprendre. En 30 cm, " +
      "la bûche entre franchement, se positionne où l'on veut et laisse de l'espace pour l'air de combustion " +
      "autour du chargement." +
      "\n\n" +
      "C'est donc la longueur à choisir quand l'appareil est donné pour 33 cm sans marge, quand le foyer est " +
      "difficile d'accès, ou simplement pour charger sans avoir à viser. Elle reste compatible avec la " +
      "grande majorité des inserts et des poêles à bûches, qui acceptent tous une bûche plus courte que leur " +
      "maximum." +
      "\n\n" +
      "Côté combustible, rien ne change : trois feuillus denses, sans essence tendre, séchés jusqu'à moins de " +
      "20 % d'humidité. Le chêne tient la braise en fin de flambée, le charme prolonge la chauffe, le hêtre " +
      "donne une flamme régulière. Le bois est utilisable dès la livraison, sans période de séchage " +
      "complémentaire." +
      "\n\n" +
      "La palette se dépose au transpalette ou à l'engin de manutention et se conserve telle quelle, sur une " +
      "surface plane et abritée. Retirez le film à la réception pour que l'air circule entre les bûches ; " +
      "maintenu, il retient la condensation et fait remonter l'humidité du bois là où le séchage l'avait " +
      "fait descendre.",
    descriptionEn:
      "Extra-dry firewood in 30 cm logs, cut from a mix of dense hardwoods — oak, hornbeam and beech — and " +
      "delivered on a shrink-wrapped pallet, ready to burn. Three volumes are offered: 2, 2.5 and 3 stères " +
      "(the French unit for stacked wood, roughly 0.7 m³ each)." +
      "\n\n" +
      "30 cm exists for a very practical reason: clearance. A log sold as 33 cm may, depending on the cut, " +
      "run over by a centimetre or two, and a firebox with a usable depth of exactly 33 cm then becomes " +
      "awkward to load — the log catches, and you have to turn it or take it back out. At 30 cm, the log goes " +
      "in cleanly, sits where you place it and leaves room for combustion air around the charge." +
      "\n\n" +
      "This is therefore the length to choose when the appliance is rated for 33 cm with no margin, when the " +
      "firebox is awkward to reach, or simply to load without having to aim. It remains compatible with the " +
      "great majority of inserts and log stoves, all of which accept a log shorter than their maximum." +
      "\n\n" +
      "As fuel, nothing changes: three dense hardwoods, no soft species, dried to below 20% moisture. Oak " +
      "holds the embers at the end of a burn, hornbeam extends the heat, beech gives a steady flame. The wood " +
      "can be used from the day it arrives, with no further seasoning period." +
      "\n\n" +
      "The pallet is set down by pallet truck or forklift and kept as it is, on a level, sheltered surface. " +
      "Remove the film on receipt so air can move between the logs; left on, it holds condensation and drives " +
      "the moisture content back up where drying had brought it down.",
    shortDescriptionEn:
      "Extra-dry hardwood logs — oak, hornbeam, beech — 30 cm, shrink-wrapped pallet, below 20% moisture, 2 to 3 stères.",
    bullets: [
      "Produit : Bois de chauffage en bûches",
      "Type de produit : Bûches de feuillus durs extra-secs, sur palette",
      "Composition : Chêne, charme et hêtre",
      "Conditionnement : Palette filmée, film à retirer dès la réception",
      "Quantité : De 2 à 3 stères selon la variante retenue",
      "Taille : Bûches coupées à 30 cm",
      "Taux d'humidité : Inférieur à 20 %, bois extra-sec",
      "Appareils compatibles : Inserts et poêles à bûches, y compris foyers donnés pour 33 cm",
      "Utilisation recommandée : Chargement sans contrainte dans un foyer de faible marge",
      "Stockage conseillé : Palette conservée telle quelle, à l'abri et ventilée, film retiré",
    ],
    bulletsEn: [
      "Product: Firewood logs",
      "Product type: Extra-dry dense hardwood logs, palletised",
      "Composition: Oak, hornbeam and beech",
      "Packaging: Shrink-wrapped pallet, film to be removed on receipt",
      "Quantity: 2 to 3 stères depending on the option chosen",
      "Size: Logs cut to 30 cm",
      "Moisture content: Below 20%, extra-dry wood",
      "Suitable appliances: Inserts and log stoves, including fireboxes rated for 33 cm",
      "Recommended use: Easy loading in a firebox with little clearance",
      "Storage: Keep on the pallet, under cover and ventilated, film removed",
    ],
  },
  {
    slug: "bois-palette-25cm",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-PAL-25",
    shortDescription:
      "Bûches de feuillus durs extra-secs — chêne, charme et hêtre — de 25 cm, sur palette filmée, humidité sous 20 %, de 1,8 à 3 stères.",
    description:
      "Bois de chauffage extra-sec en bûches courtes de 25 cm, issu d'un mélange de feuillus durs — chêne, " +
      "charme et hêtre — et livré sur palette filmée. C'est le format qui offre la plus large gamme de " +
      "volumes : 1,8, 2 ou 3 stères, du lot d'appoint à la réserve de saison." +
      "\n\n" +
      "La coupe à 25 cm est celle des chambres de combustion compactes : petits inserts, poêles à bûches " +
      "d'appoint, foyers peu profonds, appareils de faible puissance installés dans un logement bien isolé. " +
      "Dans un foyer de ce gabarit, une bûche courte laisse de la place autour du chargement pour l'air " +
      "primaire, ce qui aide à monter en température et à tenir une combustion propre." +
      "\n\n" +
      "Le format court a un second avantage, moins souvent mis en avant : la manutention. Les bûches sont " +
      "plus légères à l'unité, se portent par brassées et se rangent là où un format long ne passerait pas — " +
      "cave étroite, sous-escalier, coffre à bois d'intérieur. C'est le format le plus commode quand la " +
      "réserve n'est pas au même niveau que l'appareil." +
      "\n\n" +
      "Le bois est séché en atelier jusqu'à moins de 20 % d'humidité, ce qui le rend utilisable dès la " +
      "livraison. Les trois essences retenues sont toutes denses : chêne pour la braise, charme pour la " +
      "chauffe lente, hêtre pour la régularité de la flamme. Aucun bois tendre n'est mélangé, ce qui évite " +
      "les recharges qui s'emballent puis retombent." +
      "\n\n" +
      "La palette est déchargée au transpalette ou à l'engin de manutention et se stocke telle quelle : le " +
      "bois arrive rangé, il n'y a rien à empiler. Retirez le film dès la réception et gardez la palette " +
      "sous abri, ouverte à l'air : c'est tout ce qu'il faut pour conserver le bénéfice du séchage jusqu'à " +
      "la fin de la saison.",
    descriptionEn:
      "Extra-dry firewood in short 25 cm logs, from a mix of dense hardwoods — oak, hornbeam and beech — " +
      "delivered on a shrink-wrapped pallet. This is the format with the widest choice of volumes: 1.8, 2 or " +
      "3 stères (the French unit for stacked wood, roughly 0.7 m³ each), from a top-up lot to a full season's " +
      "store." +
      "\n\n" +
      "The 25 cm cut is the one for compact fireboxes: small inserts, secondary log stoves, shallow hearths, " +
      "low-output appliances fitted in a well-insulated home. In a firebox of that size, a short log leaves " +
      "room around the charge for primary air, which helps bring the fire up to temperature and keep " +
      "combustion clean." +
      "\n\n" +
      "The short format has a second advantage, less often mentioned: handling. The logs are lighter " +
      "individually, can be carried by the armful and fit where a long format never would — a narrow cellar, " +
      "an under-stair recess, an indoor log box. It is the most practical format when the store is not on the " +
      "same level as the appliance." +
      "\n\n" +
      "The wood is dried on site to below 20% moisture, which makes it usable from the day it arrives. All " +
      "three species are dense: oak for embers, hornbeam for a slow burn, beech for a steady flame. No " +
      "softwood is mixed in, which avoids reloads that flare up and then fall away." +
      "\n\n" +
      "The pallet is unloaded by pallet truck or forklift and stores as it is: the wood arrives stacked, so " +
      "there is nothing to pile up. Remove the film on receipt and keep the pallet under cover, open to the " +
      "air: that is all it takes to preserve the benefit of drying through to the end of the season.",
    shortDescriptionEn:
      "Extra-dry hardwood logs — oak, hornbeam, beech — 25 cm, shrink-wrapped pallet, below 20% moisture, 1.8 to 3 stères.",
    bullets: [
      "Produit : Bois de chauffage en bûches",
      "Type de produit : Bûches de feuillus durs extra-secs, sur palette",
      "Composition : Chêne, charme et hêtre",
      "Conditionnement : Palette filmée, film à retirer dès la réception",
      "Quantité : 1,8, 2 ou 3 stères selon la variante retenue",
      "Taille : Bûches coupées à 25 cm",
      "Taux d'humidité : Inférieur à 20 %, bois extra-sec",
      "Appareils compatibles : Foyers et poêles à bûches à chambre de combustion compacte",
      "Utilisation recommandée : Prêt à brûler dès la livraison, sans séchage complémentaire",
      "Stockage conseillé : Palette conservée telle quelle, à l'abri et ventilée, film retiré",
    ],
    bulletsEn: [
      "Product: Firewood logs",
      "Product type: Extra-dry dense hardwood logs, palletised",
      "Composition: Oak, hornbeam and beech",
      "Packaging: Shrink-wrapped pallet, film to be removed on receipt",
      "Quantity: 1.8, 2 or 3 stères depending on the option chosen",
      "Size: Logs cut to 25 cm",
      "Moisture content: Below 20%, extra-dry wood",
      "Suitable appliances: Fireplaces and log stoves with a compact firebox",
      "Recommended use: Ready to burn on delivery, no further drying needed",
      "Storage: Keep on the pallet, under cover and ventilated, film removed",
    ],
  },
  {
    slug: "bois-palette-50cm",
    // Marque propre : la référence est attribuée par MLC Bois, qui conditionne
    // et vend ce produit. Google accepte marque + MPN à défaut de code-barres.
    mpn: "MLC-PAL-50",
    shortDescription:
      "Bûches de feuillus durs extra-secs — chêne, charme et hêtre — de 50 cm, sur palette filmée, humidité sous 20 %, de 2 à 3 stères.",
    description:
      "Bois de chauffage extra-sec en bûches de 50 cm, coupé dans un mélange de feuillus durs — chêne, charme " +
      "et hêtre — et livré sur palette filmée, rangé et prêt à brûler. Deux volumes sont proposés : 2 ou " +
      "3 stères." +
      "\n\n" +
      "C'est la plus grande longueur de la gamme, et elle suppose un appareil dimensionné en conséquence : " +
      "cheminée à foyer ouvert, insert de grande largeur, poêle à bûches de forte puissance. La profondeur " +
      "utile d'un appareil compact dépasse rarement 35 cm, aussi vaut-il mieux mesurer avant de retenir ce " +
      "format plutôt que de découvrir à la livraison que les bûches ne rentrent pas." +
      "\n\n" +
      "L'intérêt d'une bûche longue tient à la manutention et au rythme du feu. À volume égal, il y a moins " +
      "de bûches à porter, moins de gestes pour remplir le foyer, et un chargement tient plus longtemps avant " +
      "la recharge suivante — un confort qui compte lorsque l'appareil chauffe une grande pièce en continu." +
      "\n\n" +
      "Le bois est séché jusqu'à un taux d'humidité inférieur à 20 % et livré prêt à brûler. Le mélange " +
      "n'associe que des essences denses : le chêne pour la braise longue, le charme pour la chaleur " +
      "soutenue, le hêtre pour une flamme calme et peu étincelante — un comportement appréciable en foyer " +
      "ouvert, où les projections ne sont retenues par aucune vitre." +
      "\n\n" +
      "La palette se décharge au transpalette ou à l'engin de manutention. Prévoyez une surface plane et " +
      "abritée : le bois se conserve sur sa palette, sans être réempilé. Retirez le film dès la réception " +
      "pour laisser l'air circuler, puis maintenez la palette à couvert et dégagée sur les côtés jusqu'à " +
      "la dernière bûche.",
    descriptionEn:
      "Extra-dry firewood in 50 cm logs, cut from a mix of dense hardwoods — oak, hornbeam and beech — and " +
      "delivered on a shrink-wrapped pallet, stacked and ready to burn. Two volumes are offered: 2 or " +
      "3 stères (the French unit for stacked wood, roughly 0.7 m³ each)." +
      "\n\n" +
      "This is the longest format in the range, and it assumes an appliance sized to match: an open " +
      "fireplace, a wide insert, a high-output log stove. The usable depth of a compact appliance rarely " +
      "exceeds 35 cm, so it is worth measuring before settling on this format rather than discovering on " +
      "delivery that the logs do not fit." +
      "\n\n" +
      "The appeal of a long log lies in handling and in the rhythm of the fire. For the same volume there " +
      "are fewer logs to carry, fewer movements to fill the firebox, and a charge lasts longer before the " +
      "next reload — a comfort that counts when the appliance heats a large room continuously." +
      "\n\n" +
      "The wood is dried to a moisture content below 20% and delivered ready to burn. The mix brings " +
      "together dense species only: oak for the long ember phase, hornbeam for sustained heat, beech for a " +
      "calm flame with few sparks — welcome behaviour in an open fire, where nothing holds back what the " +
      "wood throws out." +
      "\n\n" +
      "The pallet is unloaded by pallet truck or forklift. Allow a level, sheltered surface: the wood keeps " +
      "on its pallet, with no restacking. Remove the film on receipt so air can circulate, then keep the " +
      "pallet under cover and clear along the sides down to the last log.",
    shortDescriptionEn:
      "Extra-dry hardwood logs — oak, hornbeam, beech — 50 cm, shrink-wrapped pallet, below 20% moisture, 2 to 3 stères.",
    bullets: [
      "Produit : Bois de chauffage en bûches",
      "Type de produit : Bûches de feuillus durs extra-secs, sur palette",
      "Composition : Chêne, charme et hêtre",
      "Conditionnement : Palette filmée, film à retirer dès la réception",
      "Quantité : 2 ou 3 stères selon la variante retenue",
      "Taille : Bûches coupées à 50 cm",
      "Taux d'humidité : Inférieur à 20 %, bois extra-sec",
      "Appareils compatibles : Cheminées à foyer ouvert et inserts à grande chambre de combustion",
      "Utilisation recommandée : Chauffe continue d'un grand volume, avec recharges espacées",
      "Stockage conseillé : Palette conservée telle quelle, à l'abri et ventilée, film retiré",
    ],
    bulletsEn: [
      "Product: Firewood logs",
      "Product type: Extra-dry dense hardwood logs, palletised",
      "Composition: Oak, hornbeam and beech",
      "Packaging: Shrink-wrapped pallet, film to be removed on receipt",
      "Quantity: 2 or 3 stères depending on the option chosen",
      "Size: Logs cut to 50 cm",
      "Moisture content: Below 20%, extra-dry wood",
      "Suitable appliances: Open fireplaces and inserts with a large firebox",
      "Recommended use: Continuous heating of a large space, with reloads further apart",
      "Storage: Keep on the pallet, under cover and ventilated, film removed",
    ],
  },

  // --- Poêles à bois, marques tierces (identifiants : docs/research/identifiants-poeles.md) ---
  //
  // Huit appareils dont trois Deville partagent exactement les mêmes valeurs
  // techniques (8 kW, 77 %, EN 13240, classe A, indice 102). Les décrire à
  // l'identique n'aiderait personne : les fiches Orense, Toron 50 et Sandy
  // partent donc de ce qui les sépare réellement — la masse, donc l'inertie et
  // la vitesse de montée en température — et le disent explicitement.
  {
    slug: "mkt-poele-interstoves-alessia-14-kw",
    // Poids net de l'appareil, e.leclerc + fiche technique Interstoves. À majorer du calage et de la
    // palette si l'expédition se fait conditionnée.
    shippingWeightGrams: 70000,
    shortDescription:
      "Poêle à bûches Interstoves Alessia 14 kW, rendement 82 %, classe énergétique A+, 70 kg, pose par un professionnel exigée.",
    description:
      "Poêle à bois de la marque Interstoves, modèle Alessia, référence ALESSIAC50NOIR. Puissance " +
      "nominale de 14 kW, rendement mesuré de 82 %, conformité Eco Design 2022 et classe " +
      "d'efficacité énergétique A+. Corps en acier, 70 kg." +
      "\n\n" +
      "Avec 14 kW, c'est l'appareil le plus puissant de notre sélection, et cette puissance appelle " +
      "une vérification avant l'achat plutôt qu'après. L'ordre de grandeur retenu est d'environ " +
      "1 kW pour 10 m² dans un logement correctement isolé : ce modèle couvre donc quelque 140 m², " +
      "et il est fait pour un volume important — grand séjour ouvert, maison de plain-pied, " +
      "logement ancien difficile à chauffer." +
      "\n\n" +
      "Le point à ne pas négliger est le surdimensionnement. Un poêle trop puissant pour la pièce " +
      "ne se contente pas de coûter plus cher : il tourne en permanence au ralenti, ce qui abaisse " +
      "la température de combustion, encrasse la vitre et charge le conduit en dépôts. Un appareil " +
      "de 14 kW installé dans 70 m² travaille moins bien qu'un 8 kW à sa juste taille." +
      "\n\n" +
      "La construction en acier et le poids de 70 kg en font l'appareil le plus léger de la " +
      "sélection. L'acier monte en température plus vite que la fonte : le poêle commence à " +
      "restituer de la chaleur peu après l'allumage, ce qui convient à une pièce qu'on chauffe à " +
      "la demande plutôt qu'en continu. Cette légèreté simplifie aussi la manutention et la pose " +
      "sur un plancher qui ne supporterait pas 200 kg." +
      "\n\n" +
      "L'appareil fonctionne exclusivement aux bûches et ne demande aucun raccordement électrique : " +
      "il chauffe pendant une coupure de courant. L'installation doit être confiée à un " +
      "professionnel qualifié — c'est une exigence des compagnies d'assurance habitation pour tout " +
      "appareil raccordé à un conduit de fumée, et cela conditionne le cas échéant les aides à la " +
      "rénovation. Faites vérifier l'état et le dimensionnement du conduit existant avant de " +
      "commander.",
    descriptionEn:
      "Wood-burning stove from Interstoves, Alessia model, reference ALESSIAC50NOIR. Nominal output " +
      "of 14 kW, measured efficiency of 82%, EcoDesign 2022 compliance and energy efficiency class " +
      "A+. Steel body, 70 kg." +
      "\n\n" +
      "At 14 kW this is the most powerful appliance in our selection, and that output calls for a " +
      "check before purchase rather than after. The working rule of thumb is about 1 kW per 10 m² " +
      "in a properly insulated home: this model therefore covers some 140 m², and it is built for a " +
      "substantial volume — a large open living room, a single-storey house, an older property " +
      "that is hard to heat." +
      "\n\n" +
      "The point not to overlook is oversizing. A stove too powerful for the room does not merely " +
      "cost more: it runs permanently at low output, which lowers the combustion temperature, " +
      "fouls the glass and loads the flue with deposits. A 14 kW appliance fitted in 70 m² performs " +
      "worse than an 8 kW one at its proper size." +
      "\n\n" +
      "Steel construction and a weight of 70 kg make this the lightest appliance in the selection. " +
      "Steel heats up faster than cast iron: the stove starts giving out heat shortly after " +
      "lighting, which suits a room heated on demand rather than continuously. That light weight " +
      "also simplifies handling and installation on a floor that would not take 200 kg." +
      "\n\n" +
      "The appliance runs solely on logs and needs no electrical connection: it keeps heating " +
      "through a power cut. Installation must be carried out by a qualified professional — a " +
      "requirement set by home insurers for any appliance connected to a flue, and one that also " +
      "governs renovation grants where these apply. Have the condition and sizing of the existing " +
      "flue checked before ordering.",
    shortDescriptionEn:
      "Interstoves Alessia wood-burning stove, 14 kW, 82% efficiency, energy class A+, 70 kg, professional installation required.",
    gtin: "3760366603266", // gtin13 structuré + tableau EAN, e.leclerc.fr ; recoupé but.fr
    mpn: "ALESSIAC50NOIR",
    energyEfficiencyClass: "A+",
    bullets: [
      "Produit : Poêle à bois",
      "Type de produit : Poêle à bûches indépendant",
      "Référence fabricant : ALESSIAC50NOIR",
      "Composition : Acier",
      "Puissance nominale : 14 kW",
      "Rendement : 82 %",
      "Classe d'efficacité énergétique : A+",
      "Normes et labels : Eco Design 2022",
      "Combustible : Bûches de bois, sans raccordement électrique",
      "Surface chauffée : Environ 140 m² en logement correctement isolé",
      "Poids : 70 kg",
      "Utilisation recommandée : Grand volume, séjour ouvert ou logement ancien",
      "Installation : Par un professionnel qualifié, sur conduit vérifié",
    ],
    bulletsEn: [
      "Product: Wood-burning stove",
      "Product type: Freestanding log stove",
      "Manufacturer reference: ALESSIAC50NOIR",
      "Composition: Steel",
      "Nominal output: 14 kW",
      "Efficiency: 82%",
      "Energy efficiency class: A+",
      "Standards and labels: EcoDesign 2022",
      "Fuel: Wood logs, no electrical connection",
      "Heated area: Around 140 m² in a properly insulated home",
      "Weight: 70 kg",
      "Recommended use: Large volumes, open living rooms or older properties",
      "Installation: By a qualified professional, on a checked flue",
    ],
  },
  {
    slug: "mkt-poele-interstoves-juan-14-kw",
    // Poids net de l'appareil, e.leclerc + fiche technique Interstoves. À majorer du calage et de la
    // palette si l'expédition se fait conditionnée.
    shippingWeightGrams: 70000,
    shortDescription:
      "Poêle à bûches Interstoves Juan avec four intégré, 14 kW, rendement 82 %, classe énergétique A+, 70 kg.",
    description:
      "Poêle à bois de la marque Interstoves, modèle Juan, référence JUANC50NOIR, doté d'un four " +
      "intégré. Puissance nominale de 14 kW, rendement de 82 %, conformité Eco Design 2022, classe " +
      "d'efficacité énergétique A+. Corps en acier, 70 kg." +
      "\n\n" +
      "Le four est ce qui distingue ce modèle. Il transforme l'appareil en équipement double : le " +
      "poêle chauffe la pièce, et la chaleur qu'il produit de toute façon sert en même temps à " +
      "cuire. Rien n'est consommé en plus pour cuisiner, puisque c'est l'énergie du foyer qui " +
      "travaille — un pain, un gratin ou un plat mijoté profitent d'une flambée qui aurait eu lieu " +
      "de toute manière." +
      "\n\n" +
      "L'intérêt est concret dans deux situations. En résidence secondaire ou en maison isolée, " +
      "l'appareil assure le chauffage et la cuisson avec le même combustible et sans électricité. " +
      "En cas de coupure de courant prolongée, il reste un moyen de chauffer et de préparer un " +
      "repas chaud, ce qu'un poêle seul ne permet pas." +
      "\n\n" +
      "Les performances de chauffe sont celles d'un appareil de forte puissance : 14 kW, soit " +
      "environ 140 m² dans un logement correctement isolé, en retenant l'ordre de grandeur d'un " +
      "kilowatt pour dix mètres carrés. Vérifiez ce dimensionnement avant de commander : un poêle " +
      "trop puissant pour la pièce tourne au ralenti, encrasse sa vitre et charge le conduit. La " +
      "structure en acier de 70 kg monte vite en température et se manipule sans difficulté " +
      "particulière." +
      "\n\n" +
      "Fonctionnement exclusivement aux bûches, sans raccordement électrique. L'installation " +
      "revient à un professionnel qualifié : les assurances habitation l'exigent pour tout appareil " +
      "raccordé à un conduit de fumée, et cela conditionne le cas échéant les aides à la " +
      "rénovation.",
    descriptionEn:
      "Wood-burning stove from Interstoves, Juan model, reference JUANC50NOIR, fitted with a " +
      "built-in oven. Nominal output of 14 kW, efficiency of 82%, EcoDesign 2022 compliance, energy " +
      "efficiency class A+. Steel body, 70 kg." +
      "\n\n" +
      "The oven is what sets this model apart. It turns the appliance into a dual-purpose one: the " +
      "stove heats the room, and the heat it produces anyway is used at the same time for cooking. " +
      "Nothing extra is burned to cook, since it is the firebox energy doing the work — a loaf, a " +
      "gratin or a slow-cooked dish all benefit from a fire that would have been lit regardless." +
      "\n\n" +
      "The appeal is concrete in two situations. In a second home or an isolated house, the " +
      "appliance covers both heating and cooking with the same fuel and no electricity. During a " +
      "prolonged power cut, it remains a way to heat the room and prepare a hot meal, which a stove " +
      "alone does not offer." +
      "\n\n" +
      "Heating performance is that of a high-output appliance: 14 kW, around 140 m² in a properly " +
      "insulated home, using the rule of thumb of one kilowatt per ten square metres. Check that " +
      "sizing before ordering: a stove too powerful for the room runs at low output, fouls its " +
      "glass and loads the flue. The 70 kg steel structure heats up quickly and handles without " +
      "particular difficulty." +
      "\n\n" +
      "Runs solely on logs, with no electrical connection. Installation is a matter for a qualified " +
      "professional: home insurers require it for any appliance connected to a flue, and it also " +
      "governs renovation grants where these apply.",
    shortDescriptionEn:
      "Interstoves Juan wood-burning stove with built-in oven, 14 kW, 82% efficiency, energy class A+, 70 kg.",
    gtin: "3760366603273", // gtin13 structuré + tableau EAN, e.leclerc.fr
    mpn: "JUANC50NOIR",
    energyEfficiencyClass: "A+",
    bullets: [
      "Produit : Poêle à bois",
      "Type de produit : Poêle à bûches avec four intégré",
      "Référence fabricant : JUANC50NOIR",
      "Composition : Acier",
      "Puissance nominale : 14 kW",
      "Rendement : 82 %",
      "Classe d'efficacité énergétique : A+",
      "Normes et labels : Eco Design 2022",
      "Combustible : Bûches de bois, sans raccordement électrique",
      "Surface chauffée : Environ 140 m² en logement correctement isolé",
      "Poids : 70 kg",
      "Utilisation recommandée : Chauffage et cuisson au bois, résidence isolée",
      "Installation : Par un professionnel qualifié, sur conduit vérifié",
    ],
    bulletsEn: [
      "Product: Wood-burning stove",
      "Product type: Log stove with built-in oven",
      "Manufacturer reference: JUANC50NOIR",
      "Composition: Steel",
      "Nominal output: 14 kW",
      "Efficiency: 82%",
      "Energy efficiency class: A+",
      "Standards and labels: EcoDesign 2022",
      "Fuel: Wood logs, no electrical connection",
      "Heated area: Around 140 m² in a properly insulated home",
      "Weight: 70 kg",
      "Recommended use: Wood heating and cooking, isolated properties",
      "Installation: By a qualified professional, on a checked flue",
    ],
  },
  {
    // GTIN volontairement absent : le code releve (7421097382238) porte un prefixe GS1 "742"
    // (Amerique centrale), incoherent avec les deux autres Interstoves du lot ("376", France).
    // Malgre un checksum valide et un recoupement chez plusieurs revendeurs, ce prefixe suggere
    // un code interne de revendeur plutot qu'un GTIN fabricant fiable : le champ reste vide et
    // le flux Merchant basculera sur identifier_exists=no pour cette fiche, ce qui est conforme.
    slug: "mkt-poele-interstoves-matteo-10-kw",
    // Poids net de l'appareil, e.leclerc + fiche technique Interstoves. À majorer du calage et de la
    // palette si l'expédition se fait conditionnée.
    shippingWeightGrams: 98000,
    shortDescription:
      "Poêle à bûches Interstoves Matteo, 10 kW, rendement 78,9 %, Flamme Verte 7 étoiles, classe énergétique A+, 98 kg.",
    description:
      "Poêle à bois de la marque Interstoves, modèle Matteo, référence MATTEO500NR. Puissance " +
      "nominale de 10 kW, rendement de 78,9 %, classe d'efficacité énergétique A+. Corps en acier " +
      "noir, 98 kg." +
      "\n\n" +
      "C'est le seul appareil de la sélection à afficher explicitement le label Flamme Verte 7 " +
      "étoiles, en plus de la conformité Eco Design 2022. Flamme Verte est un label français porté " +
      "par les fabricants d'appareils de chauffage au bois : il classe les appareils sur une " +
      "échelle d'étoiles qui combine le rendement et les émissions de polluants — monoxyde de " +
      "carbone, particules, composés organiques. Sept étoiles correspond au niveau le plus élevé " +
      "de cette échelle." +
      "\n\n" +
      "Ce label a une portée pratique au-delà de la performance affichée : il fait partie des " +
      "critères régulièrement demandés lors d'un dossier de rénovation énergétique, et il est " +
      "reconnu par les collectivités qui encadrent le chauffage au bois dans les zones soumises à " +
      "un plan de protection de l'atmosphère. Renseignez-vous sur les règles en vigueur dans votre " +
      "commune avant l'achat si vous êtes en agglomération." +
      "\n\n" +
      "Avec 10 kW, l'appareil couvre environ 100 m² dans un logement correctement isolé, en " +
      "retenant l'ordre de grandeur d'un kilowatt pour dix mètres carrés. C'est la puissance " +
      "intermédiaire de la gamme Interstoves proposée ici, entre les modèles de 14 kW destinés aux " +
      "grands volumes et les appareils de 6 à 8 kW faits pour un séjour ordinaire. Les 98 kg " +
      "d'acier lui donnent un peu plus d'inertie que les modèles de 70 kg, sans imposer de " +
      "contrainte de plancher particulière." +
      "\n\n" +
      "Fonctionnement exclusivement aux bûches, sans électricité. La pose est à confier à un " +
      "professionnel qualifié, exigence des assurances habitation pour tout appareil raccordé à un " +
      "conduit de fumée.",
    descriptionEn:
      "Wood-burning stove from Interstoves, Matteo model, reference MATTEO500NR. Nominal output of " +
      "10 kW, efficiency of 78.9%, energy efficiency class A+. Black steel body, 98 kg." +
      "\n\n" +
      "It is the only appliance in the selection to state the Flamme Verte 7-star label explicitly, " +
      "alongside EcoDesign 2022 compliance. Flamme Verte is a French label backed by manufacturers " +
      "of wood-heating appliances: it rates appliances on a star scale combining efficiency and " +
      "pollutant emissions — carbon monoxide, particulates, organic compounds. Seven stars is the " +
      "highest level on that scale." +
      "\n\n" +
      "The label carries practical weight beyond the stated performance: it is among the criteria " +
      "regularly required in an energy-renovation application, and it is recognised by local " +
      "authorities that regulate wood heating in areas covered by an air protection plan. If you " +
      "are in a built-up area, check the rules in force in your commune before buying." +
      "\n\n" +
      "At 10 kW, the appliance covers around 100 m² in a properly insulated home, using the rule of " +
      "thumb of one kilowatt per ten square metres. It is the mid-range output in the Interstoves " +
      "line offered here, between the 14 kW models aimed at large volumes and the 6 to 8 kW " +
      "appliances built for an ordinary living room. Its 98 kg of steel give it slightly more " +
      "thermal mass than the 70 kg models, without imposing any particular floor loading " +
      "constraint." +
      "\n\n" +
      "Runs solely on logs, with no electricity. Installation should be entrusted to a qualified " +
      "professional, a requirement of home insurers for any appliance connected to a flue.",
    shortDescriptionEn:
      "Interstoves Matteo wood-burning stove, 10 kW, 78.9% efficiency, Flamme Verte 7-star, energy class A+, 98 kg.",
    mpn: "MATTEO500NR",
    energyEfficiencyClass: "A+",
    bullets: [
      "Produit : Poêle à bois",
      "Type de produit : Poêle à bûches indépendant",
      "Référence fabricant : MATTEO500NR",
      "Composition : Acier noir",
      "Puissance nominale : 10 kW",
      "Rendement : 78,9 %",
      "Classe d'efficacité énergétique : A+",
      "Normes et labels : Eco Design 2022, Flamme Verte 7 étoiles",
      "Combustible : Bûches de bois, sans raccordement électrique",
      "Surface chauffée : Environ 100 m² en logement correctement isolé",
      "Poids : 98 kg",
      "Utilisation recommandée : Séjour de grande taille, chauffage principal",
      "Installation : Par un professionnel qualifié, sur conduit vérifié",
    ],
    bulletsEn: [
      "Product: Wood-burning stove",
      "Product type: Freestanding log stove",
      "Manufacturer reference: MATTEO500NR",
      "Composition: Black steel",
      "Nominal output: 10 kW",
      "Efficiency: 78.9%",
      "Energy efficiency class: A+",
      "Standards and labels: EcoDesign 2022, Flamme Verte 7-star",
      "Fuel: Wood logs, no electrical connection",
      "Heated area: Around 100 m² in a properly insulated home",
      "Weight: 98 kg",
      "Recommended use: Large living rooms, primary heating",
      "Installation: By a qualified professional, on a checked flue",
    ],
  },
  {
    slug: "mkt-poele-deville-sandy-8-kw-lab",
    // Poids net de l'appareil, fiche officielle deville.fr C077BD-06-DD. À majorer du calage et de la
    // palette si l'expédition se fait conditionnée.
    shippingWeightGrams: 112000,
    shortDescription:
      "Poêle à bûches Deville C077BD.06-DD, 8 kW, rendement 77 %, classe énergétique A, 112 kg.",
    description:
      "Poêle à bois Deville, référence C077BD.06-DD. Puissance nominale de 8 kW, rendement utile de " +
      "77 %, conformité à la norme EN 13240 et à la réglementation Eco Design 2022, classe " +
      "d'efficacité énergétique A et indice d'efficacité énergétique de 102. Poids de 112 kg." +
      "\n\n" +
      "Trois poêles Deville de 8 kW figurent dans cette sélection — Orense, Toron 50 et cette " +
      "référence — et ils partagent exactement les mêmes valeurs mesurées : même puissance, même " +
      "rendement, même norme, même classe, même indice. Ce qui les sépare, c'est la masse. Autant " +
      "le dire franchement, cela évite de chercher une différence de performance qui n'existe pas." +
      "\n\n" +
      "Avec 112 kg, c'est le plus léger des trois. Un appareil moins lourd contient moins de " +
      "matière à porter en température : il commence donc à restituer de la chaleur plus tôt après " +
      "l'allumage, mais il refroidit aussi plus vite une fois le feu éteint. C'est le comportement " +
      "recherché quand on chauffe à la demande — une pièce occupée le soir, un logement où le " +
      "chauffage principal prend le relais la journée — plutôt qu'en feu continu." +
      "\n\n" +
      "Sa légèreté relative simplifie aussi la pose : 112 kg se manipulent à deux et ne posent " +
      "généralement pas de question de reprise de charge sur un plancher courant, là où un appareil " +
      "de près de 200 kg mérite qu'on vérifie le support." +
      "\n\n" +
      "L'appareil couvre environ 80 m² dans un logement correctement isolé, sur la base d'un " +
      "kilowatt pour dix mètres carrés. Il fonctionne exclusivement aux bûches et ne demande aucun " +
      "raccordement électrique. L'installation doit être confiée à un professionnel qualifié, " +
      "exigence des compagnies d'assurance habitation ; faites vérifier le conduit existant avant " +
      "de commander, car son état oriente parfois tout le choix.",
    descriptionEn:
      "Deville wood-burning stove, reference C077BD.06-DD. Nominal output of 8 kW, useful efficiency " +
      "of 77%, compliance with the EN 13240 standard and the EcoDesign 2022 regulation, energy " +
      "efficiency class A and an energy efficiency index of 102. Weight 112 kg." +
      "\n\n" +
      "Three 8 kW Deville stoves appear in this selection — Orense, Toron 50 and this reference — " +
      "and they share exactly the same measured values: same output, same efficiency, same " +
      "standard, same class, same index. What separates them is mass. Saying so plainly saves you " +
      "hunting for a performance difference that does not exist." +
      "\n\n" +
      "At 112 kg, this is the lightest of the three. A lighter appliance has less material to bring " +
      "up to temperature: it therefore starts giving out heat sooner after lighting, but it also " +
      "cools down faster once the fire is out. That is the behaviour you want when heating on " +
      "demand — a room used in the evening, a home where the main heating takes over during the " +
      "day — rather than running a continuous fire." +
      "\n\n" +
      "Its relative lightness also simplifies installation: 112 kg can be handled by two people and " +
      "generally raises no question of load-bearing on an ordinary floor, where an appliance of " +
      "close to 200 kg deserves a check of the support." +
      "\n\n" +
      "The appliance covers around 80 m² in a properly insulated home, on the basis of one kilowatt " +
      "per ten square metres. It runs solely on logs and needs no electrical connection. " +
      "Installation must be carried out by a qualified professional, a requirement of home " +
      "insurers; have the existing flue checked before ordering, as its condition sometimes shapes " +
      "the whole decision.",
    shortDescriptionEn:
      "Deville C077BD.06-DD wood-burning stove, 8 kW, 77% efficiency, EN 13240 compliant, energy class A, 112 kg.",
    gtin: "3244330110009", // itemprop="gtin13", primo-ideo.com ; fiche officielle deville.fr pour le reste
    mpn: "C077BD.06-DD",
    energyEfficiencyClass: "A",
    bullets: [
      "Produit : Poêle à bois",
      "Type de produit : Poêle à bûches indépendant",
      "Référence fabricant : C077BD.06-DD",
      "Puissance nominale : 8 kW",
      "Rendement : 77 %",
      "Classe d'efficacité énergétique : A",
      "Indice d'efficacité énergétique : 102",
      "Normes et labels : EN 13240, Eco Design 2022",
      "Combustible : Bûches de bois, sans raccordement électrique",
      "Surface chauffée : Environ 80 m² en logement correctement isolé",
      "Poids : 112 kg",
      "Utilisation recommandée : Chauffe à la demande, montée en température rapide",
      "Installation : Par un professionnel qualifié, sur conduit vérifié",
    ],
    bulletsEn: [
      "Product: Wood-burning stove",
      "Product type: Freestanding log stove",
      "Manufacturer reference: C077BD.06-DD",
      "Nominal output: 8 kW",
      "Efficiency: 77%",
      "Energy efficiency class: A",
      "Energy efficiency index: 102",
      "Standards and labels: EN 13240, EcoDesign 2022",
      "Fuel: Wood logs, no electrical connection",
      "Heated area: Around 80 m² in a properly insulated home",
      "Weight: 112 kg",
      "Recommended use: Heating on demand, fast rise to temperature",
      "Installation: By a qualified professional, on a checked flue",
    ],
  },
  {
    slug: "mkt-poele-deville-toron-50-8-kw",
    // Poids net de l'appareil, fiche officielle deville.fr C07768.06. À majorer du calage et de la
    // palette si l'expédition se fait conditionnée.
    shippingWeightGrams: 150000,
    shortDescription:
      "Poêle à bûches Deville Toron 50, référence C07768.06, 8 kW, rendement 77 %, classe A, 150 kg.",
    description:
      "Poêle à bois Deville, modèle Toron 50, référence C07768.06. Puissance nominale de 8 kW, " +
      "rendement utile de 77 %, conformité EN 13240 et Eco Design 2022, classe d'efficacité " +
      "énergétique A, indice d'efficacité énergétique de 102. Poids de 150 kg." +
      "\n\n" +
      "Le Toron 50 occupe la position médiane parmi les trois Deville de 8 kW présentés ici. Les " +
      "trois appareils affichent des valeurs mesurées identiques — 77 % de rendement, classe A, " +
      "indice 102 — et se distinguent uniquement par leur masse : 112, 150 et 192 kg. Le choix " +
      "entre eux ne se fait donc pas sur la performance, mais sur le régime de chauffe visé." +
      "\n\n" +
      "À 150 kg, cet appareil se situe entre les deux extrêmes. Il monte en température moins vite " +
      "que le modèle de 112 kg, mais il conserve la chaleur plus longtemps après la dernière " +
      "flambée ; à l'inverse, il n'exige pas la vérification de plancher qu'un appareil de près de " +
      "200 kg peut appeler dans une construction ancienne. C'est le compromis à retenir pour un " +
      "usage mixte : des flambées en soirée la plupart du temps, des journées entières de chauffe " +
      "quand il fait vraiment froid." +
      "\n\n" +
      "La puissance de 8 kW correspond à environ 80 m² dans un logement correctement isolé, en " +
      "retenant l'ordre de grandeur d'un kilowatt pour dix mètres carrés. Dans une maison ancienne " +
      "mal isolée, la surface réellement couverte sera plus faible." +
      "\n\n" +
      "Fonctionnement exclusivement aux bûches, sans aucun raccordement électrique : l'appareil " +
      "chauffe pendant une coupure de courant. La pose revient à un professionnel qualifié, " +
      "exigence posée par les compagnies d'assurance habitation. Faites établir le devis " +
      "d'installation et vérifier le conduit avant de commander l'appareil.",
    descriptionEn:
      "Deville wood-burning stove, Toron 50 model, reference C07768.06. Nominal output of 8 kW, " +
      "useful efficiency of 77%, EN 13240 and EcoDesign 2022 compliance, energy efficiency class A, " +
      "energy efficiency index of 102. Weight 150 kg." +
      "\n\n" +
      "The Toron 50 sits in the middle of the three 8 kW Deville stoves presented here. All three " +
      "post identical measured values — 77% efficiency, class A, index 102 — and differ only in " +
      "mass: 112, 150 and 192 kg. Choosing between them is therefore not a matter of performance " +
      "but of the heating pattern you have in mind." +
      "\n\n" +
      "At 150 kg, this appliance sits between the two extremes. It heats up more slowly than the " +
      "112 kg model but holds its heat longer after the last fire; conversely, it does not call for " +
      "the floor check that an appliance of nearly 200 kg can require in an older building. It is " +
      "the compromise to keep in mind for mixed use: evening fires most of the time, full days of " +
      "heating when it turns genuinely cold." +
      "\n\n" +
      "The 8 kW output corresponds to around 80 m² in a properly insulated home, using the rule of " +
      "thumb of one kilowatt per ten square metres. In a poorly insulated older house, the area " +
      "actually covered will be smaller." +
      "\n\n" +
      "Runs solely on logs, with no electrical connection at all: the appliance keeps heating " +
      "through a power cut. Installation is a matter for a qualified professional, a requirement " +
      "set by home insurers. Get the installation quote drawn up and the flue checked before " +
      "ordering the appliance.",
    shortDescriptionEn:
      "Deville Toron 50 wood-burning stove, reference C07768.06, 8 kW, 77% efficiency, class A, 150 kg.",
    gtin: "3244330110542", // gtin13 structuré poeleplus.fr, recoupé codep.fr ; fiche officielle deville.fr
    mpn: "C07768.06",
    energyEfficiencyClass: "A",
    bullets: [
      "Produit : Poêle à bois",
      "Type de produit : Poêle à bûches indépendant",
      "Référence fabricant : C07768.06",
      "Puissance nominale : 8 kW",
      "Rendement : 77 %",
      "Classe d'efficacité énergétique : A",
      "Indice d'efficacité énergétique : 102",
      "Normes et labels : EN 13240, Eco Design 2022",
      "Combustible : Bûches de bois, sans raccordement électrique",
      "Surface chauffée : Environ 80 m² en logement correctement isolé",
      "Poids : 150 kg",
      "Utilisation recommandée : Usage mixte, flambées de soirée et chauffe longue",
      "Installation : Par un professionnel qualifié, sur conduit vérifié",
    ],
    bulletsEn: [
      "Product: Wood-burning stove",
      "Product type: Freestanding log stove",
      "Manufacturer reference: C07768.06",
      "Nominal output: 8 kW",
      "Efficiency: 77%",
      "Energy efficiency class: A",
      "Energy efficiency index: 102",
      "Standards and labels: EN 13240, EcoDesign 2022",
      "Fuel: Wood logs, no electrical connection",
      "Heated area: Around 80 m² in a properly insulated home",
      "Weight: 150 kg",
      "Recommended use: Mixed use, evening fires and longer burns",
      "Installation: By a qualified professional, on a checked flue",
    ],
  },
  {
    slug: "mkt-poele-deville-orense-8-kw",
    // Poids net de l'appareil, fiche officielle deville.fr C077CD-06. À majorer du calage et de la
    // palette si l'expédition se fait conditionnée.
    shippingWeightGrams: 192000,
    shortDescription:
      "Poêle à bûches Deville Orense, référence C077CD-06, 8 kW, rendement 77 %, classe énergétique A, 192 kg.",
    description:
      "Poêle à bois Deville, modèle Orense, référence C077CD-06. Puissance nominale de 8 kW, " +
      "rendement utile de 77 %, conformité EN 13240 et Eco Design 2022, classe d'efficacité " +
      "énergétique A, indice d'efficacité énergétique de 102. Poids de 192 kg." +
      "\n\n" +
      "C'est le plus lourd des trois Deville de 8 kW proposés ici, et c'est sa seule différence " +
      "réelle : les valeurs mesurées sont identiques d'un modèle à l'autre. Avec 192 kg, l'Orense " +
      "se distingue par son inertie thermique." +
      "\n\n" +
      "L'inertie, c'est la capacité de l'appareil à emmagasiner la chaleur dans sa propre matière " +
      "puis à la restituer lentement. Un poêle lourd met plus longtemps à monter en température, " +
      "mais il continue de chauffer la pièce bien après que les flammes se sont éteintes. Sur une " +
      "nuit, la différence est nette : là où un appareil léger cesse de rayonner peu après la fin " +
      "de la combustion, une masse de près de 200 kg tiède encore au petit matin." +
      "\n\n" +
      "Ce comportement convient à un feu continu, entretenu toute la journée pendant la saison " +
      "froide, plutôt qu'à des flambées ponctuelles où l'on cherche une chaleur immédiate. Le " +
      "poids appelle en revanche une précaution : vérifiez la capacité du plancher à recevoir " +
      "192 kg sur une surface réduite, en particulier sur un plancher bois ancien ou à l'étage." +
      "\n\n" +
      "La puissance de 8 kW couvre environ 80 m² dans un logement correctement isolé, sur la base " +
      "d'un kilowatt pour dix mètres carrés. L'appareil fonctionne exclusivement aux bûches, sans " +
      "électricité, et sa pose doit être confiée à un professionnel qualifié — exigence des " +
      "compagnies d'assurance habitation, qui conditionne également, le cas échéant, les aides à " +
      "la rénovation.",
    descriptionEn:
      "Deville wood-burning stove, Orense model, reference C077CD-06. Nominal output of 8 kW, " +
      "useful efficiency of 77%, EN 13240 and EcoDesign 2022 compliance, energy efficiency class A, " +
      "energy efficiency index of 102. Weight 192 kg." +
      "\n\n" +
      "This is the heaviest of the three 8 kW Deville stoves offered here, and that is its only " +
      "real difference: the measured values are identical from one model to the next. At 192 kg, " +
      "the Orense stands out for its thermal mass." +
      "\n\n" +
      "Thermal mass is the appliance's ability to store heat in its own material and then release " +
      "it slowly. A heavy stove takes longer to come up to temperature, but it goes on heating the " +
      "room well after the flames have died down. Over a night the difference is clear: where a " +
      "light appliance stops radiating shortly after combustion ends, a mass of nearly 200 kg is " +
      "still warm by early morning." +
      "\n\n" +
      "That behaviour suits a continuous fire, kept going all day through the cold season, rather " +
      "than occasional blazes where immediate heat is what you are after. The weight does call for " +
      "one precaution: check that the floor can take 192 kg over a small footprint, particularly on " +
      "an old timber floor or upstairs." +
      "\n\n" +
      "The 8 kW output covers around 80 m² in a properly insulated home, on the basis of one " +
      "kilowatt per ten square metres. The appliance runs solely on logs, with no electricity, and " +
      "installation must be entrusted to a qualified professional — a requirement of home insurers, " +
      "which also governs renovation grants where these apply.",
    shortDescriptionEn:
      "Deville Orense wood-burning stove, reference C077CD-06, 8 kW, 77% efficiency, energy class A, 192 kg.",
    gtin: "3244330110696", // gtin13 + sku + mpn structurés, poeleplus.fr ; fiche officielle deville.fr
    mpn: "C077CD-06",
    energyEfficiencyClass: "A",
    bullets: [
      "Produit : Poêle à bois",
      "Type de produit : Poêle à bûches indépendant",
      "Référence fabricant : C077CD-06",
      "Puissance nominale : 8 kW",
      "Rendement : 77 %",
      "Classe d'efficacité énergétique : A",
      "Indice d'efficacité énergétique : 102",
      "Normes et labels : EN 13240, Eco Design 2022",
      "Combustible : Bûches de bois, sans raccordement électrique",
      "Surface chauffée : Environ 80 m² en logement correctement isolé",
      "Poids : 192 kg",
      "Utilisation recommandée : Feu continu, restitution longue par inertie",
      "Installation : Par un professionnel qualifié, sur plancher et conduit vérifiés",
    ],
    bulletsEn: [
      "Product: Wood-burning stove",
      "Product type: Freestanding log stove",
      "Manufacturer reference: C077CD-06",
      "Nominal output: 8 kW",
      "Efficiency: 77%",
      "Energy efficiency class: A",
      "Energy efficiency index: 102",
      "Standards and labels: EN 13240, EcoDesign 2022",
      "Fuel: Wood logs, no electrical connection",
      "Heated area: Around 80 m² in a properly insulated home",
      "Weight: 192 kg",
      "Recommended use: Continuous fire, long heat release through thermal mass",
      "Installation: By a qualified professional, floor and flue checked",
    ],
  },
  {
    // Reference fabricant actuelle C077BXN-06 (l'ancienne C077BX-06 est en fin de vie chez
    // Deville) ; c'est le GTIN associe a cette reference actuelle qui est retenu.
    slug: "mkt-poele-deville-eguzki-etanche-6-kw",
    // Poids net de l'appareil, fiche officielle deville.fr Eguzki. À majorer du calage et de la
    // palette si l'expédition se fait conditionnée.
    shippingWeightGrams: 124000,
    shortDescription:
      "Poêle à bûches étanche Deville Eguzki, référence C077BXN-06, 6 kW, rendement 75 %, classe A, 124 kg.",
    description:
      "Poêle à bois étanche Deville, modèle Eguzki, référence C077BXN-06. Puissance nominale de " +
      "6 kW, rendement utile de 75 % et rendement saisonnier de 65 %, conformité à la norme " +
      "EN 16510 et au label Flamme Verte, classe d'efficacité énergétique A, indice d'efficacité " +
      "énergétique de 99. Poids de 124 kg." +
      "\n\n" +
      "C'est le seul appareil étanche de la sélection, et c'est ce qui le rend particulier. Un " +
      "poêle ordinaire prélève l'air nécessaire à la combustion dans la pièce où il se trouve. " +
      "L'Eguzki, lui, va chercher cet air à l'extérieur du logement par un conduit dédié : le " +
      "circuit de combustion est isolé de l'air intérieur." +
      "\n\n" +
      "Cette différence est déterminante dans deux cas. Dans une construction récente, très " +
      "étanche à l'air, un appareil classique entre en concurrence avec la ventilation mécanique " +
      "pour l'air disponible, ce qui peut dégrader le tirage et, dans les cas défavorables, " +
      "ramener des fumées dans la pièce. Dans un logement équipé d'une VMC, le même mécanisme peut " +
      "se produire. Le poêle étanche supprime la cause : il ne prélève rien à l'intérieur, et ne " +
      "crée donc pas de dépression." +
      "\n\n" +
      "L'appareil est certifié selon la norme EN 16510, plus récente que l'EN 13240 appliquée aux " +
      "poêles à bûches classiques, et porte le label Flamme Verte, qui classe les appareils sur le " +
      "rendement et les émissions de polluants. Le rendement saisonnier de 65 %, distinct du " +
      "rendement utile de 75 %, correspond à la performance sur une saison de chauffe complète et " +
      "non au seul point de fonctionnement nominal." +
      "\n\n" +
      "Avec 6 kW, c'est le modèle le moins puissant de la sélection : il couvre environ 60 m² dans " +
      "un logement correctement isolé, ce qui correspond bien au type de construction pour lequel " +
      "l'étanchéité est utile. Fonctionnement exclusivement aux bûches, sans électricité. Le " +
      "raccordement de l'amenée d'air extérieure comme du conduit de fumée doit être réalisé par " +
      "un professionnel qualifié.",
    descriptionEn:
      "Airtight Deville wood-burning stove, Eguzki model, reference C077BXN-06. Nominal output of " +
      "6 kW, useful efficiency of 75% and seasonal efficiency of 65%, compliance with the EN 16510 " +
      "standard and the Flamme Verte label, energy efficiency class A, energy efficiency index of " +
      "99. Weight 124 kg." +
      "\n\n" +
      "It is the only airtight appliance in the selection, and that is what makes it distinctive. " +
      "An ordinary stove draws the air it needs for combustion from the room it stands in. The " +
      "Eguzki takes that air from outside the home through a dedicated duct: the combustion circuit " +
      "is isolated from indoor air." +
      "\n\n" +
      "This difference matters in two cases. In a recent, highly airtight building, a conventional " +
      "appliance competes with mechanical ventilation for the available air, which can degrade the " +
      "draught and, in unfavourable cases, bring smoke back into the room. In a home fitted with " +
      "mechanical ventilation, the same mechanism can occur. An airtight stove removes the cause: " +
      "it draws nothing from indoors and therefore creates no negative pressure." +
      "\n\n" +
      "The appliance is certified to EN 16510, more recent than the EN 13240 applied to " +
      "conventional log stoves, and carries the Flamme Verte label, which rates appliances on " +
      "efficiency and pollutant emissions. The seasonal efficiency of 65%, distinct from the 75% " +
      "useful efficiency, reflects performance across a full heating season rather than at the " +
      "nominal operating point alone." +
      "\n\n" +
      "At 6 kW this is the least powerful model in the selection: it covers around 60 m² in a " +
      "properly insulated home, which matches the kind of building where airtightness is useful. " +
      "Runs solely on logs, with no electricity. Both the external air supply and the flue " +
      "connection must be fitted by a qualified professional.",
    shortDescriptionEn:
      "Deville Eguzki airtight wood-burning stove, reference C077BXN-06, 6 kW, 75% efficiency, class A, 124 kg.",
    gtin: "3244330110801", // proxiconfort.fr + blancbrun.fr, associé à la référence actuelle C077BXN-06
    mpn: "C077BXN-06",
    energyEfficiencyClass: "A",
    bullets: [
      "Produit : Poêle à bois",
      "Type de produit : Poêle à bûches étanche, air de combustion pris à l'extérieur",
      "Référence fabricant : C077BXN-06",
      "Puissance nominale : 6 kW",
      "Rendement : 75 % en rendement utile, 65 % en rendement saisonnier",
      "Classe d'efficacité énergétique : A",
      "Indice d'efficacité énergétique : 99",
      "Normes et labels : EN 16510, Flamme Verte",
      "Combustible : Bûches de bois, sans raccordement électrique",
      "Surface chauffée : Environ 60 m² en logement correctement isolé",
      "Poids : 124 kg",
      "Utilisation recommandée : Construction récente très étanche ou logement équipé d'une VMC",
      "Installation : Par un professionnel qualifié, amenée d'air extérieure à raccorder",
    ],
    bulletsEn: [
      "Product: Wood-burning stove",
      "Product type: Airtight log stove, combustion air drawn from outside",
      "Manufacturer reference: C077BXN-06",
      "Nominal output: 6 kW",
      "Efficiency: 75% useful, 65% seasonal",
      "Energy efficiency class: A",
      "Energy efficiency index: 99",
      "Standards and labels: EN 16510, Flamme Verte",
      "Fuel: Wood logs, no electrical connection",
      "Heated area: Around 60 m² in a properly insulated home",
      "Weight: 124 kg",
      "Recommended use: Recent airtight construction or homes with mechanical ventilation",
      "Installation: By a qualified professional, external air supply to be connected",
    ],
  },
  {
    slug: "mkt-poele-la-nordica-extraflame-isetta-evo-4-0",
    // Poids net de l'appareil, maison-energy.com, recoupé chemineeo.fr. À majorer du calage et de la
    // palette si l'expédition se fait conditionnée.
    shippingWeightGrams: 160000,
    shortDescription:
      "Poêle à bûches La Nordica Extraflame Isetta Evo 4.0, 7,3 kW, rendement 83,6 %, classe énergétique A+, 160 kg.",
    description:
      "Poêle à bois La Nordica Extraflame, modèle Isetta Evo 4.0, référence 7119002. Puissance " +
      "nominale de 7,3 kW, rendement de 83,6 %, conformité à la norme NF EN 13240 et à la " +
      "réglementation Eco Design 2022, classe d'efficacité énergétique A+. Poids de 160 kg." +
      "\n\n" +
      "Avec 83,6 %, c'est le rendement le plus élevé de notre sélection de poêles. Le rendement " +
      "désigne la part de l'énergie contenue dans le bois qui passe effectivement dans la pièce, " +
      "le reste partant dans les fumées. L'écart avec un appareil à 77 % n'est pas anecdotique : " +
      "sur une saison, il représente plusieurs stères de bois pour la même chaleur restituée." +
      "\n\n" +
      "La fiche technique donne deux informations d'installation trop rarement publiées, et " +
      "pourtant décisives quand on se raccorde à un conduit existant : le diamètre de buse est de " +
      "150 mm, et la sortie de fumée peut être réalisée à l'arrière ou par le dessus. Cette " +
      "double possibilité laisse le choix entre un raccordement direct au conduit mural et une " +
      "remontée verticale, ce qui évite bien des adaptations coûteuses. Vérifiez le diamètre de " +
      "votre conduit avant de commander." +
      "\n\n" +
      "Le fabricant annonce un volume chauffé d'environ 338 mètres cubes dans un logement " +
      "correctement isolé. C'est une donnée exprimée en volume et non en surface, ce qui est plus " +
      "juste : à surface égale, une pièce sous plafond haut demande davantage de puissance qu'une " +
      "pièce standard. Rapportée à une hauteur sous plafond ordinaire, cette valeur correspond à " +
      "un grand séjour." +
      "\n\n" +
      "Les 160 kg de l'appareil lui donnent une bonne inertie : il continue de restituer de la " +
      "chaleur après extinction du foyer. Fonctionnement exclusivement aux bûches, sans " +
      "électricité. L'installation doit être confiée à un professionnel qualifié, exigence des " +
      "compagnies d'assurance habitation pour tout appareil raccordé à un conduit de fumée.",
    descriptionEn:
      "La Nordica Extraflame wood-burning stove, Isetta Evo 4.0 model, reference 7119002. Nominal " +
      "output of 7.3 kW, efficiency of 83.6%, compliance with the NF EN 13240 standard and the " +
      "EcoDesign 2022 regulation, energy efficiency class A+. Weight 160 kg." +
      "\n\n" +
      "At 83.6%, this is the highest efficiency in our stove selection. Efficiency is the share of " +
      "the energy contained in the wood that actually reaches the room, the rest going up the flue. " +
      "The gap with an appliance at 77% is not trivial: over a season it amounts to several stères " +
      "of wood for the same heat delivered." +
      "\n\n" +
      "The specification gives two installation details that are too rarely published, yet decisive " +
      "when connecting to an existing flue: the flue pipe diameter is 150 mm, and the smoke outlet " +
      "can be taken from the rear or from the top. That choice allows either a direct connection to " +
      "a wall flue or a vertical rise, which avoids many costly adaptations. Check the diameter of " +
      "your flue before ordering." +
      "\n\n" +
      "The manufacturer states a heated volume of around 338 cubic metres in a properly insulated " +
      "home. That figure is expressed as a volume rather than an area, which is the more accurate " +
      "measure: for the same floor area, a room with a high ceiling needs more output than a " +
      "standard one. At ordinary ceiling height, this value corresponds to a large living room." +
      "\n\n" +
      "The appliance's 160 kg give it good thermal mass: it goes on releasing heat after the fire " +
      "has gone out. Runs solely on logs, with no electricity. Installation must be carried out by " +
      "a qualified professional, a requirement of home insurers for any appliance connected to a " +
      "flue.",
    shortDescriptionEn:
      "La Nordica Extraflame Isetta Evo 4.0 wood-burning stove, 7.3 kW, 83.6% efficiency, energy class A+, 160 kg.",
    gtin: "8022724371008", // itemprop="gtin13" + EAN visible, maison-energy.com ; recoupé chemineeo.fr
    mpn: "7119002", // référence numérique reprise par chemineeo.fr et bernay-habitat.com
    energyEfficiencyClass: "A+",
    bullets: [
      "Produit : Poêle à bois",
      "Type de produit : Poêle à bûches indépendant",
      "Référence fabricant : 7119002",
      "Puissance nominale : 7,3 kW",
      "Rendement : 83,6 %",
      "Classe d'efficacité énergétique : A+",
      "Normes et labels : NF EN 13240, Eco Design 2022",
      "Combustible : Bûches de bois, sans raccordement électrique",
      "Volume chauffé : Environ 338 m³ en logement correctement isolé",
      "Poids : 160 kg",
      "Raccordement des fumées : Sortie arrière ou dessus, buse de 150 mm",
      "Utilisation recommandée : Grand séjour, y compris sous plafond haut",
      "Installation : Par un professionnel qualifié, sur conduit vérifié",
    ],
    bulletsEn: [
      "Product: Wood-burning stove",
      "Product type: Freestanding log stove",
      "Manufacturer reference: 7119002",
      "Nominal output: 7.3 kW",
      "Efficiency: 83.6%",
      "Energy efficiency class: A+",
      "Standards and labels: NF EN 13240, EcoDesign 2022",
      "Fuel: Wood logs, no electrical connection",
      "Heated volume: Around 338 m³ in a properly insulated home",
      "Weight: 160 kg",
      "Flue connection: Rear or top outlet, 150 mm pipe",
      "Recommended use: Large living rooms, including high ceilings",
      "Installation: By a qualified professional, on a checked flue",
    ],
  },

  // --- Granulés de bois, marques tierces (identifiants : docs/research/identifiants-granules.md) ---
  //
  // Dix palettes du même combustible : la répétition guette. Chaque fiche part
  // donc de la caractéristique qui distingue réellement le produit — le taux de
  // cendres pour Hélios, l'humidité pour Butagaz, la densité pour Piveteau, la
  // double certification pour Woodstock — et explique au passage un aspect
  // différent du granulé, pour que dix fiches lues à la suite apprennent dix
  // choses et non la même dix fois. Aucun prix ne figure dans les textes : il
  // change, la fiche non, et Google refuse le prix dans une description.
  {
    slug: "mkt-granules-starforest-palette",
    shortDescription:
      "Granulés de bois résineux Starforest, DINplus classe A1, cendres sous 0,7 %, palette de 70 sacs de 15 kg.",
    description:
      "Granulés de bois 100 % résineux conditionnés en sacs de 15 kg, réunis par palette de 70 sacs " +
      "sous film de protection, soit environ 1,05 tonne. Le diamètre est de 6 mm, le calibre " +
      "standard des poêles et chaudières à granulés du marché français." +
      "\n\n" +
      "Le produit est certifié DINplus sous le numéro 7A268, en classe A1, et conforme à la norme " +
      "DIN EN ISO 17225-2 qui encadre les biocombustibles solides. Cette classe A1 est la plus " +
      "exigeante de la norme : elle est réservée au bois vierge et fixe des plafonds sur le taux de " +
      "cendres, l'humidité et la tenue mécanique du granulé." +
      "\n\n" +
      "Les valeurs annoncées se lisent comme des plafonds, pas comme des moyennes : cendres " +
      "inférieures ou égales à 0,7 %, humidité inférieure ou égale à 10 %. Ce sont les limites " +
      "hautes tolérées en A1, ce qui situe ce granulé dans la partie supérieure de la fourchette " +
      "autorisée — un point à connaître si votre appareil est sensible à l'encrassement du " +
      "brûleur. En contrepartie, le pouvoir calorifique annoncé est un plancher élevé : au moins " +
      "5 kWh par kilogramme, soit environ 75 kWh par sac de 15 kg." +
      "\n\n" +
      "Le granulé alimente les poêles, les inserts et les chaudières à granulés, tous appareils à " +
      "vis sans fin et alimentation automatique. Le calibre régulier de 6 mm est ce qui permet à " +
      "cette vis de doser le combustible sans à-coups ; c'est aussi pour cela qu'un granulé " +
      "dégradé, réduit en fines, perturbe le fonctionnement bien avant de poser un problème de " +
      "rendement." +
      "\n\n" +
      "Conservez la palette au sec et laissez les sacs fermés jusqu'à l'usage. Le granulé est " +
      "hygroscopique : il reprend l'humidité de l'air, gonfle et se délite. Un sac ouvert " +
      "quelques semaines dans un garage humide finit en sciure, quelle que soit sa qualité au " +
      "départ.",
    descriptionEn:
      "Wood pellets, 100% softwood, bagged in 15 kg sacks and grouped 70 to a pallet under " +
      "protective film, about 1.05 tonnes in total. Diameter is 6 mm, the standard calibre for " +
      "pellet stoves and boilers on the French market." +
      "\n\n" +
      "The product is DINplus certified under number 7A268, in class A1, and compliant with DIN EN " +
      "ISO 17225-2, the standard covering solid biofuels. Class A1 is the most demanding tier of " +
      "that standard: it is reserved for virgin wood and sets ceilings on ash content, moisture and " +
      "the mechanical durability of the pellet." +
      "\n\n" +
      "The stated figures read as ceilings, not averages: ash at or below 0.7%, moisture at or " +
      "below 10%. Those are the upper limits allowed in A1, which places this pellet in the higher " +
      "part of the permitted range — worth knowing if your appliance is sensitive to burner " +
      "fouling. In return, the calorific value is quoted as a high floor: at least 5 kWh per " +
      "kilogram, about 75 kWh per 15 kg bag." +
      "\n\n" +
      "The pellets feed stoves, inserts and boilers, all of them auger-fed appliances with " +
      "automatic feeding. The consistent 6 mm calibre is what lets that auger meter the fuel " +
      "smoothly; it is also why a degraded pellet, broken down into fines, disrupts operation well " +
      "before it becomes a question of output." +
      "\n\n" +
      "Keep the pallet dry and leave the bags sealed until use. Pellets are hygroscopic: they draw " +
      "moisture from the air, swell and break apart. A bag left open for a few weeks in a damp " +
      "garage ends up as sawdust, however good it was to begin with.",
    shortDescriptionEn:
      "Starforest softwood pellets, DINplus class A1, ash below 0.7%, moisture at or below 10%, pallet of 70 bags of 15 kg.",
    bullets: [
      "Produit : Granulés de bois",
      "Type de produit : Granulés pour appareil à alimentation automatique",
      "Composition : 100 % résineux",
      "Conditionnement : Palette sous film, sacs de 15 kg",
      "Quantité : 70 sacs de 15 kg",
      "Poids total : Environ 1,05 tonne",
      "Taille ou diamètre : Granulés de 6 mm",
      "Taux d'humidité : Inférieur ou égal à 10 %",
      "Pouvoir calorifique : Supérieur ou égal à 5 kWh par kilogramme",
      "Taux de cendres : Inférieur ou égal à 0,7 %",
      "Certifications ou normes : DINplus n° 7A268, classe A1, DIN EN ISO 17225-2",
      "Appareils compatibles : Poêles, inserts et chaudières à granulés",
      "Utilisation recommandée : Chauffage domestique en appareil à alimentation automatique",
      "Stockage conseillé : Au sec, sur palette, sacs fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Wood pellets",
      "Product type: Pellets for automatically fed appliances",
      "Composition: 100% softwood",
      "Packaging: Pallet under film, 15 kg bags",
      "Quantity: 70 bags of 15 kg",
      "Total weight: About 1.05 tonnes",
      "Size or diameter: 6 mm pellets",
      "Moisture content: At or below 10%",
      "Calorific value: At least 5 kWh per kilogram",
      "Ash content: At or below 0.7%",
      "Certifications and standards: DINplus no. 7A268, class A1, DIN EN ISO 17225-2",
      "Suitable appliances: Pellet stoves, inserts and boilers",
      "Recommended use: Domestic heating in an automatically fed appliance",
      "Storage: Dry, on the pallet, bags kept sealed until use",
    ],
  },
  {
    slug: "crepito-granules-crepito-palette-de-66-sacs-de-15-kg",
    shortDescription:
      "Granulés de bois Crépito, certifiés DINplus, cendres environ 0,5 %, palette de 66 sacs de 15 kg.",
    description:
      "Granulés fabriqués à partir de bois vierge, sans additif, conditionnés en sacs de 15 kg et " +
      "livrés par palette de 66 sacs, soit environ 0,99 tonne." +
      "\n\n" +
      "« Bois vierge sans additif » n'est pas une formule commerciale mais une définition de " +
      "matière première. Le granulé est produit à partir de bois qui n'a jamais été transformé, " +
      "peint, collé ni traité — à l'exclusion des bois de récupération, des panneaux et des " +
      "déchets de menuiserie. Aucun liant n'est ajouté non plus : c'est la lignine contenue dans " +
      "le bois qui, sous l'effet de la pression et de la chaleur de la presse, ressoude les " +
      "particules entre elles. C'est ce qui explique qu'un granulé bien fabriqué tienne sans " +
      "colle, et qu'il ne dégage à la combustion que ce que dégagerait le bois dont il est issu." +
      "\n\n" +
      "La certification DINplus, portée sous le numéro 7A288, contrôle précisément ce point en " +
      "plus des caractéristiques mesurées, dans le cadre de la norme DIN EN ISO 17225-2. Les " +
      "valeurs relevées sont un taux de cendres d'environ 0,5 %, une humidité inférieure ou égale " +
      "à 8 % et un pouvoir calorifique compris entre 4,7 et 5,3 kWh par kilogramme." +
      "\n\n" +
      "Cette fourchette de rendement mérite d'être lue telle quelle : elle reflète la variabilité " +
      "normale d'un produit naturel, où l'essence et le lot de sciure font bouger le résultat " +
      "d'un chargement à l'autre. Rapportée au sac de 15 kg, elle représente entre 70 et 80 kWh." +
      "\n\n" +
      "Les granulés alimentent poêles, inserts et chaudières à granulés. Conservez-les au sec, " +
      "sur leur palette, sacs fermés jusqu'à l'usage : l'humidité reprise est le seul facteur qui " +
      "dégrade durablement un granulé correctement fabriqué.",
    descriptionEn:
      "Pellets made from virgin wood with no additive, bagged in 15 kg sacks and delivered on a " +
      "pallet of 66 bags, about 0.99 tonnes in total." +
      "\n\n" +
      "\"Virgin wood, no additive\" is not marketing language but a definition of raw material. The " +
      "pellet is produced from wood that has never been processed, painted, glued or treated — " +
      "excluding reclaimed timber, boards and joinery waste. No binder is added either: it is the " +
      "lignin in the wood itself that, under the pressure and heat of the press, welds the " +
      "particles back together. That is why a well-made pellet holds without glue, and why burning " +
      "it releases only what the wood it came from would release." +
      "\n\n" +
      "DINplus certification, held under number 7A288, checks that point alongside the measured " +
      "characteristics, within the framework of DIN EN ISO 17225-2. The recorded figures are an " +
      "ash content of around 0.5%, moisture at or below 8% and a calorific value between 4.7 and " +
      "5.3 kWh per kilogram." +
      "\n\n" +
      "That output range is worth reading as it stands: it reflects the normal variability of a " +
      "natural product, where species and sawdust batch shift the result from one load to the " +
      "next. Per 15 kg bag, it works out at between 70 and 80 kWh." +
      "\n\n" +
      "The pellets feed stoves, inserts and pellet boilers. Keep them dry, on their pallet, with " +
      "bags sealed until use: reabsorbed moisture is the one factor that lastingly degrades a " +
      "properly made pellet.",
    shortDescriptionEn:
      "Crépito virgin wood pellets, DINplus certified, ash around 0.5%, moisture at or below 8%, pallet of 66 bags of 15 kg.",
    shippingWeightGrams: 990000, // 66 sacs de 15 kg, calcul déjà porté par le bullet en base
    bullets: [
      "Produit : Granulés de bois",
      "Type de produit : Granulés de bois vierge, sans additif",
      "Composition : Bois vierge, sans liant ni additif",
      "Conditionnement : Palette sous film, sacs de 15 kg",
      "Quantité : 66 sacs de 15 kg",
      "Poids total : Environ 0,99 tonne",
      "Taux d'humidité : Inférieur ou égal à 8 %",
      "Pouvoir calorifique : De 4,7 à 5,3 kWh par kilogramme",
      "Taux de cendres : Environ 0,5 %",
      "Certifications ou normes : DINplus n° 7A288, DIN EN ISO 17225-2",
      "Appareils compatibles : Poêles, inserts et chaudières à granulés",
      "Utilisation recommandée : Chauffage domestique en appareil à alimentation automatique",
      "Stockage conseillé : Au sec, sur palette, sacs fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Wood pellets",
      "Product type: Virgin wood pellets, no additive",
      "Composition: Virgin wood, no binder or additive",
      "Packaging: Pallet under film, 15 kg bags",
      "Quantity: 66 bags of 15 kg",
      "Total weight: About 0.99 tonnes",
      "Moisture content: At or below 8%",
      "Calorific value: 4.7 to 5.3 kWh per kilogram",
      "Ash content: Around 0.5%",
      "Certifications and standards: DINplus no. 7A288, DIN EN ISO 17225-2",
      "Suitable appliances: Pellet stoves, inserts and boilers",
      "Recommended use: Domestic heating in an automatically fed appliance",
      "Storage: Dry, on the pallet, bags kept sealed until use",
    ],
  },
  {
    // Certification DINplus evoquee par des revendeurs (n° 7A329) mais non confirmee au registre
    // DIN CERTCO officiel malgre plusieurs verifications : non retenue dans la description.
    slug: "butagaz-granules-butagaz-palette-de-66-sacs-de-15-kg",
    shortDescription:
      "Granulés de bois Butagaz, 100 % résineux, cendres 0,4 %, humidité 6,5 %, palette de 66 sacs de 15 kg.",
    description:
      "Granulés de bois 100 % résineux, obtenus par compression de sciures locales sans aucun " +
      "additif chimique, conditionnés en sacs de 15 kg et livrés par palette de 66 sacs, soit " +
      "environ 0,99 tonne." +
      "\n\n" +
      "Le trait marquant de ce granulé est son humidité : 6,5 %, là où la limite tolérée pour un " +
      "granulé de qualité se situe à 10 %. L'écart peut sembler mince, il ne l'est pas. Chaque " +
      "point d'humidité en moins est de l'eau que la flamme n'a plus à évaporer avant de produire " +
      "de la chaleur, et de la vapeur en moins dans les fumées. En pratique, cela se traduit par " +
      "un allumage franc, une montée en puissance rapide et une combustion qui reste stable même " +
      "à faible régime, quand l'appareil tourne au ralenti en mi-saison." +
      "\n\n" +
      "Le taux de cendres suit la même logique : 0,4 %, soit environ 60 grammes de résidu pour un " +
      "sac de 15 kg. Sur une palette entière, cela représente à peine quatre kilos de cendres à " +
      "évacuer sur la saison. Le pouvoir calorifique est annoncé à 4,9 kWh par kilogramme au " +
      "minimum, soit environ 73 kWh par sac." +
      "\n\n" +
      "Le diamètre est de 6,10 mm, une valeur qui reste dans la tolérance du calibre 6 mm attendu " +
      "par les poêles, inserts et chaudières à granulés du marché : aucune adaptation n'est " +
      "nécessaire sur la vis d'alimentation." +
      "\n\n" +
      "Stockez la palette au sec, sacs fermés jusqu'à l'usage. Un granulé à 6,5 % d'humidité " +
      "placé dans un local humide ne conserve pas cet avantage longtemps : c'est précisément la " +
      "sécheresse initiale qui rend le stockage déterminant.",
    descriptionEn:
      "Wood pellets, 100% softwood, produced by compressing local sawdust with no chemical " +
      "additive whatsoever, bagged in 15 kg sacks and delivered on a pallet of 66 bags, about 0.99 " +
      "tonnes in total." +
      "\n\n" +
      "The standout feature of this pellet is its moisture content: 6.5%, where the tolerated limit " +
      "for a quality pellet sits at 10%. The gap may look slight; it is not. Every point of " +
      "moisture removed is water the flame no longer has to evaporate before producing heat, and " +
      "less vapour in the flue gases. In practice that means clean lighting, a fast rise to output " +
      "and combustion that stays stable even at low settings, when the appliance is ticking over " +
      "in the shoulder seasons." +
      "\n\n" +
      "Ash content follows the same logic: 0.4%, or roughly 60 grams of residue per 15 kg bag. " +
      "Across a full pallet that comes to barely four kilos of ash to clear over the season. The " +
      "calorific value is quoted at a minimum of 4.9 kWh per kilogram, about 73 kWh per bag." +
      "\n\n" +
      "Diameter is 6.10 mm, a figure that stays within the tolerance of the 6 mm calibre expected " +
      "by pellet stoves, inserts and boilers on the market: no adjustment to the feed auger is " +
      "required." +
      "\n\n" +
      "Store the pallet dry, with bags sealed until use. A pellet at 6.5% moisture kept in a damp " +
      "room does not hold that advantage for long: it is precisely the initial dryness that makes " +
      "storage decisive here.",
    shortDescriptionEn:
      "Butagaz wood pellets, 100% softwood, ash 0.4%, moisture 6.5%, calorific value at least 4.9 kWh/kg, pallet of 66 bags of 15 kg.",
    shippingWeightGrams: 990000, // 66 sacs de 15 kg, calcul déjà porté par le bullet en base
    bullets: [
      "Produit : Granulés de bois",
      "Type de produit : Granulés pour appareil à alimentation automatique",
      "Composition : 100 % résineux, sciures comprimées sans additif chimique",
      "Conditionnement : Palette sous film, sacs de 15 kg",
      "Quantité : 66 sacs de 15 kg",
      "Poids total : Environ 0,99 tonne",
      "Taille ou diamètre : Granulés de 6,10 mm",
      "Taux d'humidité : 6,5 %",
      "Pouvoir calorifique : Supérieur ou égal à 4,9 kWh par kilogramme",
      "Taux de cendres : 0,4 %",
      "Appareils compatibles : Poêles, inserts et chaudières à granulés",
      "Utilisation recommandée : Chauffage domestique en appareil à alimentation automatique",
      "Stockage conseillé : Au sec, sur palette, sacs fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Wood pellets",
      "Product type: Pellets for automatically fed appliances",
      "Composition: 100% softwood, sawdust compressed with no chemical additive",
      "Packaging: Pallet under film, 15 kg bags",
      "Quantity: 66 bags of 15 kg",
      "Total weight: About 0.99 tonnes",
      "Size or diameter: 6.10 mm pellets",
      "Moisture content: 6.5%",
      "Calorific value: At least 4.9 kWh per kilogram",
      "Ash content: 0.4%",
      "Suitable appliances: Pellet stoves, inserts and boilers",
      "Recommended use: Domestic heating in an automatically fed appliance",
      "Storage: Dry, on the pallet, bags kept sealed until use",
    ],
  },
  {
    slug: "helios-granules-helios-palette-de-66-sacs-de-15-kg",
    shortDescription:
      "Granulés de bois Hélios, DINplus classe A1, cendres 0,30 %, diamètre 6 mm, palette de 66 sacs de 15 kg.",
    description:
      "Granulés de bois 100 % résineux, de 6 mm de diamètre, conditionnés en sacs de 15 kg et " +
      "réunis par palette de 66 sacs. Certification DINplus n° 7A219, classe A1, conforme à la " +
      "norme DIN EN ISO 17225-2." +
      "\n\n" +
      "Le taux de cendres officiel de ce granulé est de 0,30 %. C'est la valeur la plus basse de " +
      "notre sélection, et c'est la caractéristique qui justifie à elle seule de le retenir. La " +
      "classe A1 tolère jusqu'à 0,7 % ; à 0,30 %, le résidu est plus de deux fois moindre." +
      "\n\n" +
      "Concrètement, un taux de cendres ne se lit pas comme une performance abstraite mais comme " +
      "une fréquence de nettoyage. Un sac de 15 kg à 0,30 % laisse environ 45 grammes de cendres, " +
      "contre 105 grammes à 0,7 %. Sur une saison, la différence se compte en vidages du " +
      "cendrier — et surtout en propreté du creuset : c'est l'accumulation de résidu autour du " +
      "brûleur qui finit par étouffer l'arrivée d'air et faire consommer davantage l'appareil " +
      "pour la même chaleur." +
      "\n\n" +
      "Les autres valeurs restent conformes à la classe la plus stricte : humidité inférieure ou " +
      "égale à 8 %, pouvoir calorifique de 4,9 kWh par kilogramme, soit environ 73 kWh par sac. " +
      "Le calibre de 6 mm est celui attendu par les poêles, inserts et chaudières à granulés " +
      "vendus en France." +
      "\n\n" +
      "Conservez la palette au sec et n'ouvrez les sacs qu'au moment de remplir le réservoir. Un " +
      "granulé qui a repris l'humidité gonfle, se fend et produit des fines qui bourrent la vis " +
      "d'alimentation — un désagrément mécanique bien avant d'être une perte de rendement.",
    descriptionEn:
      "Wood pellets, 100% softwood, 6 mm in diameter, bagged in 15 kg sacks and grouped 66 to a " +
      "pallet. DINplus certification no. 7A219, class A1, compliant with DIN EN ISO 17225-2." +
      "\n\n" +
      "The official ash content of this pellet is 0.30%. It is the lowest figure in our selection, " +
      "and the characteristic that on its own justifies choosing it. Class A1 tolerates up to " +
      "0.7%; at 0.30%, the residue is more than halved." +
      "\n\n" +
      "In practical terms, an ash figure is not an abstract performance but a cleaning frequency. " +
      "A 15 kg bag at 0.30% leaves around 45 grams of ash, against 105 grams at 0.7%. Over a " +
      "season the difference shows up in ash-pan emptying — and above all in how clean the burn " +
      "pot stays: it is residue building up around the burner that eventually chokes the air " +
      "supply and makes the appliance consume more for the same heat." +
      "\n\n" +
      "The other figures stay within the strictest class: moisture at or below 8%, calorific value " +
      "of 4.9 kWh per kilogram, about 73 kWh per bag. The 6 mm calibre is the one expected by " +
      "pellet stoves, inserts and boilers sold in France." +
      "\n\n" +
      "Keep the pallet dry and open bags only when filling the hopper. A pellet that has taken " +
      "moisture back swells, splits and produces fines that clog the feed auger — a mechanical " +
      "nuisance well before it becomes a loss of output.",
    shortDescriptionEn:
      "Hélios wood pellets, DINplus class A1, ash 0.30%, calorific value 4.9 kWh/kg, pallet of 66 bags of 15 kg.",
    bullets: [
      "Produit : Granulés de bois",
      "Type de produit : Granulés pour appareil à alimentation automatique",
      "Composition : 100 % résineux",
      "Conditionnement : Palette sous film, sacs de 15 kg",
      "Quantité : 66 sacs de 15 kg",
      "Poids total : Environ 0,99 tonne",
      "Taille ou diamètre : Granulés de 6 mm",
      "Taux d'humidité : Inférieur ou égal à 8 %",
      "Pouvoir calorifique : 4,9 kWh par kilogramme",
      "Taux de cendres : 0,30 %",
      "Certifications ou normes : DINplus n° 7A219, classe A1, DIN EN ISO 17225-2",
      "Appareils compatibles : Poêles, inserts et chaudières à granulés",
      "Utilisation recommandée : Chauffage domestique avec entretien de brûleur espacé",
      "Stockage conseillé : Au sec, sur palette, sacs fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Wood pellets",
      "Product type: Pellets for automatically fed appliances",
      "Composition: 100% softwood",
      "Packaging: Pallet under film, 15 kg bags",
      "Quantity: 66 bags of 15 kg",
      "Total weight: About 0.99 tonnes",
      "Size or diameter: 6 mm pellets",
      "Moisture content: At or below 8%",
      "Calorific value: 4.9 kWh per kilogram",
      "Ash content: 0.30%",
      "Certifications and standards: DINplus no. 7A219, class A1, DIN EN ISO 17225-2",
      "Suitable appliances: Pellet stoves, inserts and boilers",
      "Recommended use: Domestic heating with less frequent burner cleaning",
      "Storage: Dry, on the pallet, bags kept sealed until use",
    ],
  },
  {
    slug: "cogra-granules-cogra-palette-de-66-sacs-de-15-kg",
    shortDescription:
      "Granulés de bois Cogra, certifiés DINplus classe A1, cendres 0,5 à 0,7 %, palette de 66 sacs de 15 kg.",
    description:
      "Granulés de bois 100 % résineux, certifiés DINplus sous le numéro 7A140, en classe A1, " +
      "conformes à la norme DIN EN ISO 17225-2. Conditionnement en sacs de 15 kg, par palette de " +
      "66 sacs, soit environ 0,99 tonne." +
      "\n\n" +
      "Ce granulé se distingue par son humidité, comprise entre 5 % et 6 %. C'est nettement en " +
      "dessous du plafond de 10 % admis en classe A1, et cette sécheresse se retrouve directement " +
      "dans le rendement annoncé : de 5,0 à 5,2 kWh par kilogramme, soit environ 75 à 78 kWh par " +
      "sac de 15 kg. Moins d'eau à évaporer, c'est plus d'énergie disponible pour chauffer la " +
      "pièce." +
      "\n\n" +
      "Le taux de cendres est donné entre 0,50 % et 0,70 % selon les lots. Cette fourchette n'est " +
      "pas une approximation de rédaction : le granulé est fabriqué à partir de sciure dont la " +
      "composition varie d'une production à l'autre, et les valeurs mesurées bougent en " +
      "conséquence. Un fabricant qui annonce une fourchette dit simplement ce que le contrôle " +
      "constate, là où une valeur unique est souvent une moyenne. Comptez, selon les lots, entre " +
      "75 et 105 grammes de cendres par sac." +
      "\n\n" +
      "L'appareil visé est le poêle, l'insert ou la chaudière à granulés, avec réservoir et vis " +
      "d'alimentation. La palette filmée se stocke telle quelle, mais impérativement au sec : " +
      "l'humidité ambiante est le seul ennemi sérieux d'un granulé de cette qualité." +
      "\n\n" +
      "Gardez les sacs fermés jusqu'à leur usage et videz-les directement dans le réservoir. Le " +
      "bénéfice d'une humidité à 5 % se perd en quelques semaines dans un local mal ventilé.",
    descriptionEn:
      "Wood pellets, 100% softwood, DINplus certified under number 7A140, in class A1, compliant " +
      "with DIN EN ISO 17225-2. Bagged in 15 kg sacks, 66 bags to a pallet, about 0.99 tonnes in " +
      "total." +
      "\n\n" +
      "This pellet stands out for its moisture content, between 5% and 6%. That is well under the " +
      "10% ceiling allowed in class A1, and the dryness shows directly in the stated output: 5.0 " +
      "to 5.2 kWh per kilogram, about 75 to 78 kWh per 15 kg bag. Less water to evaporate means " +
      "more energy available to heat the room." +
      "\n\n" +
      "Ash content is given as between 0.50% and 0.70% depending on the batch. That range is not " +
      "vague drafting: the pellet is made from sawdust whose composition varies from one " +
      "production run to the next, and the measured values move accordingly. A maker who quotes a " +
      "range is simply reporting what testing finds, where a single figure is often an average. " +
      "Expect, depending on the batch, between 75 and 105 grams of ash per bag." +
      "\n\n" +
      "The target appliance is a pellet stove, insert or boiler, with a hopper and feed auger. The " +
      "wrapped pallet stores as it is, but it must be kept dry: ambient humidity is the only " +
      "serious enemy of a pellet of this quality." +
      "\n\n" +
      "Keep the bags sealed until use and empty them straight into the hopper. The benefit of 5% " +
      "moisture is lost within weeks in a poorly ventilated room.",
    shortDescriptionEn:
      "Cogra wood pellets, DINplus class A1 certified, ash 0.5 to 0.7%, moisture 5 to 6%, pallet of 66 bags of 15 kg.",
    shippingWeightGrams: 990000, // 66 sacs de 15 kg, calcul déjà porté par le bullet en base
    bullets: [
      "Produit : Granulés de bois",
      "Type de produit : Granulés pour appareil à alimentation automatique",
      "Composition : 100 % résineux",
      "Conditionnement : Palette sous film, sacs de 15 kg",
      "Quantité : 66 sacs de 15 kg",
      "Poids total : Environ 0,99 tonne",
      "Taux d'humidité : De 5 % à 6 %",
      "Pouvoir calorifique : De 5,0 à 5,2 kWh par kilogramme",
      "Taux de cendres : De 0,50 % à 0,70 % selon les lots",
      "Certifications ou normes : DINplus n° 7A140, classe A1, DIN EN ISO 17225-2",
      "Appareils compatibles : Poêles, inserts et chaudières à granulés",
      "Utilisation recommandée : Chauffage domestique en appareil à alimentation automatique",
      "Stockage conseillé : Au sec, sur palette, sacs fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Wood pellets",
      "Product type: Pellets for automatically fed appliances",
      "Composition: 100% softwood",
      "Packaging: Pallet under film, 15 kg bags",
      "Quantity: 66 bags of 15 kg",
      "Total weight: About 0.99 tonnes",
      "Moisture content: 5% to 6%",
      "Calorific value: 5.0 to 5.2 kWh per kilogram",
      "Ash content: 0.50% to 0.70% depending on the batch",
      "Certifications and standards: DINplus no. 7A140, class A1, DIN EN ISO 17225-2",
      "Suitable appliances: Pellet stoves, inserts and boilers",
      "Recommended use: Domestic heating in an automatically fed appliance",
      "Storage: Dry, on the pallet, bags kept sealed until use",
    ],
  },
  {
    slug: "mkt-granules-total-energies-palette",
    shortDescription:
      "Granulés de bois TotalEnergies, sciure française, DINplus classe A1, palette de 66 sacs de 15 kg.",
    description:
      "Granulés de bois 100 % résineux, produits à partir de sciure de scierie française. " +
      "Diamètre 6 mm, sacs de 15 kg, palette de 66 sacs, soit environ 0,99 tonne. Certification " +
      "DINplus n° 7A269, classe A1, conforme à la norme DIN EN ISO 17225-2." +
      "\n\n" +
      "L'origine de la matière première mérite qu'on s'y arrête, parce qu'elle explique le " +
      "produit. La sciure de scierie n'est pas une ressource cultivée pour le chauffage : c'est " +
      "ce qui reste quand une grume a été débitée en planches. Le granulé valorise donc un " +
      "coproduit du sciage, sans mobiliser d'arbre supplémentaire, et la régularité de la matière " +
      "dépend directement de celle de la scierie qui l'alimente." +
      "\n\n" +
      "Les caractéristiques mesurées sont un taux de cendres compris entre 0,6 % et 0,7 %, une " +
      "humidité inférieure ou égale à 8 % et un pouvoir calorifique compris entre 4,8 et 5,3 kWh " +
      "par kilogramme, soit de 72 à 80 kWh par sac. Le taux de cendres se situe dans le haut de " +
      "la fourchette admise en classe A1, qui plafonne à 0,7 % : prévoyez un contrôle du creuset " +
      "un peu plus régulier qu'avec un granulé à 0,3 %." +
      "\n\n" +
      "Le calibre de 6 mm correspond à ce qu'attendent les poêles, inserts et chaudières à " +
      "granulés vendus en France, sans réglage particulier de la vis d'alimentation." +
      "\n\n" +
      "La palette se stocke telle quelle, dans un local sec et ventilé, sacs fermés jusqu'au " +
      "remplissage du réservoir. Le granulé absorbe l'humidité ambiante : c'est le seul facteur " +
      "qui puisse dégrader durablement un produit certifié.",
    descriptionEn:
      "Wood pellets, 100% softwood, produced from sawdust from a French sawmill. Diameter 6 mm, " +
      "15 kg bags, pallet of 66 bags, about 0.99 tonnes in total. DINplus certification no. 7A269, " +
      "class A1, compliant with DIN EN ISO 17225-2." +
      "\n\n" +
      "The origin of the raw material is worth pausing on, because it explains the product. " +
      "Sawmill sawdust is not a resource grown for heating: it is what remains once a log has been " +
      "cut into boards. The pellet therefore makes use of a by-product of sawing, without calling " +
      "on any additional tree, and the consistency of the material depends directly on that of the " +
      "sawmill supplying it." +
      "\n\n" +
      "The measured characteristics are an ash content between 0.6% and 0.7%, moisture at or below " +
      "8% and a calorific value between 4.8 and 5.3 kWh per kilogram, that is 72 to 80 kWh per " +
      "bag. Ash content sits in the upper part of the range allowed in class A1, which caps at " +
      "0.7%: plan to check the burn pot a little more often than with a pellet at 0.3%." +
      "\n\n" +
      "The 6 mm calibre matches what pellet stoves, inserts and boilers sold in France expect, " +
      "with no particular adjustment to the feed auger." +
      "\n\n" +
      "The pallet stores as it is, in a dry, ventilated space, with bags sealed until the hopper " +
      "is filled. Pellets absorb ambient moisture: it is the one factor that can lastingly degrade " +
      "a certified product.",
    shortDescriptionEn:
      "TotalEnergies wood pellets, French sawmill sawdust, DINplus class A1, ash 0.6 to 0.7%, pallet of 66 bags of 15 kg.",
    bullets: [
      "Produit : Granulés de bois",
      "Type de produit : Granulés pour appareil à alimentation automatique",
      "Composition : 100 % résineux, issu de sciure de scierie",
      "Conditionnement : Palette sous film, sacs de 15 kg",
      "Quantité : 66 sacs de 15 kg",
      "Poids total : Environ 0,99 tonne",
      "Taille ou diamètre : Granulés de 6 mm",
      "Taux d'humidité : Inférieur ou égal à 8 %",
      "Pouvoir calorifique : De 4,8 à 5,3 kWh par kilogramme",
      "Taux de cendres : De 0,6 % à 0,7 %",
      "Origine : Sciure de scierie française",
      "Certifications ou normes : DINplus n° 7A269, classe A1, DIN EN ISO 17225-2",
      "Appareils compatibles : Poêles, inserts et chaudières à granulés",
      "Utilisation recommandée : Chauffage domestique en appareil à alimentation automatique",
      "Stockage conseillé : Au sec, sur palette, sacs fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Wood pellets",
      "Product type: Pellets for automatically fed appliances",
      "Composition: 100% softwood, from sawmill sawdust",
      "Packaging: Pallet under film, 15 kg bags",
      "Quantity: 66 bags of 15 kg",
      "Total weight: About 0.99 tonnes",
      "Size or diameter: 6 mm pellets",
      "Moisture content: At or below 8%",
      "Calorific value: 4.8 to 5.3 kWh per kilogram",
      "Ash content: 0.6% to 0.7%",
      "Origin: French sawmill sawdust",
      "Certifications and standards: DINplus no. 7A269, class A1, DIN EN ISO 17225-2",
      "Suitable appliances: Pellet stoves, inserts and boilers",
      "Recommended use: Domestic heating in an automatically fed appliance",
      "Storage: Dry, on the pallet, bags kept sealed until use",
    ],
  },
  {
    // Correction : le bullet en base annoncait a tort "Certifie ENplus A1". La recherche
    // (registre DIN CERTCO, fabricant GDM Group, plusieurs distributeurs) etablit une
    // certification DINplus, sans aucune trace d'ENplus. C'est DINplus qui figure ci-dessous.
    slug: "limouzi-limouzi-granules-enplus-a1-palette-de-66-sacs-de-15-kg",
    shortDescription:
      "Granulés de bois Limouzi, résineux du Limousin, certifiés DINplus et PEFC, palette de 66 sacs de 15 kg.",
    description:
      "Granulés de bois 100 % résineux issus d'épicéa et de douglas du Limousin, de 6 mm de " +
      "diamètre, conditionnés en sacs de 15 kg et livrés par palette de 66 sacs." +
      "\n\n" +
      "C'est le seul granulé de la sélection dont l'essence et la région d'origine sont toutes " +
      "deux identifiées. L'épicéa et le douglas sont deux résineux largement plantés sur le " +
      "plateau limousin, et cette traçabilité change la nature de l'information disponible : on " +
      "ne sait pas seulement que le granulé est conforme, on sait de quel bois et de quelle forêt " +
      "il vient." +
      "\n\n" +
      "Le produit porte deux marques distinctes, qui ne contrôlent pas la même chose. La " +
      "certification DINplus, sous le numéro 7A243, porte sur le combustible lui-même : " +
      "composition, humidité, cendres, tenue mécanique, dans le cadre de la norme DIN EN ISO " +
      "17225-2, en classe A1. La certification PEFC, elle, ne dit rien de la qualité de " +
      "combustion : elle atteste que le bois provient de forêts gérées durablement, avec un suivi " +
      "de la chaîne de contrôle depuis la parcelle. Les deux sont complémentaires, aucune ne " +
      "remplace l'autre." +
      "\n\n" +
      "Les valeurs relevées sont un taux de cendres inférieur à 0,5 %, une humidité inférieure à " +
      "8 % et un pouvoir calorifique de 4,8 kWh par kilogramme, soit environ 72 kWh par sac de " +
      "15 kg." +
      "\n\n" +
      "Les granulés alimentent poêles, inserts et chaudières à granulés. Stockez la palette au " +
      "sec, sacs fermés jusqu'à l'usage : un granulé qui a repris l'humidité perd sa tenue " +
      "mécanique et produit des fines, indépendamment de sa certification d'origine.",
    descriptionEn:
      "Wood pellets, 100% softwood from Limousin spruce and Douglas fir, 6 mm in diameter, bagged " +
      "in 15 kg sacks and delivered on a pallet of 66 bags." +
      "\n\n" +
      "This is the only pellet in the selection with both its species and its region of origin " +
      "identified. Spruce and Douglas fir are two softwoods widely planted across the Limousin " +
      "plateau, and that traceability changes the nature of the information available: you know " +
      "not merely that the pellet is compliant, but which wood and which forest it comes from." +
      "\n\n" +
      "The product carries two distinct marks, which do not check the same thing. DINplus " +
      "certification, under number 7A243, covers the fuel itself: composition, moisture, ash, " +
      "mechanical durability, within DIN EN ISO 17225-2, in class A1. PEFC certification says " +
      "nothing about combustion quality: it attests that the wood comes from sustainably managed " +
      "forests, with chain-of-custody tracking from the plot onward. The two are complementary; " +
      "neither replaces the other." +
      "\n\n" +
      "The recorded figures are an ash content below 0.5%, moisture below 8% and a calorific value " +
      "of 4.8 kWh per kilogram, about 72 kWh per 15 kg bag." +
      "\n\n" +
      "The pellets feed stoves, inserts and pellet boilers. Store the pallet dry, with bags sealed " +
      "until use: a pellet that has taken moisture back loses its mechanical durability and " +
      "produces fines, whatever certification it started with.",
    shortDescriptionEn:
      "Limouzi wood pellets, Limousin spruce and Douglas fir, DINplus and PEFC certified, ash below 0.5%, pallet of 66 bags of 15 kg.",
    bullets: [
      "Produit : Granulés de bois",
      "Type de produit : Granulés pour appareil à alimentation automatique",
      "Composition : 100 % résineux, épicéa et douglas",
      "Conditionnement : Palette sous film, sacs de 15 kg",
      "Quantité : 66 sacs de 15 kg",
      "Taille ou diamètre : Granulés de 6 mm",
      "Taux d'humidité : Inférieur à 8 %",
      "Pouvoir calorifique : 4,8 kWh par kilogramme",
      "Taux de cendres : Inférieur à 0,5 %",
      "Origine : Épicéa et douglas du Limousin",
      "Certifications ou normes : DINplus n° 7A243, PEFC, classe A1, DIN EN ISO 17225-2",
      "Appareils compatibles : Poêles, inserts et chaudières à granulés",
      "Utilisation recommandée : Chauffage domestique en appareil à alimentation automatique",
      "Stockage conseillé : Au sec, sur palette, sacs fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Wood pellets",
      "Product type: Pellets for automatically fed appliances",
      "Composition: 100% softwood, spruce and Douglas fir",
      "Packaging: Pallet under film, 15 kg bags",
      "Quantity: 66 bags of 15 kg",
      "Size or diameter: 6 mm pellets",
      "Moisture content: Below 8%",
      "Calorific value: 4.8 kWh per kilogram",
      "Ash content: Below 0.5%",
      "Origin: Limousin spruce and Douglas fir",
      "Certifications and standards: DINplus no. 7A243, PEFC, class A1, DIN EN ISO 17225-2",
      "Suitable appliances: Pellet stoves, inserts and boilers",
      "Recommended use: Domestic heating in an automatically fed appliance",
      "Storage: Dry, on the pallet, bags kept sealed until use",
    ],
  },
  {
    // Le nom français annonce 66 sacs, le nom anglais 78, et le poids en base
    // (1,17 t) correspond à 78 sacs. La contradiction n'est pas tranchable depuis
    // les données : ni quantité ni poids ne figurent donc dans les
    // caractéristiques ci-dessous, et la description ne cite aucun des deux.
    slug: "woodstock-granules-woodstock-palette-de-66-sacs-de-15-kg",
    shortDescription:
      "Granulés de bois Woodstock, doublement certifiés DINplus et NF Biocombustibles, sacs de 15 kg sur palette.",
    description:
      "Granulés de bois vierge de 6 mm de diamètre, conditionnés en sacs de 15 kg et livrés sur " +
      "palette. La particularité de ce produit tient à ses certifications : il est le seul de la " +
      "sélection à porter à la fois DINplus et la marque NF." +
      "\n\n" +
      "DINplus, sous le numéro 7A288, est une certification allemande devenue une référence " +
      "européenne pour le granulé de bois : elle vérifie la matière première, l'humidité, le taux " +
      "de cendres et la tenue mécanique, dans le cadre de la norme DIN EN ISO 17225-2. La marque " +
      "NF Biocombustibles Solides Granulés, délivrée en France par le FCBA sous le numéro " +
      "D79360-016, repose sur la même norme mais avec un organisme certificateur français et un " +
      "plan de contrôle propre." +
      "\n\n" +
      "Cumuler les deux n'apporte pas une qualité doublée : cela signifie que le producteur se " +
      "soumet à deux plans d'audit indépendants, avec deux séries de prélèvements et deux " +
      "organismes habilités à retirer leur marque. Pour l'acheteur, c'est une garantie de " +
      "régularité dans le temps davantage qu'une performance instantanée supérieure." +
      "\n\n" +
      "Les caractéristiques mesurées sont un taux de cendres inférieur ou égal à 0,5 %, une " +
      "humidité inférieure ou égale à 8 % et un pouvoir calorifique compris entre 4,8 et 5,3 kWh " +
      "par kilogramme, soit de 72 à 80 kWh par sac de 15 kg." +
      "\n\n" +
      "Le calibre de 6 mm convient aux poêles, inserts et chaudières à granulés du marché " +
      "français. Conservez la palette au sec, sacs fermés jusqu'à l'usage : aucune certification " +
      "ne protège un granulé stocké dans un local humide.",
    descriptionEn:
      "Virgin wood pellets, 6 mm in diameter, bagged in 15 kg sacks and delivered on a pallet. " +
      "What sets this product apart is its certification: it is the only one in the selection to " +
      "carry both DINplus and the French NF mark." +
      "\n\n" +
      "DINplus, under number 7A288, is a German certification that has become a European reference " +
      "for wood pellets: it verifies the raw material, moisture, ash content and mechanical " +
      "durability, within DIN EN ISO 17225-2. The NF Biocombustibles Solides Granulés mark, issued " +
      "in France by FCBA under number D79360-016, rests on the same standard but with a French " +
      "certifying body and its own inspection plan." +
      "\n\n" +
      "Holding both does not amount to doubled quality: it means the producer submits to two " +
      "independent audit plans, with two sets of samples and two bodies empowered to withdraw " +
      "their mark. For the buyer, that is a guarantee of consistency over time rather than higher " +
      "instantaneous performance." +
      "\n\n" +
      "The measured characteristics are an ash content at or below 0.5%, moisture at or below 8% " +
      "and a calorific value between 4.8 and 5.3 kWh per kilogram, that is 72 to 80 kWh per 15 kg " +
      "bag." +
      "\n\n" +
      "The 6 mm calibre suits pellet stoves, inserts and boilers on the French market. Keep the " +
      "pallet dry, with bags sealed until use: no certification protects a pellet stored in a damp " +
      "room.",
    shortDescriptionEn:
      "Woodstock virgin wood pellets, dual-certified DINplus and NF Biocombustibles, ash at or below 0.5%, 15 kg bags on a pallet.",
    bullets: [
      "Produit : Granulés de bois",
      "Type de produit : Granulés de bois vierge, pour appareil à alimentation automatique",
      "Composition : Bois vierge",
      "Conditionnement : Palette de sacs de 15 kg",
      "Taille ou diamètre : Granulés de 6 mm",
      "Taux d'humidité : Inférieur ou égal à 8 %",
      "Pouvoir calorifique : De 4,8 à 5,3 kWh par kilogramme",
      "Taux de cendres : Inférieur ou égal à 0,5 %",
      "Certifications ou normes : DINplus n° 7A288 et NF Biocombustibles n° D79360-016 (FCBA)",
      "Appareils compatibles : Poêles, inserts et chaudières à granulés",
      "Utilisation recommandée : Chauffage domestique en appareil à alimentation automatique",
      "Stockage conseillé : Au sec, sur palette, sacs fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Wood pellets",
      "Product type: Virgin wood pellets for automatically fed appliances",
      "Composition: Virgin wood",
      "Packaging: Pallet of 15 kg bags",
      "Size or diameter: 6 mm pellets",
      "Moisture content: At or below 8%",
      "Calorific value: 4.8 to 5.3 kWh per kilogram",
      "Ash content: At or below 0.5%",
      "Certifications and standards: DINplus no. 7A288 and NF Biocombustibles no. D79360-016 (FCBA)",
      "Suitable appliances: Pellet stoves, inserts and boilers",
      "Recommended use: Domestic heating in an automatically fed appliance",
      "Storage: Dry, on the pallet, bags kept sealed until use",
    ],
  },
  {
    slug: "mkt-granules-badger-palette",
    shortDescription:
      "Granulés de bois Badger, résineux écorcé, certifiés DINplus classe A1, palette de 66 sacs de 15 kg.",
    description:
      "Granulés de bois 100 % résineux écorcé, fabriqués à Virton et à Thimister, en Belgique. " +
      "Diamètre 6 mm, sacs de 15 kg, palette de 66 sacs, soit environ 0,99 tonne. Certification " +
      "DINplus n° 7A072, classe A1, conforme à la norme DIN EN ISO 17225-2." +
      "\n\n" +
      "La mention « écorcé » est la donnée la plus utile de cette fiche. L'écorce est la partie de " +
      "l'arbre qui concentre le plus de minéraux et de particules de terre, et c'est elle qui " +
      "produit l'essentiel des cendres à la combustion. Un granulé fabriqué à partir de bois " +
      "préalablement débarrassé de son écorce part donc d'une matière plus propre, ce qui se " +
      "retrouve directement dans le creuset du brûleur." +
      "\n\n" +
      "L'humidité reste inférieure à 10 %, le plafond admis en classe A1. Cette classe est la plus " +
      "stricte de la norme européenne sur les biocombustibles solides : elle impose une matière " +
      "première en bois vierge et encadre le taux de cendres comme la tenue mécanique du granulé." +
      "\n\n" +
      "La production est répartie sur deux sites belges, Virton en province de Luxembourg et " +
      "Thimister en province de Liège. Les granulés alimentent les poêles, inserts et chaudières " +
      "à granulés, appareils à réservoir et vis d'alimentation ; le calibre de 6 mm est celui " +
      "attendu par la quasi-totalité du parc installé en France." +
      "\n\n" +
      "La palette se conserve telle quelle dans un local sec. Ne sortez du sac que ce que le " +
      "réservoir peut recevoir : c'est le contact prolongé avec l'air humide, plus que la durée " +
      "de stockage elle-même, qui dégrade le granulé.",
    descriptionEn:
      "Wood pellets, 100% debarked softwood, made in Virton and Thimister, Belgium. Diameter 6 mm, " +
      "15 kg bags, pallet of 66 bags, about 0.99 tonnes in total. DINplus certification no. 7A072, " +
      "class A1, compliant with DIN EN ISO 17225-2." +
      "\n\n" +
      "The word \"debarked\" is the most useful detail on this sheet. Bark is the part of the tree " +
      "that concentrates the most minerals and soil particles, and it is what produces most of the " +
      "ash on combustion. A pellet made from wood stripped of its bark beforehand therefore starts " +
      "from cleaner material, and that shows directly in the burn pot." +
      "\n\n" +
      "Moisture stays below 10%, the ceiling allowed in class A1. That class is the strictest tier " +
      "of the European standard on solid biofuels: it requires virgin wood as raw material and " +
      "sets limits on ash content as well as on the mechanical durability of the pellet." +
      "\n\n" +
      "Production is split across two Belgian sites, Virton in the province of Luxembourg and " +
      "Thimister in the province of Liège. The pellets feed stoves, inserts and pellet boilers, " +
      "appliances with a hopper and feed auger; the 6 mm calibre is what almost the entire " +
      "installed base in France expects." +
      "\n\n" +
      "The pallet keeps as it is in a dry room. Take out of the bag only what the hopper can " +
      "hold: it is prolonged contact with damp air, more than storage time itself, that degrades " +
      "the pellet.",
    shortDescriptionEn:
      "Badger wood pellets, debarked softwood made in Belgium, DINplus class A1 certified, pallet of 66 bags of 15 kg.",
    bullets: [
      "Produit : Granulés de bois",
      "Type de produit : Granulés pour appareil à alimentation automatique",
      "Composition : 100 % résineux écorcé",
      "Conditionnement : Palette sous film, sacs de 15 kg",
      "Quantité : 66 sacs de 15 kg",
      "Poids total : Environ 0,99 tonne",
      "Taille ou diamètre : Granulés de 6 mm",
      "Taux d'humidité : Inférieur à 10 %",
      "Origine : Virton et Thimister, Belgique",
      "Certifications ou normes : DINplus n° 7A072, classe A1, DIN EN ISO 17225-2",
      "Appareils compatibles : Poêles, inserts et chaudières à granulés",
      "Utilisation recommandée : Chauffage domestique en appareil à alimentation automatique",
      "Stockage conseillé : Au sec, sur palette, sacs fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Wood pellets",
      "Product type: Pellets for automatically fed appliances",
      "Composition: 100% debarked softwood",
      "Packaging: Pallet under film, 15 kg bags",
      "Quantity: 66 bags of 15 kg",
      "Total weight: About 0.99 tonnes",
      "Size or diameter: 6 mm pellets",
      "Moisture content: Below 10%",
      "Origin: Virton and Thimister, Belgium",
      "Certifications and standards: DINplus no. 7A072, class A1, DIN EN ISO 17225-2",
      "Suitable appliances: Pellet stoves, inserts and boilers",
      "Recommended use: Domestic heating in an automatically fed appliance",
      "Storage: Dry, on the pallet, bags kept sealed until use",
    ],
  },
  {
    slug: "mkt-granules-piveteau-hp-plus-palette",
    shortDescription:
      "Granulés de bois Piveteau HP+, résineux français, DINplus, cendres sous 0,35 %, palette de 72 sacs de 15 kg.",
    description:
      "Granulés de bois 100 % résineux français — pin, douglas et épicéa — de 6 mm de diamètre. " +
      "Conditionnement en sacs de 15 kg, par palette de 72 sacs, soit environ 1,08 tonne : c'est " +
      "la palette la plus fournie de la sélection. Certification DINplus n° 7A109, conforme à la " +
      "norme DIN EN ISO 17225-2." +
      "\n\n" +
      "Ce granulé est le seul de la sélection dont la densité en vrac est documentée : au moins " +
      "650 kg par mètre cube. C'est une donnée que peu de fabricants publient, et elle est " +
      "pourtant déterminante pour un appareil à alimentation automatique. Un granulé dense " +
      "contient plus de matière à volume égal, ce qui veut dire plus d'énergie par tour de vis " +
      "d'alimentation et un réservoir qui tient plus longtemps entre deux remplissages. Une " +
      "densité élevée traduit aussi une compression soignée, donc un granulé qui résiste mieux " +
      "aux manipulations sans se réduire en fines." +
      "\n\n" +
      "Les autres valeurs sont serrées : taux de cendres inférieur ou égal à 0,35 %, humidité " +
      "inférieure à 6,5 %, pouvoir calorifique supérieur à 4,85 kWh par kilogramme, soit plus de " +
      "72 kWh par sac. L'humidité sous 6,5 % place ce produit parmi les plus secs proposés ici." +
      "\n\n" +
      "Les trois essences — pin, douglas et épicéa — sont des résineux de plantation français, " +
      "les mêmes qui alimentent la filière du sciage. Le granulé en valorise la sciure." +
      "\n\n" +
      "Compatible avec les poêles, inserts et chaudières à granulés. Stockez la palette au sec, " +
      "sacs fermés : la densité et la tenue mécanique obtenues à la presse ne survivent pas à " +
      "une reprise d'humidité prolongée.",
    descriptionEn:
      "Wood pellets, 100% French softwood — pine, Douglas fir and spruce — 6 mm in diameter. " +
      "Bagged in 15 kg sacks, 72 bags to a pallet, about 1.08 tonnes: the fullest pallet in the " +
      "selection. DINplus certification no. 7A109, compliant with DIN EN ISO 17225-2." +
      "\n\n" +
      "This is the only pellet in the selection with a documented bulk density: at least 650 kg " +
      "per cubic metre. Few makers publish that figure, yet it matters for an automatically fed " +
      "appliance. A dense pellet holds more material for the same volume, which means more energy " +
      "per turn of the feed auger and a hopper that lasts longer between refills. High density " +
      "also reflects careful compression, so a pellet that better withstands handling without " +
      "breaking down into fines." +
      "\n\n" +
      "The other figures are tight: ash content at or below 0.35%, moisture below 6.5%, calorific " +
      "value above 4.85 kWh per kilogram, that is more than 72 kWh per bag. Moisture under 6.5% " +
      "places this product among the driest offered here." +
      "\n\n" +
      "The three species — pine, Douglas fir and spruce — are French plantation softwoods, the " +
      "same ones that feed the sawmilling industry. The pellet makes use of their sawdust." +
      "\n\n" +
      "Compatible with pellet stoves, inserts and boilers. Store the pallet dry, bags sealed: the " +
      "density and mechanical durability achieved in the press do not survive prolonged exposure " +
      "to moisture.",
    shortDescriptionEn:
      "Piveteau HP+ wood pellets, French softwood, DINplus certified, ash below 0.35%, calorific value above 4.85 kWh/kg, pallet of 72 bags of 15 kg.",
    bullets: [
      "Produit : Granulés de bois",
      "Type de produit : Granulés pour appareil à alimentation automatique",
      "Composition : 100 % résineux français, pin, douglas et épicéa",
      "Conditionnement : Palette sous film, sacs de 15 kg",
      "Quantité : 72 sacs de 15 kg",
      "Poids total : Environ 1,08 tonne",
      "Taille ou diamètre : Granulés de 6 mm",
      "Taux d'humidité : Inférieur à 6,5 %",
      "Pouvoir calorifique : Supérieur à 4,85 kWh par kilogramme",
      "Taux de cendres : Inférieur ou égal à 0,35 %",
      "Origine : Résineux français",
      "Certifications ou normes : DINplus n° 7A109, DIN EN ISO 17225-2",
      "Appareils compatibles : Poêles, inserts et chaudières à granulés",
      "Utilisation recommandée : Chauffage domestique en appareil à alimentation automatique",
      "Stockage conseillé : Au sec, sur palette, sacs fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Wood pellets",
      "Product type: Pellets for automatically fed appliances",
      "Composition: 100% French softwood, pine, Douglas fir and spruce",
      "Packaging: Pallet under film, 15 kg bags",
      "Quantity: 72 bags of 15 kg",
      "Total weight: About 1.08 tonnes",
      "Size or diameter: 6 mm pellets",
      "Moisture content: Below 6.5%",
      "Calorific value: Above 4.85 kWh per kilogram",
      "Ash content: At or below 0.35%",
      "Origin: French softwood",
      "Certifications and standards: DINplus no. 7A109, DIN EN ISO 17225-2",
      "Suitable appliances: Pellet stoves, inserts and boilers",
      "Recommended use: Domestic heating in an automatically fed appliance",
      "Storage: Dry, on the pallet, bags kept sealed until use",
    ],
  },

  // --- Bûches compressées, marques tierces (identifiants : docs/research/identifiants-granules.md) ---
  //
  // Cinq produits d'un même principe — de la sciure comprimée sans liant — mais
  // de procédés et de formats différents : rond, rond à trou, cylindrique,
  // octogonal, brique. Chaque fiche part de la forme et du procédé, car c'est
  // ce qui détermine la durée de combustion et l'usage. L'avertissement de
  // puissance repris du guide de catégorie figure sur les produits les plus
  // denses, là où il compte vraiment.
  {
    slug: "crepito-buches-compressees-hetre-960-kg",
    shortDescription:
      "Bûches compressées rondes Crépito hêtre, cendres sous 1,5 %, PCI 4,9 kWh/kg, palette de 96 paquets de 10 kg.",
    description:
      "Bûches compressées de forme ronde, obtenues à partir de sciures et de copeaux de hêtre non " +
      "traités, sans aucun liant chimique. La palette réunit 96 paquets de 10 kg, soit 960 kg." +
      "\n\n" +
      "La cohésion d'une bûche compressée ne doit rien à une colle : elle vient de la lignine " +
      "naturellement contenue dans le bois, libérée par la pression exercée à la presse et qui " +
      "ressoude les particules en refroidissant. Une bûche de ce type ne rejette donc dans le " +
      "conduit rien de plus que le bois dont elle est issue — c'est ce qui la distingue " +
      "radicalement d'un aggloméré." +
      "\n\n" +
      "La qualité de cette gamme est contrôlée par le laboratoire CERIC, et le produit porte la " +
      "mention Bois de France. Les valeurs mesurées sont un taux de cendres inférieur ou égal à " +
      "1,5 %, une humidité inférieure ou égale à 12 % et un pouvoir calorifique de 4,9 kWh par " +
      "kilogramme, soit environ 49 kWh par paquet de 10 kg." +
      "\n\n" +
      "Chaque bûche brûle de une heure à une heure et demie. C'est une durée de journée plutôt que " +
      "de nuit : elle convient à une chauffe suivie où l'on recharge régulièrement, en complément " +
      "du bois bûche ou à sa place quand on manque de place pour stocker du fendu. À quantité de " +
      "chaleur égale, le compressé occupe environ trois fois moins de volume que le bois fendu." +
      "\n\n" +
      "Compatible avec les poêles, les inserts et les chaudières à bois. Stockez les paquets au " +
      "sec et ne les ouvrez qu'à l'usage : une bûche compressée qui reprend l'humidité gonfle, se " +
      "fend et perd la densité qui fait tout son intérêt.",
    descriptionEn:
      "Round compressed logs, made from untreated beech sawdust and shavings, with no chemical " +
      "binder of any kind. The pallet holds 96 packs of 10 kg, totalling 960 kg." +
      "\n\n" +
      "The cohesion of a compressed log owes nothing to glue: it comes from the lignin naturally " +
      "present in the wood, released by the pressure applied in the press and re-bonding the " +
      "particles as it cools. A log of this kind therefore sends nothing up the flue that the wood " +
      "it came from would not — which is what sets it radically apart from a bonded board product." +
      "\n\n" +
      "Quality across this range is checked by the CERIC laboratory, and the product carries the " +
      "Bois de France mark. The measured figures are an ash content at or below 1.5%, moisture at " +
      "or below 12% and a calorific value of 4.9 kWh per kilogram, about 49 kWh per 10 kg pack." +
      "\n\n" +
      "Each log burns for one to one and a half hours. That is a daytime duration rather than an " +
      "overnight one: it suits sustained heating where you reload regularly, alongside cordwood or " +
      "in its place when there is no room to store split logs. For the same amount of heat, " +
      "compressed wood takes up about three times less space than split wood." +
      "\n\n" +
      "Compatible with wood stoves, inserts and wood boilers. Store the packs dry and open them " +
      "only at the point of use: a compressed log that takes moisture back swells, splits and " +
      "loses the density that makes it worthwhile.",
    shortDescriptionEn:
      "Crépito round compressed beech logs, ash below 1.5%, burns about 1 to 1.5 hours per log, pallet of 96 packs of 10 kg.",
    bullets: [
      "Produit : Bûches de bois compressé",
      "Type de produit : Bûches rondes compressées, prêtes à brûler",
      "Composition : Sciures et copeaux de hêtre non traités, sans liant chimique",
      "Conditionnement : Palette de paquets de 10 kg",
      "Quantité : 96 paquets de 10 kg",
      "Poids total : 960 kg",
      "Taux d'humidité : Inférieur ou égal à 12 %",
      "Pouvoir calorifique : 4,9 kWh par kilogramme",
      "Taux de cendres : Inférieur ou égal à 1,5 %",
      "Durée de combustion : Environ 1 h à 1 h 30 par bûche",
      "Origine : Mention Bois de France",
      "Certifications ou normes : Qualité contrôlée par le laboratoire CERIC",
      "Appareils compatibles : Poêles, inserts et chaudières à bois",
      "Utilisation recommandée : Chauffe de journée, avec recharges régulières",
      "Stockage conseillé : Au sec, paquets fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Compressed wood logs",
      "Product type: Round compressed logs, ready to burn",
      "Composition: Untreated beech sawdust and shavings, no chemical binder",
      "Packaging: Pallet of 10 kg packs",
      "Quantity: 96 packs of 10 kg",
      "Total weight: 960 kg",
      "Moisture content: At or below 12%",
      "Calorific value: 4.9 kWh per kilogram",
      "Ash content: At or below 1.5%",
      "Burn time: About 1 to 1.5 hours per log",
      "Origin: Bois de France mark",
      "Certifications and standards: Quality checked by the CERIC laboratory",
      "Suitable appliances: Wood stoves, inserts and wood boilers",
      "Recommended use: Daytime heating, with regular reloads",
      "Storage: Dry, packs kept sealed until use",
    ],
  },
  {
    slug: "ma-buchhetre-manubois-ronde-900-kg",
    shortDescription:
      "Bûches compressées rondes à trou Ma Bûch'Hêtre, densité supérieure à 1 050 kg/m³, palette de 90 paquets de 10 kg.",
    description:
      "Bûches compressées rondes percées d'un trou central, produites par Manubois à partir de " +
      "hêtre débarrassé de son écorce, sans additif. La palette réunit 90 paquets de 10 kg, soit " +
      "900 kg." +
      "\n\n" +
      "Le trou central n'est pas un détail de fabrication mais la caractéristique déterminante de " +
      "cette bûche. Il crée un tirage à l'intérieur même de la bûche : l'air passe par le canal, " +
      "la flamme se propage depuis le cœur en plus de la surface, et l'allumage est nettement plus " +
      "rapide que sur une bûche pleine. En pratique, on démarre un feu avec ce format sans avoir " +
      "à multiplier le petit bois." +
      "\n\n" +
      "L'absence d'écorce explique le taux de cendres, inférieur à 0,5 % — l'une des valeurs les " +
      "plus basses de la catégorie. L'écorce est la partie de l'arbre qui concentre les minéraux " +
      "et les particules de terre ; l'ôter avant compression, c'est retirer l'essentiel de ce qui " +
      "finira dans le cendrier." +
      "\n\n" +
      "La densité dépasse 1 050 kg par mètre cube, pour une humidité inférieure à 8 % et un " +
      "pouvoir calorifique de 4,8 kWh par kilogramme. Chaque bûche tient de une heure et demie à " +
      "deux heures et demie, ce qui en fait un format polyvalent : assez vif pour lancer un feu, " +
      "assez dense pour le tenir." +
      "\n\n" +
      "Compatible avec les poêles, les inserts et les chaudières à bois. Attention au chargement : " +
      "le bois compressé chauffe fort, et dans un petit poêle une bûche suffit là où il en " +
      "faudrait trois en feuillu. Stockez les paquets au sec, fermés jusqu'à l'usage.",
    descriptionEn:
      "Round compressed logs with a central core hole, produced by Manubois from beech stripped of " +
      "its bark, with no additive. The pallet holds 90 packs of 10 kg, totalling 900 kg." +
      "\n\n" +
      "The core hole is not a manufacturing detail but the defining feature of this log. It creates " +
      "a draught inside the log itself: air passes through the channel, the flame spreads from the " +
      "core as well as the surface, and lighting is markedly faster than with a solid log. In " +
      "practice, you can start a fire with this format without piling on kindling." +
      "\n\n" +
      "The absence of bark explains the ash content, below 0.5% — one of the lowest figures in the " +
      "category. Bark is the part of the tree that concentrates minerals and soil particles; " +
      "removing it before compression takes away most of what would end up in the ash pan." +
      "\n\n" +
      "Density exceeds 1,050 kg per cubic metre, with moisture below 8% and a calorific value of " +
      "4.8 kWh per kilogram. Each log lasts from one and a half to two and a half hours, which " +
      "makes it a versatile format: lively enough to start a fire, dense enough to hold it." +
      "\n\n" +
      "Compatible with wood stoves, inserts and wood boilers. Take care when loading: compressed " +
      "wood burns hot, and in a small stove one log does the work of three in hardwood. Store the " +
      "packs dry, sealed until use.",
    shortDescriptionEn:
      "Ma Bûch'Hêtre round hollow-core compressed beech logs, density above 1,050 kg/m³, moisture below 8%, pallet of 90 packs of 10 kg.",
    bullets: [
      "Produit : Bûches de bois compressé",
      "Type de produit : Bûches rondes à trou central, compressées",
      "Composition : Hêtre sans écorce, sans additif",
      "Conditionnement : Palette de paquets de 10 kg",
      "Quantité : 90 paquets de 10 kg",
      "Poids total : 900 kg",
      "Densité : Supérieure à 1 050 kg par mètre cube",
      "Taux d'humidité : Inférieur à 8 %",
      "Pouvoir calorifique : 4,8 kWh par kilogramme",
      "Taux de cendres : Inférieur à 0,5 %",
      "Durée de combustion : Environ 1 h 30 à 2 h 30 par bûche",
      "Appareils compatibles : Poêles, inserts et chaudières à bois",
      "Utilisation recommandée : Allumage rapide puis chauffe prolongée",
      "Stockage conseillé : Au sec, paquets fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Compressed wood logs",
      "Product type: Round compressed logs with a central core hole",
      "Composition: Beech without bark, no additive",
      "Packaging: Pallet of 10 kg packs",
      "Quantity: 90 packs of 10 kg",
      "Total weight: 900 kg",
      "Density: Above 1,050 kg per cubic metre",
      "Moisture content: Below 8%",
      "Calorific value: 4.8 kWh per kilogram",
      "Ash content: Below 0.5%",
      "Burn time: About 1.5 to 2.5 hours per log",
      "Suitable appliances: Wood stoves, inserts and wood boilers",
      "Recommended use: Fast lighting then sustained heat",
      "Storage: Dry, packs kept sealed until use",
    ],
  },
  {
    slug: "ruf-ruf-buches-compressees-palette-960-kg",
    shortDescription:
      "Briquettes de bois RUF, hêtre ou chêne, densité 1,0 à 1,1 kg/dm³, palette de 960 kg.",
    description:
      "Briquettes de bois compressées, en hêtre ou en chêne selon la variante, sans liant " +
      "chimique, livrées par palette de 960 kg." +
      "\n\n" +
      "Leur particularité tient au procédé : la matière est comprimée sous une pression de 200 à " +
      "400 bars. C'est cette compression qui donne à la briquette sa densité, comprise entre 1,0 " +
      "et 1,1 kg par décimètre cube — soit une matière plus dense que le bois massif dont elle " +
      "est issue, puisque la compression supprime les vides de la structure cellulaire." +
      "\n\n" +
      "La combustion se déroule en deux temps nettement distincts, et c'est ce qui rend ce format " +
      "intéressant à connaître : environ deux heures de flamme, puis environ deux heures de " +
      "braise. La première phase chauffe la pièce et fait monter l'appareil en température, la " +
      "seconde entretient la chaleur sans flamme visible. Un chargement couvre donc environ quatre " +
      "heures au total, ce qui permet de tenir une soirée avec une seule recharge." +
      "\n\n" +
      "Le pouvoir calorifique est compris entre 4,7 et 5,3 kWh par kilogramme, la fourchette " +
      "reflétant l'essence effectivement pressée. Le taux de cendres avoisine 1,0 % : c'est plus " +
      "que sur une briquette de hêtre écorcé, à prendre en compte si vous visez un entretien " +
      "minimal du cendrier." +
      "\n\n" +
      "Compatible avec les poêles, les inserts et les chaudières à bois. Ne surchargez pas le " +
      "foyer : une briquette de cette densité dégage beaucoup plus de chaleur qu'une bûche de " +
      "feuillu de même volume, et un appareil trop chargé monte au-delà de ce qu'il supporte. " +
      "Stockez la palette au sec.",
    descriptionEn:
      "Compressed wood briquettes, in beech or oak depending on the variant, with no chemical " +
      "binder, delivered on a 960 kg pallet." +
      "\n\n" +
      "What sets them apart is the process: the material is compressed at a pressure of 200 to 400 " +
      "bars. That compression is what gives the briquette its density, between 1.0 and 1.1 kg per " +
      "cubic decimetre — a denser material than the solid wood it came from, since compression " +
      "removes the voids in the cell structure." +
      "\n\n" +
      "Burning happens in two clearly distinct stages, and that is what makes this format worth " +
      "knowing: around two hours of flame, then around two hours of ember. The first phase heats " +
      "the room and brings the appliance up to temperature, the second sustains the heat with no " +
      "visible flame. A single charge therefore covers about four hours in total, enough to see " +
      "out an evening with one reload." +
      "\n\n" +
      "Calorific value ranges between 4.7 and 5.3 kWh per kilogram, the spread reflecting the " +
      "species actually pressed. Ash content is around 1.0%: more than a debarked beech briquette, " +
      "worth weighing if you are after minimal ash-pan maintenance." +
      "\n\n" +
      "Compatible with wood stoves, inserts and wood boilers. Do not overload the firebox: a " +
      "briquette of this density gives off far more heat than a hardwood log of the same volume, " +
      "and an over-filled appliance runs beyond what it is built for. Store the pallet dry.",
    shortDescriptionEn:
      "RUF compressed wood briquettes, beech or oak, pressed at 200 to 400 bars, density 1.0 to 1.1 kg/dm³, pallet of 960 kg.",
    shippingWeightGrams: 960000, // palette 960 kg, docs/research/identifiants-granules.md
    bullets: [
      "Produit : Bûches de bois compressé",
      "Type de produit : Briquettes compressées entre 200 et 400 bars",
      "Composition : Hêtre ou chêne selon la variante, sans liant chimique",
      "Conditionnement : Palette",
      "Poids total : 960 kg",
      "Densité : De 1,0 à 1,1 kg par décimètre cube",
      "Pouvoir calorifique : De 4,7 à 5,3 kWh par kilogramme",
      "Taux de cendres : Environ 1,0 %",
      "Durée de combustion : Environ 2 h de flamme, puis 2 h de braise",
      "Appareils compatibles : Poêles, inserts et chaudières à bois",
      "Utilisation recommandée : Chauffe de soirée en une seule recharge",
      "Stockage conseillé : Au sec, à l'abri de l'humidité",
    ],
    bulletsEn: [
      "Product: Compressed wood logs",
      "Product type: Briquettes pressed at 200 to 400 bars",
      "Composition: Beech or oak depending on the variant, no chemical binder",
      "Packaging: Pallet",
      "Total weight: 960 kg",
      "Density: 1.0 to 1.1 kg per cubic decimetre",
      "Calorific value: 4.7 to 5.3 kWh per kilogram",
      "Ash content: Around 1.0%",
      "Burn time: About 2 hours of flame, then 2 hours of ember",
      "Suitable appliances: Wood stoves, inserts and wood boilers",
      "Recommended use: An evening's heat on a single charge",
      "Storage: Dry, away from damp",
    ],
  },
  {
    slug: "nestro-nestro-buches-compressees-palette-900-kg",
    shortDescription:
      "Briquettes de bois cylindriques NESTRO, hêtre et/ou chêne, PCI 5,2 kWh/kg, palette de 900 kg.",
    description:
      "Briquettes de bois compressées de forme cylindrique, en hêtre et/ou en chêne, sans liant " +
      "chimique, livrées par palette de 900 kg." +
      "\n\n" +
      "Le procédé de fabrication est un pressage hydraulique à excentrique. Contrairement à une " +
      "extrusion continue, ce type de presse comprime la matière par coups successifs, ce qui " +
      "produit des briquettes de longueur régulière et de forme franchement cylindrique. La " +
      "cohésion est obtenue sans colle : c'est la lignine du bois, libérée par la pression, qui " +
      "resoude les particules entre elles." +
      "\n\n" +
      "Le pouvoir calorifique atteint environ 5,2 kWh par kilogramme, une valeur élevée pour du " +
      "bois compressé, qui traduit à la fois la densité obtenue à la presse et le choix d'essences " +
      "de feuillus durs. La marque revendique par ailleurs la certification FSC, qui porte sur la " +
      "gestion durable des forêts d'où provient la matière première." +
      "\n\n" +
      "Ces briquettes conviennent aux poêles, aux inserts et aux chaudières à bois. Elles peuvent " +
      "servir de combustible principal ou d'appoint selon l'installation et le volume à chauffer : " +
      "en chauffage principal, comptez l'équivalent d'un remplissage de foyer par demi-journée ; " +
      "en appoint, elles complètent avantageusement un stock de bois bûche en occupant nettement " +
      "moins de place." +
      "\n\n" +
      "La forme cylindrique se range en couches régulières et supporte bien l'empilage. Conservez " +
      "la palette dans un local sec : l'humidité reprise fait gonfler la briquette et la " +
      "désolidarise, sans qu'aucune manipulation puisse ensuite y remédier.",
    descriptionEn:
      "Cylindrical compressed wood briquettes, in beech and/or oak, with no chemical binder, " +
      "delivered on a 900 kg pallet." +
      "\n\n" +
      "The manufacturing process is eccentric hydraulic pressing. Unlike continuous extrusion, this " +
      "type of press compacts the material in successive strokes, producing briquettes of even " +
      "length and a distinctly cylindrical shape. Cohesion is achieved without glue: it is the " +
      "lignin in the wood, released by pressure, that re-bonds the particles together." +
      "\n\n" +
      "Calorific value reaches around 5.2 kWh per kilogram, a high figure for compressed wood, " +
      "reflecting both the density achieved in the press and the choice of dense hardwood species. " +
      "The brand also claims FSC certification, which covers the sustainable management of the " +
      "forests the raw material comes from." +
      "\n\n" +
      "These briquettes suit wood stoves, inserts and wood boilers. They can serve as primary or " +
      "supplementary fuel depending on the installation and the volume to be heated: as primary " +
      "heating, reckon on the equivalent of one firebox load per half-day; as a supplement, they " +
      "usefully extend a stock of cordwood while taking up far less room." +
      "\n\n" +
      "The cylindrical shape stacks in even layers and holds up well to piling. Keep the pallet in " +
      "a dry room: reabsorbed moisture swells the briquette and breaks it apart, and no amount of " +
      "handling afterwards will put that right.",
    shortDescriptionEn:
      "NESTRO cylindrical compressed wood briquettes, beech and/or oak, calorific value about 5.2 kWh/kg, pallet of 900 kg.",
    shippingWeightGrams: 900000, // palette 900 kg, docs/research/identifiants-granules.md
    bullets: [
      "Produit : Bûches de bois compressé",
      "Type de produit : Briquettes cylindriques, pressage hydraulique à excentrique",
      "Composition : Hêtre et/ou chêne, sans liant chimique",
      "Conditionnement : Palette",
      "Poids total : 900 kg",
      "Pouvoir calorifique : Environ 5,2 kWh par kilogramme",
      "Certifications ou normes : Certification FSC revendiquée par la marque",
      "Appareils compatibles : Poêles, inserts et chaudières à bois",
      "Utilisation recommandée : Chauffage principal ou d'appoint selon l'installation",
      "Stockage conseillé : Au sec, à l'abri de l'humidité",
    ],
    bulletsEn: [
      "Product: Compressed wood logs",
      "Product type: Cylindrical briquettes, eccentric hydraulic pressing",
      "Composition: Beech and/or oak, no chemical binder",
      "Packaging: Pallet",
      "Total weight: 900 kg",
      "Calorific value: About 5.2 kWh per kilogram",
      "Certifications and standards: FSC certification claimed by the brand",
      "Suitable appliances: Wood stoves, inserts and wood boilers",
      "Recommended use: Primary or supplementary heating depending on the installation",
      "Storage: Dry, away from damp",
    ],
  },
  {
    // Piege de nommage signale par la recherche : le nom produit en base porte "NESTRO", mais
    // la marque enregistree est PINI KAY. La description ci-dessous decrit le produit reellement
    // identifie (Pini Kay, pressage octogonal), et non la marque NESTRO du titre.
    slug: "pini-kay-nestro-buches-compressees-palette-960-kg",
    shortDescription:
      "Briquettes de bois octogonales Pini Kay, densité 1,25 g/cm³, tenue de braise 4 à 5 h, palette de 960 kg.",
    description:
      "Briquettes de bois compressées de forme octogonale, en hêtre et en chêne, sans liant " +
      "chimique. Conditionnement en paquets de 10 kg, soit environ 96 paquets par palette de " +
      "960 kg." +
      "\n\n" +
      "C'est le produit le plus dense de la catégorie : 1,25 gramme par centimètre cube. Cette " +
      "densité a une conséquence directe, et c'est la raison d'être de ce format — la tenue de " +
      "braise atteint quatre à cinq heures une fois la phase de flamme passée. Un chargement fait " +
      "en soirée laisse donc des braises vives au petit matin, de quoi relancer le feu sans " +
      "rallumer. Aucun bois fendu ne permet cela avec la même régularité." +
      "\n\n" +
      "Le pouvoir calorifique suit : 5,3 kWh par kilogramme, la valeur la plus élevée de la " +
      "catégorie, soit environ 53 kWh par paquet de 10 kg. L'humidité tourne autour de 8 % et le " +
      "taux de cendres s'établit à 0,5 %, ce qui reste bas pour un mélange de feuillus durs." +
      "\n\n" +
      "La section octogonale n'est pas décorative. Les arêtes multiplient les surfaces exposées à " +
      "la flamme au démarrage, puis la masse compacte prend le relais ; la briquette se cale aussi " +
      "mieux dans le foyer qu'un cylindre, qui a tendance à rouler contre la vitre." +
      "\n\n" +
      "Compatible avec les poêles, les inserts et les chaudières à bois. La puissance dégagée " +
      "appelle une réserve : dans un petit poêle, une briquette de cette densité suffit là où il " +
      "faudrait trois bûches de feuillu, et surcharger le foyer fait monter la température " +
      "au-delà de ce que l'appareil supporte. Stockez les paquets au sec, fermés jusqu'à l'usage.",
    descriptionEn:
      "Octagonal compressed wood briquettes, made from beech and oak, with no chemical binder. " +
      "Packed in 10 kg packs, about 96 packs per 960 kg pallet." +
      "\n\n" +
      "This is the densest product in the category: 1.25 grams per cubic centimetre. That density " +
      "has one direct consequence, and it is the whole point of the format — ember life reaches " +
      "four to five hours once the flame stage has passed. A charge made in the evening therefore " +
      "leaves live embers by early morning, enough to revive the fire without relighting it. No " +
      "split wood does that with the same consistency." +
      "\n\n" +
      "Calorific value follows: 5.3 kWh per kilogram, the highest figure in the category, about " +
      "53 kWh per 10 kg pack. Moisture sits around 8% and ash content comes in at 0.5%, which " +
      "remains low for a mix of dense hardwoods." +
      "\n\n" +
      "The octagonal section is not decorative. The edges multiply the surfaces exposed to the " +
      "flame at start-up, after which the compact mass takes over; the briquette also seats more " +
      "securely in the firebox than a cylinder, which tends to roll against the glass." +
      "\n\n" +
      "Compatible with wood stoves, inserts and wood boilers. The heat output calls for restraint: " +
      "in a small stove, one briquette of this density does the work of three hardwood logs, and " +
      "overloading the firebox drives the temperature beyond what the appliance is built for. " +
      "Store the packs dry, sealed until use.",
    shortDescriptionEn:
      "Pini Kay octagonal wood briquettes, beech and oak, density 1.25 g/cm³, ember life 4 to 5 hours, pallet of 960 kg.",
    shippingWeightGrams: 960000, // palette 960 kg, docs/research/identifiants-granules.md
    bullets: [
      "Produit : Bûches de bois compressé",
      "Type de produit : Briquettes octogonales compressées",
      "Composition : Hêtre et chêne, sans liant chimique",
      "Conditionnement : Palette de paquets de 10 kg",
      "Quantité : Environ 96 paquets de 10 kg",
      "Poids total : 960 kg",
      "Densité : 1,25 g par centimètre cube",
      "Taux d'humidité : Environ 8 %",
      "Pouvoir calorifique : 5,3 kWh par kilogramme",
      "Taux de cendres : 0,5 %",
      "Tenue de braise : De 4 à 5 heures",
      "Appareils compatibles : Poêles, inserts et chaudières à bois",
      "Utilisation recommandée : Chargement de nuit, pour retrouver des braises au matin",
      "Stockage conseillé : Au sec, paquets fermés jusqu'à l'usage",
    ],
    bulletsEn: [
      "Product: Compressed wood logs",
      "Product type: Octagonal compressed briquettes",
      "Composition: Beech and oak, no chemical binder",
      "Packaging: Pallet of 10 kg packs",
      "Quantity: About 96 packs of 10 kg",
      "Total weight: 960 kg",
      "Density: 1.25 g per cubic centimetre",
      "Moisture content: Around 8%",
      "Calorific value: 5.3 kWh per kilogram",
      "Ash content: 0.5%",
      "Ember life: 4 to 5 hours",
      "Suitable appliances: Wood stoves, inserts and wood boilers",
      "Recommended use: Overnight loading, for live embers by morning",
      "Storage: Dry, packs kept sealed until use",
    ],
  },
];
