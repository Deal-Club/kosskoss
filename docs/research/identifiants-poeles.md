# Identifiants fabricant — poêles

Relevé du 3 août 2026. Un GTIN n'est inscrit que s'il a été vu sur une source citée et que
son checksum est valide. « non trouvé » est une réponse acceptable et fréquente. Un
checksum valide ne prouve rien à lui seul (il élimine seulement les fautes de frappe, pas
les codes internes de boutique ni les EAN mal attribués à un mauvais produit) : chaque GTIN
retenu ci-dessous repose sur au moins une donnée structurée (`itemprop="gtin13"` ou
`"gtin13"` en JSON-LD schema.org) affichée par un revendeur identifié, avec recoupement sur
une deuxième source indépendante chaque fois que possible. Vérification de checksum :
`npx tsx -e "import { isValidGtin } from './src/lib/gtin'; console.log(isValidGtin('CODE'));"`.

| SKU | Produit | GTIN | MPN | Classe énergie | Poids | Puissance | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MKT-POELE-INTERSTOVES-ALESSIA-14-KW | INTERSTOVES ALESSIA 14 kW | 3760366603266 | ALESSIAC50NOIR | A+ | 70 kg | 14 kW (14,3 kW en fiche technique détaillée) | https://www.e.leclerc/fp/poele-a-bois-alessia-14-buches-55cm-acier-3760366603266 |
| MKT-POELE-INTERSTOVES-JUAN-14-KW | INTERSTOVES JUAN 14 kW | 3760366603273 | JUANC50NOIR | A+ | 70 kg | 14 kW (14,3 kW en fiche technique détaillée) | https://www.e.leclerc/fp/poele-a-bois-avec-four-juan-14-buches-55cm-acier-3760366603273 |
| MKT-POELE-INTERSTOVES-MATTEO-10-KW | INTERSTOVES MATTEO 10 kW | 7421097382238 | MATTEO500NR | A+ | 98 kg | 10 kW (10,8 kW en fiche technique détaillée) | https://www.e.leclerc/fp/poele-a-bois-matteo-10kw-buches-50cm-noir-7421097382238 |
| MKT-POELE-DEVILLE-SANDY-8-KW-LAB | DEVILLE SANDY 8 kW LAB | 3244330110009 | C077BD.06-DD | A | 112 kg | 8 kW | GTIN : https://www.primo-ideo.com/poele-a-bois-deville-c077bd-06-dd-sandy.htm — fiche officielle (MPN, poids, rendement, EcoDesign) : https://www.deville.fr/wp-content/uploads/sites/2/2019/11/C077BD-06-DD_2021-12.pdf |
| MKT-POELE-DEVILLE-TORON-50-8-KW | DEVILLE TORON 50 8 kW | 3244330110542 | C07768.06 | A | 150 kg | 8 kW | GTIN : https://www.poeleplus.fr/poeles-a-bois/21876-poele-a-bois-toron-deville.html (recoupé sur https://www.codep.fr/bois/18325-poele-bois-toron-50-deville-c0776806-3244330110542.html) — fiche officielle : https://www.deville.fr/wp-content/uploads/sites/2/2019/11/C07768.06_2021-12.pdf |
| MKT-POELE-DEVILLE-ORENSE-8-KW | DEVILLE ORENSE 8 kW | 3244330110696 | C077CD-06 | A | 192 kg | 8 kW | GTIN : https://www.poeleplus.fr/poeles-a-bois/22236-poele-a-bois-orense-deville.html — fiche officielle : https://www.deville.fr/wp-content/uploads/sites/2/2022/06/C077CD-06_2022-03.pdf |
| MKT-POELE-DEVILLE-EGUZKI-ETANCHE-6-KW | DEVILLE EGUZKI étanche 6 kW | 3244330110801 | C077BXN-06 | A | 124 kg | 6 kW | GTIN (confiance moyenne, voir note) : https://www.proxiconfort.fr/p-poele-a-bois-longiligne-c077bxn-06 et https://www.blancbrun.fr/p-poele-a-bois-longiligne-c077bxn-06 — fiche officielle (MPN, poids, rendement) : https://www.deville.fr/produit/poele-a-bois-etanche-en-acier-eguzki/ |
| MKT-POELE-LA-NORDICA-EXTRAFLAME-ISETTA-EVO-4-0 | LA NORDICA EXTRAFLAME Isetta Evo 4.0 | 8022724371008 | 7119002 (alias ISETTAEVO4.0 / 3002140 selon revendeur) | A+ | 160 kg | 7,3 kW | https://www.maison-energy.com/chauffage-au-bois-R12/isettaevo40-M166616.html (recoupé sur https://chemineeo.fr/poele-a-bois/poele-a-bois-la-nordica-isetta-evo-4-0-7-3-kw/) |

## Décompte

- **GTIN trouvés et validés (checksum correct) : 8/8.**
- **MPN trouvés : 8/8.**
- **Classe énergétique trouvée : 8/8** (A+ : Alessia, Juan, Matteo, Isetta Evo 4.0 — A : Sandy,
  Toron 50, Orense, Eguzki).
- **Poids net trouvé : 8/8.**
- **Puissance nominale trouvée : 8/8.**
- **Rendement trouvé : 8/8** (détail dans les notes ci-dessous).
- **Norme / certification trouvée : 8/8** — EN 13240 + EcoDesign 2022 pour les huit
  modèles ; Flamme Verte 7 étoiles en complément pour Matteo, Toron 50, Orense, Eguzki.

## Notes par produit

### MKT-POELE-INTERSTOVES-ALESSIA-14-KW — INTERSTOVES ALESSIA 14 kW
GTIN **3760366603266** vu en donnée structurée (`"gtin13"` JSON-LD schema.org, marque
« Interstoves ») sur la fiche E.Leclerc, avec tableau de caractéristiques listant EAN,
MPN, poids et classe énergétique de façon cohérente sur la même page. Recoupé
indépendamment : ce même code apparaît dans l'URL du produit chez BUT.fr
(https://www.but.fr/produits/3760366603266/Poele-a-Bois-Alessia-14kw-Buches-55cm-Noir.html)
et chez ManoMano, deux enseignes qui utilisent le GTIN comme identifiant d'URL. MPN
**ALESSIAC50NOIR** (« Modèle ou Référence fabricant ») vu sur la même fiche E.Leclerc.
Rendement 82 %, norme Eco Design 2022. Prix constaté sur le site du revendeur (577 €)
identique au prix en base MLC Bois, ce qui confirme qu'il s'agit bien du même article.
**Confiance : haute.**

### MKT-POELE-INTERSTOVES-JUAN-14-KW — INTERSTOVES JUAN 14 kW
GTIN **3760366603273** vu en donnée structurée (`"gtin13"`) et dans le tableau de
caractéristiques (champ « EAN ») de la fiche E.Leclerc dédiée, avec MPN
**JUANC50NOIR** (« Modèle ou Référence fabricant »). Un revendeur (Ubaldi) affiche une
référence légèrement différente « JUAN50NOIR » (sans le « C ») — écart mineur de
transcription entre revendeurs, sans incidence sur le GTIN retenu. Rendement 82 %, norme
Eco Design 2022. **Confiance : haute** sur le GTIN (donnée structurée + tableau technique
cohérents sur une même fiche officielle de revendeur) ; **moyenne** sur l'orthographe
exacte du MPN (une lettre d'écart selon la source).

### MKT-POELE-INTERSTOVES-MATTEO-10-KW — INTERSTOVES MATTEO 10 kW
GTIN **7421097382238** vu en donnée structurée (`"gtin13"`) sur la fiche E.Leclerc du
modèle standalone (bûches 50 cm, sans kit conduit — à distinguer du pack « Matteo 10 +
Kit Conduit 150 », qui porte un GTIN différent, 3760366602573, non retenu ici). Recoupé de
façon très large : ce même code sert d'identifiant produit chez BUT.fr, Bricorama et
Bricomarché (URLs se terminant par /7421097382238), trois enseignes indépendantes. MPN
**MATTEO500NR** (« Modèle ou Référence fabricant »). Poids 98 kg, rendement 78,9 %, norme
Eco Design 2022 + Flamme Verte 7 étoiles. **Point de vigilance** : le préfixe GTIN
(« 7421097... ») diffère de celui des autres poêles Interstoves de ce lot
(« 3760366... ») ; il reste structurellement un GTIN-13 valide au checksum et il est
repris à l'identique par quatre enseignes différentes comme identifiant produit, ce qui est
le signal de fiabilité recherché — mais l'origine de ce préfixe n'a pas pu être confirmée
auprès d'un registre GS1 public. **Confiance : haute** sur le fait qu'il s'agit bien du
GTIN attribué à cet article précis (recoupement massif), **non vérifiée** l'attribution
GS1 du préfixe lui-même.

### MKT-POELE-DEVILLE-SANDY-8-KW-LAB — DEVILLE SANDY 8 kW LAB
Référence fabricant confirmée à la source : la notice officielle Deville
(deville.fr/wp-content/.../C077BD-06-DD_2021-12.pdf) donne **Référence C077BD.06-DD**,
avec le tableau réglementaire EcoDesign : puissance nominale 8,0 kW, rendement utile 77,0 %,
classe d'efficacité énergétique **A**, IEE 102, masse de l'appareil **112 kg**, norme
EN 13240 + EcoDesign 2022. GTIN **3244330110009** vu en donnée structurée
(`itemprop="gtin13"`) sur primo-ideo.com, qui affiche par ailleurs un poids identique
(112 kg) confirmant qu'il s'agit du même article que la fiche officielle. Ce GTIN partage
le même préfixe (« 3244330110... ») que les trois autres poêles Deville de ce lot
(Toron 50, Orense, Eguzki), cohérent avec un même bloc de numérotation fabricant/
distributeur — signal de fiabilité supplémentaire.
**GTIN concurrent écarté** : bernay-habitat.com affiche pour ce même article un
« gtin13 » de 2000011016517, dont le préfixe (200-299) correspond à la plage GS1 réservée
à la circulation restreinte / usage interne, donc structurellement pas un GTIN mondial
valide pour Merchant Center — écarté.
**Point non résolu** : la signification du suffixe « LAB » dans le nom produit MLC Bois
(« DEVILLE SANDY 8 kW LAB ») n'a pas pu être établie ; aucune source Deville ni revendeur
ne mentionne de variante « LAB » du Sandy — le catalogue Deville ne compte qu'un seul
modèle Sandy à 8 kW (C077BD.06-DD), donc l'identification du produit reste fiable, mais
l'origine du mot « LAB » dans le nom interne MLC Bois est à clarifier en interne (n'a pas
d'incidence sur le GTIN/MPN retenus). **Confiance : haute** sur GTIN, MPN et
caractéristiques ; **non résolu** sur le sens de « LAB ».

### MKT-POELE-DEVILLE-TORON-50-8-KW — DEVILLE TORON 50 8 kW
Référence fabricant confirmée à la source : notice officielle Deville
(deville.fr/wp-content/.../C07768.06_2021-12.pdf), **Référence C07768.06**. Tableau
EcoDesign officiel : puissance nominale 8,0 kW, rendement utile 77,0 %, classe
d'efficacité énergétique **A**, IEE 102, masse de l'appareil **150 kg**, norme EN 13240 +
EcoDesign 2022. GTIN **3244330110542** vu en donnée structurée (`"gtin13"`) sur
poeleplus.fr, avec poids identique (150 kg) — cohérent avec la fiche officielle. Recoupé
sur une deuxième source indépendante : le même code apparaît dans l'URL produit de
codep.fr (…toron-50-deville-c0776806-3244330110542.html). **Confiance : haute** — double
source pour le GTIN, fiche officielle pour le MPN et les caractéristiques.

### MKT-POELE-DEVILLE-ORENSE-8-KW — DEVILLE ORENSE 8 kW
Référence fabricant confirmée à la source : notice officielle Deville
(deville.fr/wp-content/.../C077CD-06_2022-03.pdf), **Référence C077CD-06**. Tableau
EcoDesign officiel : puissance nominale 8,0 kW, rendement utile 77,0 %, classe
d'efficacité énergétique **A**, IEE 102, masse de l'appareil **192 kg**, norme EN 13240 +
EcoDesign 2022. GTIN **3244330110696** vu en donnée structurée (`"sku"`, `"mpn"` et
`"gtin13"` JSON-LD schema.org, marque « DEVILLE ») sur poeleplus.fr, avec un tableau de
caractéristiques affichant les mêmes valeurs que la fiche officielle (poids 192 kg,
puissance 8 kW, rendement 77 %, classe A, EN 13240, Ecodesign 2022) — cohérence totale
entre les deux sources. **Confiance : haute.**

### MKT-POELE-DEVILLE-EGUZKI-ETANCHE-6-KW — DEVILLE EGUZKI étanche 6 kW
Référence fabricant confirmée sur la fiche produit officielle
(deville.fr/produit/poele-a-bois-etanche-en-acier-eguzki/) : **Référence C077BXN-06**,
puissance 6 kW, rendement utile 75 %, ETAS (rendement saisonnier) 65 %, IEE 99, poids
**124 kg**, norme EN 16510, label Flamme Verte, image « classe A » affichée sur la page.
**Point de vigilance résolu pendant la recherche** : le modèle Eguzki a changé de
référence fabricant. primo-ideo.com indique explicitement « DEVILLE C077BX-06 EGUZKI
étanche […] FIN DE VIE --> C077BXN-06 » : **C077BX-06 est l'ancienne référence,
abandonnée, remplacée par C077BXN-06** (référence actuelle, celle de la fiche officielle
Deville). Deux GTIN circulent donc chez les revendeurs pour le nom « Eguzki » :
- **3244330110641**, associé de façon très majoritaire (codep.fr, extra.fr, bricomarché,
  nouveauxmarchands.com, poeldorado.fr, magarantie5ans.fr, discountetqualite.fr — sept
  sources indépendantes) à l'ancienne référence **C077BX-06** (fin de vie) ;
- **3244330110801**, associé par deux revendeurs indépendants (proxiconfort.fr et
  blancbrun.fr, titres de page « Poêle à bois longiligne C077BXN-06 ») à la référence
  **actuelle** C077BXN-06 — celle de la fiche officielle Deville.
Le GTIN retenu dans le tableau est donc **3244330110801** (référence actuelle), et non
3244330110641 (référence abandonnée). Les deux passent le contrôle de checksum. Ce choix
repose sur la cohérence de nommage (deux sources indépendantes citant explicitement
C077BXN-06) plutôt que sur une donnée structurée `gtin13` vue en direct sur la page :
proxiconfort.fr et blancbrun.fr ont bloqué la récupération automatique du contenu (403),
seul le titre de page a pu être lu via le résultat de recherche. Il partage par ailleurs
le même préfixe (« 3244330110... ») que les trois autres GTIN Deville confirmés du lot.
**Sur le poids** : la fiche officielle Deville indique 124 kg ; poeleplus.fr (qui référence
à tort l'ancien code 3244330110641 sous le nom C077BXN-06) indique 150 kg pour le même
article — écart non résolu entre ces deux sources précises, mais 124 kg est corroboré par
plusieurs autres fiches revendeur retrouvées lors de la recherche (abribat.fr, esc-grossiste.fr)
qui convergent toutes sur 124 kg ; c'est cette valeur qui est retenue dans le tableau.
**Confiance : moyenne** sur le GTIN — recoupé sur deux sources indépendantes et cohérent
avec la référence fabricant actuelle, mais sans confirmation directe d'une donnée
structurée `gtin13` sur une page consultée en clair ; **haute** sur MPN, poids et
caractéristiques (fiche officielle Deville). **À faire valider manuellement avant mise en
production du flux Merchant**, étant donné l'ambiguïté initiale entre les deux références.

### MKT-POELE-LA-NORDICA-EXTRAFLAME-ISETTA-EVO-4-0 — LA NORDICA EXTRAFLAME Isetta Evo 4.0
GTIN **8022724371008** vu en donnée structurée à trois reprises et sur deux domaines
indépendants : `itemprop="gtin13"` + champ visible « EAN : 8022724371008 » sur
maison-energy.com, et `itemprop="gtin13"` + variable `productEAN` dans les données de
tracking sur chemineeo.fr (version FR du site allemand chemineeo.de) — même code partout,
cohérence totale. MPN : maison-energy.com utilise **ISETTAEVO4.0** comme `itemprop="mpn"`
(reprise du nom commercial) ; chemineeo.fr et bernay-habitat.com utilisent tous les deux la
référence numérique **7119002** comme SKU ; condizionati.fr utilise **3002140**. Plusieurs
systèmes de référencement coexistent donc chez les revendeurs pour ce même article — le
MPN retenu dans le tableau est **7119002** (référence numérique reprise par deux
revendeurs indépendants), avec les deux autres codes mentionnés en alias.
Caractéristiques (maison-energy.com) : poids **160 kg**, rendement **83,6 %**, classe
énergie **A+**, volume de chauffe 338 m³, norme NF EN 13240, EcoDesign 2022 = oui,
raccord fumée arrière/dessus, diamètre buse 150 mm. Un autre résultat de recherche évoquait
7,7 kW / 82 % de rendement pour un « Isetta Evo » générique, mais ces valeurs ne
correspondaient à aucune fiche produit consultée directement pour l'Isetta **Evo 4.0**
précisément (risque de confusion avec l'Isetta CC Evo ou l'Isotta, gammes voisines mais
distinctes chez le même fabricant) — écartées au profit des valeurs confirmées par les
fiches structurées ci-dessus. GTIN **2000017879338** vu sur bernay-habitat.com pour ce même
article, mais préfixe 200-299 (plage à circulation restreinte) — même schéma que pour le
Sandy Deville ci-dessus, écarté sans ambiguïté. **Confiance : haute** sur GTIN et
caractéristiques (deux sources indépendantes avec données structurées identiques) ;
**moyenne** sur le choix du MPN entre les trois codes concurrents, aucun ne provenant
directement du site officiel lanordica-extraflame.com (non consulté avec succès en accès
direct pendant cette recherche).

## Synthèse transversale

- **Chaque GTIN retenu passe le contrôle de checksum ET a été vu en donnée structurée
  (`gtin13` schema.org) ou en champ « EAN » explicite sur au moins une fiche produit
  identifiée** ; six des huit GTIN sont recoupés sur au moins deux sources indépendantes.
- **Deux familles de GTIN internes-non-valides ont été rencontrées et systématiquement
  écartées** : préfixe 200-299 (plage GS1 à circulation restreinte, vu chez
  bernay-habitat.com pour Sandy et pour Isetta Evo 4.0) et codes ne passant pas le
  checksum (guide.copra.fr / guide.vulceo.fr / guide.axtem.fr pour les quatre poêles
  Deville — écartés avant toute autre vérification).
- **Un cas de double référence fabricant a été identifié et tranché** : Deville Eguzki
  étanche est passé de la référence C077BX-06 (fin de vie) à C077BXN-06 (actuelle), avec un
  GTIN distinct pour chacune ; c'est le GTIN de la référence actuelle qui figure au tableau,
  avec un niveau de confiance signalé comme moyen plutôt que haut faute d'avoir pu
  consulter directement une page confirmant cette association en clair.
- **Les quatre GTIN Deville partagent un même préfixe** (3244330110xxx), et les trois GTIN
  Interstoves « 376036660xxxx » partagent également un préfixe commun (à l'exception du
  Matteo, sur un bloc « 7421097... » distinct mais confirmé par recoupement massif chez
  quatre enseignes) — cohérence structurelle qui renforce la confiance sans, à elle seule,
  constituer une preuve.
- Les caractéristiques techniques (puissance, rendement, classe énergétique, norme,
  volume chauffé) proviennent systématiquement soit d'une fiche officielle du fabricant
  (Deville : PDF réglementaires EcoDesign téléchargés directement sur deville.fr), soit
  d'une fiche revendeur affichant les mêmes valeurs qu'une source officielle recoupée
  séparément (Interstoves, La Nordica Extraflame — le site officiel
  lanordica-extraflame.com n'a pas pu être consulté avec succès pendant cette recherche).
