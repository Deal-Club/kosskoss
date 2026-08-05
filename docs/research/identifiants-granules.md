# Identifiants et certifications — granulés et bûches compressées

Relevé du 3 août 2026. Ces produits se vendent à la palette : un EAN de sac de 15 kg (ou
de paquet de 10 kg pour les bûches) ne peut pas servir d'identifiant à une palette de
66 à 96 unités, et n'est donc pas retenu. Un GTIN n'est retenu dans le tableau que s'il
désigne explicitement l'unité de vente réelle — la palette — **et** provient d'une source
jugée suffisamment fiable pour un flux Google Merchant Center. Vérification de checksum :
`npx tsx -e "import { isValidGtin } from './src/lib/gtin'; console.log(isValidGtin('CODE'));"`.
Un checksum valide ne prouve rien à lui seul (10 % de n'importe quel code aléatoire de
même longueur le passe) : il élimine seulement les fautes de frappe, pas les codes
internes de boutique ni les EAN mal attribués. Toutes les décisions ci-dessous reposent
sur la nature de la source, pas sur le seul calcul de clé.

| SKU | Produit | Certification | Essence / composition | Cendres | Humidité | PCI | GTIN | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MKT-GRANULES-STARFOREST-PALETTE | Starforest, palette 70×15 kg | DINplus n° 7A268 (AGROMI SAS), classe A1 | 100 % résineux | ≤ 0,7 % | ≤ 10 % | ≥ 5 kWh/kg | Non retenu — EAN sac 15 kg écarté (3760128010066) | dincertco.tuv.com/registrations/60166408 ; luzeal.fr fiche technique |
| CREPITOGRA | Crépito granulés, palette 66×15 kg | DINplus n° 7A288 (Euro Energies SAS) ; NF Biocombustibles (n° non trouvé) | 100 % bois vierge, essence non précisée par le fabricant | ≤ 0,5 % (source officielle, écarts 0,4–0,6 % chez des tiers) | ≤ 8 % | 4,7–5,3 kWh/kg (PCI/PCS ambigu) | Non retenu — aucun EAN vu | dincertco.tuv.com/companies/76024 ; crepito.fr/granules-de-bois/palettes.html |
| BUTAGAZGRA | Granulés Butagaz, palette 66×15 kg | DINplus évoqué (n° 7A329 chez des revendeurs) — **non confirmé** au registre officiel | 100 % résineux | 0,4 % | 6,5 % | ≥ 4,9 kWh/kg | Non retenu — aucun EAN fiable vu | boisecochauffage.com ; granulesbois.butagaz.fr (site officiel, accès bloqué en fetch) |
| MKT-GRANULES-TOTAL-ENERGIES-PALETTE | Granulés TotalEnergies, palette 66×15 kg | DINplus n° 7A269 (TotalEnergies Marketing France) ; ENplus A1 revendiqué mais numéro non confirmé | 100 % résineux, sciure de scierie française | 0,6–0,7 % | ≤ 8 % | 4,8–5,3 kWh/kg | Non retenu — aucun EAN vu | dincertco.tuv.com/companies/47276 ; proxi.totalenergies.fr |
| LIMOUZILIM | Limouzi granulés, palette 66×15 kg | DINplus n° 7A243 (SAS GDM PELLETS) + PEFC (n° non trouvé). **Le bullet base « Certifié ENplus A1 » n'a été confirmé par aucune source** ; tout pointe vers DIN Plus | 100 % résineux (épicéa/douglas du Limousin) | < 0,5 % | < 8 % | 4,6–5 kWh/kg | Non retenu — code vu (4000000000099) n'est pas un GTIN, identifiant interne de boutique | dincertco.tuv.com/companies/69844 ; gdm-group.fr/gdm-pellets |
| WOODSTOCKG | Granulés Woodstock, palette 66×15 kg | DINplus n° 7A288 (Euro Energies SAS) + NF Biocombustibles Solides n° D79360-016 (FCBA) | 100 % bois vierge, essence non précisée | ≤ 0,5 % | ≤ 8 % | 4,8–5,3 kWh/kg | Non retenu — EAN sac 15 kg écarté (3760167700003) | dincertco.tuv.com/companies/76024 ; fiche technique officielle groupe-mb.scene7.com/.../ft_WOOD02_WBG15 |
| HELIOSGRAN | Granulés Hélios, palette 66×15 kg | DINplus n° 7A219 (SARL Chimie Import Developpement / CID Groupe) ; EN Plus A1 revendiqué mais numéro non confirmé | 100 % résineux | 0,30 % (officiel) / <0,7 % (tiers) | ≤ 8 % | 4,9 kWh/kg | Non retenu — code vu (4000000000341) n'est pas un GTIN, identifiant interne de boutique | dincertco.tuv.com/companies/68174 ; cidgroupe.com/granules-de-bois/helios |
| COGRAGRANU | Granulés Cogra, palette 66×15 kg | DINplus n° 7A140 (Cogra Quarante Huit S.A.) | 100 % résineux | 0,50–0,70 % (sources divergentes) | 5–6 % | 5,0–5,2 kWh/kg | Non retenu — code vu (2039196546830) non confirmé sur la page produit, préfixe 200-299 (plage à circulation restreinte, non un GTIN GS1 mondial) | dincertco.tuv.com (recherche « Cogra ») ; cogra.fr |
| MKT-GRANULES-BADGER-PALETTE | Granulés Badger, palette 66×15 kg | DINplus n° 7A072 (SA GROUPE FRANCOIS, Virton BE) ; EN Plus A1 revendiqué mais numéro non confirmé | 100 % résineux, bois écorcé | ~0,3 % (officiel) / <0,7 % (tiers) | < 10 % | ~4,6–5,0 kWh/kg (sources divergentes) | Non retenu — EAN sac 15 kg écarté (5420044090013) | dincertco.tuv.com/companies/54382 ; badgerpellets.com |
| MKT-GRANULES-PIVETEAU-HP-PLUS-PALETTE | Granulés Piveteau HP+, palette 72×15 kg | DINplus n° 7A109 (SAS PIVETEAU BOIS), conforme DIN EN ISO 17225-2:2021-09 ; EN Plus n° FR037 (source officielle fabricant, non recoupé sur registre EN Plus) | 100 % résineux français (pin, douglas, épicéa) | ≤ 0,35 % | < 6,5 % | > 4,85 kWh/kg | Non retenu — aucun EAN vu | dincertco.tuv.com/companies/47046 ; piveteaubois.com/fr/granules-bois-pellets-hp |
| RUFRUFBUCH | RUF bûches compressées, palette 960 kg | Non confirmé — DIN 51731 (norme ancienne) évoqué par un revendeur, DINplus évoqué par un autre sans numéro ni vérification possible | Hêtre ou chêne selon variante, sans liant chimique | ~1,0 % | Non trouvé (valeur chiffrée) | ~4,7–5,3 kWh/kg | Non retenu — aucun EAN vu | oekobrix.de/shop/holzbriketts/premium-ruf-palette-960-kg |
| NESTRONEST | NESTRO bûches compressées, palette 900 kg | FSC (mono-source) ; DINplus évoqué de façon générique sans numéro rattaché | Hêtre et/ou chêne | Non trouvé pour ce produit précis | Non trouvé (chiffré) | ~5,2 kWh/kg | Non retenu — candidat 4260680094843 vu en donnée structurée (gtin13) chez un seul revendeur allemand, désigne bien la palette 900 kg mais mono-source et non recoupé : confiance insuffisante pour un flux Merchant | energie-kienbacher.de/Nestro-Hartholzbriketts-900-kg-aus-Buche-Eiche |
| PINIKAYNES | PINI KAY bûches compressées (marque réelle ; nom produit en base « NESTRO… », voir note), palette 960 kg | Non confirmé — DINplus/FSC évoqués génériquement sans numéro rattaché à ce produit | Hêtre/chêne, sans liant chimique | 0,5 % | ~8 % | 5,3 kWh/kg | Non retenu — EAN paquet 10 kg écarté (0650414083993), **dupliqué à l'identique sur les palettes 300/480/960 kg du même revendeur** | oekobrix.de/shop/holzbriketts/pini-kay-palette-960-kg ; frankenbrennstoffe.de/Holzbriketts-PINI-KAY-Eiche-25cm-960kg |
| CREPITOBUCHE | CREPITO bûches compressées Hêtre, palette 960 kg (96×10 kg) | Aucune certification confirmée pour les bûches (DINplus/NF s'appliquent aux granulés Crépito, pas aux bûches) ; contrôle labo CERIC + « Bois de France » | Officiellement « sciures et copeaux non traités » ; un distributeur évoque un mélange 80 % hêtre / 20 % chêne (formule évoluée) | ≤ 1,5 % | ≤ 12 % (officiel) / ≤ 10 % (tiers) | 4,6–5 kWh/kg | Non retenu — aucun EAN vu | crepito.fr/buches-densifiees/rondes.html ; chartrescombustibles.fr |
| MABUCHHETREM | Ma Bûch'Hêtre (Manubois/Groupe Lefebvre), palette 900 kg (90×10 kg) | Aucune certification confirmée ; mention générique « forêts durablement gérées » | 100 % hêtre (nom de marque) / « 100 % feuillus » selon une autre source | < 0,5 % | < 8 % | ~5 kWh/kg | Non retenu — aucun EAN vu | decaux-et-fils.fr/.../buch-hetre.html ; monsieur-buche.fr |

## Décompte

- **Certifications confirmées via une source faisant autorité (registre officiel DIN CERTCO) : 9/15** — Starforest, Crépito granulés, Total Energies, Limouzi, Woodstock (+ NF FCBA), Hélios, Cogra, Badger, Piveteau HP+.
- **Certification trouvée mais mono-source, à confiance réduite : 1/15** — NESTRO (FSC affiché chez un seul revendeur, non recoupé).
- **Aucune certification confirmée : 5/15** — Butagaz (numéro DINplus non vérifiable au registre), RUF, PINI KAY, CREPITO bûches, Ma Bûch'Hêtre.
- **GTIN palette retenu : 0/15.**
- **EAN (de sac, de paquet, ou codes non-GTIN) vus et explicitement écartés : 9** — Starforest (3760128010066, sac), Woodstock (3760167700003, sac), Badger (5420044090013, sac), PINI KAY (0650414083993, paquet 10 kg dupliqué sur 4 formats de palette), Limouzi (4000000000099, identifiant interne boutique non-GTIN), Hélios (4000000000341, identifiant interne boutique non-GTIN), Cogra (2039196546830, plage GS1 à circulation restreinte non confirmée sur la page produit), NESTRO (4260680094843, candidat palette mono-source jugé insuffisant), Butagaz (mention d'un n° de certification DINplus 7A329 non vérifiable — pas un EAN mais listé ici pour traçabilité de ce qui a été écarté).

## Notes par produit

### MKT-GRANULES-STARFOREST-PALETTE — Starforest, palette de 70 sacs de 15 kg
Certification solide : DINplus n° **7A268**, titulaire **AGROMI SAS** (Pauvres, France), classe
« Wood Pellets A1 », conforme DIN EN ISO 17225-2:2021-09, validité jusqu'au 30/09/2030 —
vérifié directement sur le registre officiel DIN CERTCO, avec confirmation croisée sur la
fiche technique PDF du fabricant (Luzeal) et plusieurs distributeurs indépendants.
Caractéristiques (résineux 100 %, cendres ≤ 0,7 %, humidité ≤ 10 %, PCI ≥ 5 kWh/kg,
diamètre 6 mm ±1) cohérentes entre toutes les sources. Aucun MPN distinct trouvé (le nom
« STARFOREST » fait office de modèle dans le registre DIN CERTCO).
EAN **3760128010066** vu sur la fiche technique officielle, explicitement noté « Gencod
n° 3 760128010066 sur chaque sac » — c'est donc un EAN de sac, écarté sans ambiguïté.
Aucun GTIN de palette trouvé. **Confiance : haute** sur certification et caractéristiques.

### CREPITOGRA — Crépito granulés, palette de 66 sacs de 15 kg
DINplus n° **7A288**, titulaire **Euro Energies SAS** (groupe Poujoulat), marque « Crépito »
nommément listée au registre officiel, validité jusqu'au 30/04/2031. Le site officiel
mentionne aussi NF Biocombustibles et un contrôle laboratoire CERIC (COFRAC), mais aucun
numéro NF n'a été retrouvé. L'essence exacte (résineux/feuillus) n'est pas précisée par
le fabricant, qui parle seulement de « bois vierge sans additif ». Cendres, humidité et
PCI cohérents entre le site officiel et des distributeurs, avec de légers écarts
(0,4–0,6 % de cendres selon la source). **Aucun EAN — ni sac ni palette — n'a été trouvé**
sur les pages consultées.
**Point de vigilance signalé par l'agent de recherche, à faire vérifier en interne** :
toutes les sources trouvées (site officiel Crépito et une demi-douzaine de distributeurs)
décrivent systématiquement une palette Crépito de **72 sacs (1080 kg)**, avec une variante
demi-palette à 36 sacs. Aucune source ne mentionne 66 sacs. Ceci concerne le conditionnement,
pas la certification, mais peut affecter le poids/prix déclarés au flux Merchant — à confirmer
auprès du fournisseur réel de MLC Bois avant publication. **Confiance : haute** sur la
certification, **moyenne** sur cendres/humidité/PCI, **faible** sur la cohérence du
conditionnement 66 sacs.

### BUTAGAZGRA — Granulés Butagaz, palette de 66 sacs de 15 kg
Butagaz est un fournisseur d'énergie qui commercialise des granulés fabriqués par des
tiers (usines citées : Landes, Alsace) — le certificat DINplus réel est donc probablement
détenu par le sous-traitant fabricant, pas par « Butagaz » en tant que marque. Un numéro
DINplus **« 7A329 »** circule chez plusieurs revendeurs, mais **il n'a pas pu être confirmé
au registre officiel DIN CERTCO** malgré plusieurs tentatives (recherche directe infructueuse ;
la fiche entreprise « SAS BUTAGAZ » existe au registre mais son contenu était inaccessible,
erreurs 404/503 répétées). Le site officiel (granulesbois.butagaz.fr) a bloqué le fetch (403).
**Ce numéro de certification n'est donc pas à afficher tel quel** sans vérification
supplémentaire directe auprès de Butagaz ou de DIN CERTCO.
Caractéristiques techniques (résineux 100 %, cendres 0,4 %, humidité 6,5 %, PCI ≥ 4,9 kWh/kg,
diamètre 6,10 mm) cohérentes entre plusieurs revendeurs indépendants.
Un code à 13 chiffres de forme « 4000000000709 » a été vu associé à un revendeur
(boisenergienord.fr) mais rien ne confirme qu'il s'agit d'un vrai GTIN GS1 plutôt que
d'un identifiant interne de boutique (le préfixe « 400 » est une plage réservée à un
usage interne en Allemagne). **Écarté par prudence.** **Confiance : moyenne** sur les
caractéristiques techniques, **faible** sur la certification (numéro non confirmé).

### MKT-GRANULES-TOTAL-ENERGIES-PALETTE — Granulés TotalEnergies, palette de 66 sacs de 15 kg
DINplus n° **7A269**, titulaire **TotalEnergies Marketing France**, marque « TotalEnergies
Pellets Premium », classe A1, validité jusqu'au 31/08/2030 — vérifié sur le registre officiel.
Le site officiel revendique aussi « ENplus A1 » mais **aucun numéro de licence ENplus n'a
pu être vérifié** dans un registre consultable — à traiter comme non confirmé, le bullet
existant en base (« Certifiés DINplus ») reste la seule mention fiable.
Caractéristiques (résineux, sciure française, cendres 0,6–0,7 %, humidité ≤ 8 %, PCI
4,8–5,3 kWh/kg, diamètre 6 mm) cohérentes entre deux pages du site officiel avec un léger
écart sur le taux de cendres exact. Aucun EAN de sac ni de palette trouvé (pages Leroy
Merlin inaccessibles en 403). **Confiance : moyenne** — certification vérifiée
officiellement, mais MPN et GTIN introuvables, léger flou sur le taux de cendres.

### LIMOUZILIM — Limouzi Granulés, palette de 66 sacs de 15 kg
DINplus n° **7A243**, titulaire **SAS GDM PELLETS**, marque « LIMOUZI » nommément listée
au registre, classe A1, validité jusqu'au 30/04/2030 — vérifié officiellement. Le
fabricant revendique aussi PEFC (numéro non trouvé).
**Point important : le bullet existant en base affirme « Certifié ENplus A1 ».** Aucune
des sources consultées (site officiel du fabricant GDM Group, quatre distributeurs
indépendants, registre DIN CERTCO) ne confirme une certification ENplus — toutes
concordent sur DIN Plus + PEFC uniquement. **Cette mention en base mérite vérification et
correction probable avant publication au flux Merchant** : afficher une certification
ENplus A1 non détenue serait une allégation commerciale non fondée, distincte du risque
GTIN mais du même ordre de gravité pour la crédibilité du flux.
Caractéristiques (résineux — épicéa/douglas du Limousin, cendres < 0,5 %, humidité < 8 %,
PCI 4,6–5 kWh/kg, diamètre 6 mm) cohérentes entre trois distributeurs indépendants.
Le code **4000000000099** vu dans une URL de revendeur (boisenergienord.fr) **n'est pas un
GTIN valide** : c'est un identifiant interne séquentiel de la plateforme e-commerce (d'autres
produits sans rapport, sur le même site, portent des codes de la même série
« 40000000XXXX »). Écarté avec certitude. **Confiance : haute** sur la certification
(registre officiel), **moyenne** sur les caractéristiques techniques.

### WOODSTOCKG — Granulés Woodstock, palette de 66 sacs de 15 kg
Double certification confirmée : DINplus n° **7A288** (Euro Energies SAS, marque
« WOODSTOCK » nommément listée, classe A1, validité jusqu'au 30/04/2031) et **NF
Biocombustibles Solides Granulés n° D79360-016** (certifié par FCBA) — les deux vérifiées
sur la fiche technique officielle du fabricant ET, pour le DINplus, sur le registre DIN
CERTCO. Ce numéro DINplus 7A288 est identique à celui trouvé pour Crépito — cohérent car
Euro Energies SAS (groupe Poujoulat) semble certifier plusieurs marques commerciales sous
un même certificat.
Essence non précisée par le fabricant (« 100 % bois vierge »). Cendres ≤ 0,5 %, humidité
≤ 8 %, PCI 4,8–5,3 kWh/kg, diamètre 6 mm ±1 — tous confirmés par la fiche technique
officielle PDF (datée 01/2017).
Référence produit officielle **« WBG 15 »** trouvée, mais c'est la référence du **sac** de
15 kg (visible dans l'EAN associé), pas de la palette — à ne pas utiliser comme MPN
palette sans vérification. EAN **3760167700003** confirmé à la fois par la fiche technique
officielle et par la page Castorama (même code dans l'URL du produit) : désigne le sac,
écarté.
**Point de vigilance signalé par l'agent, à faire vérifier en interne** : la fiche
technique officielle indique une palette standard de **72 sacs** (6 sacs × 12 couches), et
des distributeurs vendent aussi des palettes de **78 sacs**. Aucune source ne mentionne 66
sacs. **Confiance : haute** pour certification et caractéristiques (fiche officielle),
mais alerte sur l'écart de conditionnement (72/78 vs 66 attendu en base).

### HELIOSGRAN — Granulés Hélios, palette de 66 sacs de 15 kg
DINplus n° **7A219**, titulaire **SARL Chimie Import Developpement** (CID Groupe,
Nanterre), marque « HELIOS GRANULÉS » nommément listée, classe A1, validité jusqu'au
30/06/2029 — vérifié officiellement. Le site du titulaire revendique aussi une conformité
« EN Plus » mais aucun numéro de licence ENplus n'a été trouvé/confirmé.
Faux positif écarté avec succès pendant la recherche : bien confirmé qu'il s'agit de
granulés de bois de chauffage (marque déposée par CID Groupe), pas d'un homonyme sans
rapport (ex. panneaux solaires).
Caractéristiques : résineux 100 %, cendres 0,30 % (source officielle, un distributeur
indique <0,7 %), humidité ≤ 8 %, PCI 4,9 kWh/kg, diamètre 6 mm. Origine géographique
contestée entre sources (fabrication évoquée en Belgique par des distributeurs, alors que
le titulaire de la certification est une société française) — à clarifier, sans impact
sur la certification elle-même qui reste valide et vérifiée.
Le code **4000000000341** (boisenergienord.fr) n'est **pas un GTIN valide** — même série
interne séquentielle de boutique que pour Limouzi ci-dessus. Écarté.
**Point de vigilance** : plusieurs sources indiquent une palette standard de **65 sacs**
(975 kg), alors que le SKU en base cible 66 sacs — écart à vérifier avec le fournisseur.
**Confiance : moyenne-haute** sur la certification, **moyenne** sur les caractéristiques.

### COGRAGRANU — Granulés Cogra, palette de 66 sacs de 15 kg
DINplus n° **7A140**, titulaire « **Cogra Quarante Huit S.A.** », produit « Wood Pellets
class A1 », modèle « COGRA » — confirmé sur le registre officiel DIN CERTCO. Des mentions
« EN+A1 FR017 » et « ÖNorm M 7135 » existent chez un distributeur mais n'ont pas pu être
recoupées indépendamment — non retenues comme confirmées. Une page (tereaflandres.fr) porte
« 7a202 » dans son URL/titre alors que son propre contenu cite « DIN+ 7A140 » : incohérence
interne à cette page, ignorée au profit du 7A140 vérifié au registre officiel.
Caractéristiques divergentes selon les sources : cendres 0,50 % vs ≤0,70 %, PCI
5,0–5,2 kWh/kg — aucune fiche technique PDF officielle unique trouvée pour trancher.
Un code **2039196546830** a été associé, dans un résultat de recherche, à une référence
distributeur pour une palette de 70 sacs, mais **n'a pas pu être confirmé sur la page
produit consultée directement** (le code n'y apparaît pas). Son préfixe « 203 » tombe dans
la plage GS1 200–299 réservée aux numéros à circulation restreinte (usage interne
entreprise, pas un GTIN mondialement unique) — structurellement pas un identifiant
Merchant valide même s'il avait désigné une palette. Écarté avec certitude.
**Point de vigilance** : le SKU en base indique 66 sacs, mais la quasi-totalité des
sources (une dizaine de distributeurs) indique systématiquement **70 sacs** (une seule
source : 67 sacs) — à vérifier auprès du fournisseur. **Confiance : moyenne** sur la
certification (confirmée au registre), **faible** sur cendres/humidité/PCI (pas de fiche
officielle unique), aucun GTIN retenu.

### MKT-GRANULES-BADGER-PALETTE — Granulés Badger, palette de 66 sacs de 15 kg
DINplus n° **7A072**, titulaire « **SA GROUPE FRANCOIS** » (Virton, Belgique), marque
« BADGER PELLETS » nommément listée, classe A1, validité jusqu'au 28/02/2028 — confirmé au
registre officiel. « EN Plus A1 » largement revendiqué par la marque et les distributeurs,
mais aucun numéro de licence ENplus confirmé sur un registre.
Caractéristiques : résineux 100 % écorcé, fabriqué à Virton et Thimister (Belgique).
Cendres et PCI divergent selon la source (page qualité officielle vs fiches distributeurs)
— pas de valeur unique certaine, cohérent toutefois avec le bullet base « faible taux de
cendres ». Humidité < 10 %, diamètre 6 mm cohérents partout.
EAN **5420044090013** vu de façon cohérente sur deux distributeurs belges indépendants
(Tecniba, magasin-bricolage.be), désignant explicitement le « sac de 15 kg » — préfixe 542
(plage GS1 Belgique/Luxembourg, cohérent avec la fabrication à Virton), probablement un EAN
authentique mais qui désigne le sac, pas la palette. **Écarté pour la fiche palette.**
**Point de vigilance** : le SKU en base indique 66 sacs, mais toutes les sources trouvées
(une dizaine de distributeurs) indiquent systématiquement **65 sacs** — jamais 66 — à
vérifier auprès du fournisseur. **Confiance : moyenne** sur la certification, **faible à
moyenne** sur cendres/PCI (données contradictoires), aucun GTIN palette retenu.

### MKT-GRANULES-PIVETEAU-HP-PLUS-PALETTE — Granulés Piveteau HP+, palette de 72 sacs de 15 kg
DINplus n° **7A109**, titulaire « **SAS PIVETEAU BOIS** » (Sainte-Florence, 85, France),
désignation commerciale « Pellets HP+ », conforme DIN EN ISO 17225-2:2021-09, validité
jusqu'au 31/07/2029 — c'est le produit le mieux sourcé du lot : confirmé de manière
indépendante à la fois sur le site officiel du fabricant ET sur le registre officiel DIN
CERTCO, avec des valeurs concordantes. EN Plus n° **FR037** mentionné sur le site officiel
(source primaire fabricant, non recoupé indépendamment sur un registre EN Plus séparé).
Caractéristiques (100 % résineux français — pin, douglas, épicéa ; cendres ≤ 0,35 % — léger
écart avec le bullet base « sous 0,3 % » ; humidité < 6,5 % ; PCI > 4,85 kWh/kg ; diamètre
6 mm ±1 ; densité en vrac ≥ 650 kg/m³) toutes issues du site officiel.
Aucun EAN trouvé, ni sac ni palette, malgré une recherche active sur quatre distributeurs.
**Conditionnement cohérent avec le SKU en base** : 72 sacs de 15 kg (1080 kg), confirmé sans
divergence par toutes les sources — seul produit du lot où le conditionnement déclaré en
base correspond exactement au marché. **Confiance : haute** sur certification et
caractéristiques ; absence de GTIN traitée comme fiable (recherche active infructueuse,
pas absence de recherche).

### RUFRUFBUCH — RUF Bûches compressées, palette de 960 kg
« RUF » est un type de presse hydraulique (nommé d'après le fabricant allemand de
presses Ruf Maschinenbau, Zaisertshofen), pas une marque de produit fini unique : de très
nombreuses scieries pressent des briquettes « RUF » sous leur propre marque. Il n'existe
donc pas de fiche technique officielle centralisée.
Certification incertaine : un revendeur (oekobrix.de) affiche « DIN 51731 zertifiziert »
(norme allemande ancienne, largement supplantée par DINplus/EN ISO 17225-3) ; un autre
(tfbs-shop.com) évoque « DINplus zertifizierte Hartholzbriketts » dans son URL/titre mais
la page n'a pas pu être vérifiée en direct (403). **Aucun numéro de certificat DINplus
trouvé.**
Caractéristiques : hêtre ou chêne selon variante, sans liant chimique (liaison par
pression 200-400 bar), cendres ~1,0 %, PCI ~4,7–5,3 kWh/kg, densité ~1,0–1,1 kg/dm³, durée
de combustion ~2h flamme + ~2h braise. Aucune valeur d'humidité chiffrée fiable trouvée.
Aucun MPN fabricant universel — seulement des références internes de revendeurs
(« 20003-960 » chez oekobrix.de, « 0V10960 » chez mayerhofer-brennstoffe.de). Aucun EAN
trouvé, ni paquet ni palette, sur les six sources consultées. **Confiance : faible à
moyenne** — caractéristiques physiques cohérentes entre sources mais certification
incertaine, aucun GTIN ni MPN fabricant identifiable.

### NESTRONEST — NESTRO Bûches compressées, palette de 900 kg
« NESTRO » désigne une forme cylindrique de briquette, produite par plusieurs fabricants
(Pollmeier Massivholz, Bioles Horizont, Adolf Münchinger, Energie Kienbacher, UAB REDAL) —
aucun lien trouvé avec NESTRO Lufttechnik GmbH (fabricant autrichien de presses/technique
de ventilation, entité distincte malgré l'homonymie).
FSC confirmé sur une fiche produit (energie-kienbacher.de, HTML brut vérifié). DINplus
mentionné de façon générique ailleurs (référence à l'ancienne norme EN 14961-3) sans
numéro rattaché à ce produit précis.
Caractéristiques : hêtre et/ou chêne, pressage hydraulique par excentrique, PCI
~5,2 kWh/kg (source officielle du revendeur). Cendres et humidité chiffrées non trouvées
pour ce produit précis.
**Candidat GTIN examiné et NON retenu** : le code **4260680094843** a été trouvé en donnée
structurée (`itemprop="gtin13"`) sur la fiche energie-kienbacher.de correspondant
exactement au produit visé (poids 900,00 kg, « Verpackungseinheit » = Palette, SKU
BNHHB_PL900). Contrôle croisé effectué sur ce même site : chaque grammage (100 kg, 900 kg,
960 kg) a un GTIN distinct, sans duplication détectée — contrairement au cas PINI KAY
ci-dessous. Ce code passe le contrôle de checksum. Mais il provient d'une **source
unique**, un revendeur allemand qui a pu s'auto-attribuer ce code pour son propre
conditionnement en palette (préfixe GS1 « 426... » cohérent avec un usage par ce
distributeur, pas nécessairement le fabricant d'origine) — rien ne garantit qu'il
identifie la même unité de vente que la palette proposée par MLC Bois. Étant donné le
risque de suspension du compte marchand en cas d'identifiant erroné, et l'absence de
recoupement sur une deuxième source indépendante, ce code n'est **pas retenu** dans le
tableau. **Confiance : moyenne** sur les caractéristiques techniques (source unique et
partielle), **insuffisante** sur le GTIN pour une intégration au flux.

### PINIKAYNES — PINI KAY Bûches compressées, palette de 960 kg
**Attention à un piège de nommage en base** : le nom produit enregistré pour ce SKU est
« NESTRO Bûches compressées — Palette 960 kg », mais la marque enregistrée est « PINI KAY ».
Il s'agit bien d'une entrée distincte du SKU NESTRONEST (marque NESTRO, palette 900 kg,
forme cylindrique) — à corriger côté fiche produit si possible pour éviter toute ambiguïté
visible côté client ou dans le flux Google (deux marques différentes ne doivent pas
apparaître sous un nom de produit identique). Toutes les recherches ci-dessous portent
donc sur la marque **PINI KAY** (procédé de pressage octogonal, développé initialement en
Lettonie ; producteur actuel identifié : UAB REDAL, Šiauliai, Lituanie, marque
« The Poetic Mole »).
Certification incertaine : DINplus évoqué de façon générique par un revendeur (bandeau
« ENplus A1 / DINplus / DIN 51731 » affiché sur toutes ses fiches briquettes, pas
spécifique à ce produit) ; logo FSC affiché sur la fiche produit sans numéro. Une source
isolée évoque « ENplus A1 zertifiziert » — probablement une erreur : ENplus (EN ISO
17225-2) est réservé aux granulés, DINplus (EN ISO 17225-3, classe A1) au bûches/briquettes
— confirmé via la page officielle DIN CERTCO. **Aucun numéro de certificat trouvé et
rattaché explicitement à ce produit.**
Caractéristiques (hêtre/chêne, cendres 0,5 %, humidité ~8 %, PCI 5,3 kWh/kg, densité
1,25 g/cm³, tenue de braise 4-5h) toutes vérifiées en HTML brut sur une même source
(oekobrix.de) — cohérentes mais mono-source.
**EAN 0650414083993 vu et écarté — cas d'école du piège à éviter.** Ce code est associé,
dans le JSON-LD de frankenbrennstoffe.de, à un SKU explicitement décrit comme « unité
individuelle » (paquet de 10 kg). Vérifié en HTML brut : **ce même code GTIN est dupliqué à
l'identique** sur les fiches de palettes 960 kg, 480 kg et 300 kg du même revendeur — soit
exactement le scénario à éviter décrit dans la consigne : un EAN de conditionnement
unitaire réutilisé à tort sur plusieurs tailles de palette. Non retenu, à aucun titre.
**Confiance : moyenne** sur les caractéristiques techniques, **élevée** sur la mise à
l'écart du GTIN (démonstration factuelle de la duplication incorrecte).

### CREPITOBUCHE — CREPITO Bûches compressées Hêtre, palette de 960 kg (96×10 kg)
Aucune certification confirmée pour les bûches elles-mêmes : le DINplus et le NF
Biocombustibles trouvés pour la marque Crépito s'appliquent aux **granulés** (voir
CREPITOGRA), pas aux bûches densifiées. Pour les bûches, le site officiel mentionne
uniquement un contrôle par le laboratoire **CERIC** et la mention « Bois de France »
(sans numéro de certification formelle). Un distributeur évoque des forêts « certifiées
PEFC » pour la nouvelle formule — non confirmé sur le site officiel.
**Essence à vérifier** : la fiche officielle ne précise pas l'essence (« 100 % sciures et
copeaux de bois non traités »). Un distributeur indique que Crépito aurait fait évoluer sa
formule d'un 100 % hêtre vers un mélange 80 % hêtre / 20 % chêne — à faire confirmer par le
fabricant avant d'écrire « 100 % hêtre » dans une description produit, malgré le SKU
« CREPITOBUCHE...Hêtre ».
Cendres ≤ 1,5 %, humidité ≤ 12 % (officiel) ou ≤ 10 % (tiers), PCI 4,6–5 kWh/kg — cohérent
avec le bullet base « 4,9 kWh/kg ». Densité ≤ 1000 kg/m³. Durée de combustion ~1h-1h30 par
bûche ronde.
**Point de vigilance** : la configuration « 96 paquets de 10 kg / 960 kg » n'a été
retrouvée nulle part explicitement associée à la marque Crépito. Les configurations
documentées sont plutôt 104 paquets (~1040 kg) ou 140 paquets de 7,5 kg (~1050 kg). Une
configuration « 96 paquets / 960 kg » existe sur le marché sous l'appellation générique
« Bûche de Jour », sans confirmation qu'il s'agit de la marque Crépito précisément — à
vérifier auprès du fournisseur. Aucun EAN, MPN ni GTIN trouvé. **Confiance : moyenne** sur
cendres/humidité/PCI/densité, **faible** sur l'essence exacte et la configuration palette.

### MABUCHHETREM — Ma Bûch'Hêtre (Manubois), palette de 900 kg (90×10 kg)
Fabricant identifié avec certitude : **Manubois SAS** (SIREN 308 307 065), filiale du
Groupe Lefebvre, siège aux Grandes-Ventes (76), propriétaire de la marque déposée
« Ma Buch'Hêtre » (dépôt INPI FR4448932 du 25/04/2018, valable jusqu'en 2028) — sources
pappers.fr et infonet.fr. **Piège d'homonymie signalé et évité** : il existe une société
distincte, également nommée « Manubois », basée à Simandre (71), sans lien apparent avec
la marque « Ma Bûch'Hêtre » — à ne pas confondre dans le dossier fournisseur.
Aucune certification confirmée (DINplus, NF Bois de chauffage non identifiés pour ce
produit) ; mention générique « forêts durablement gérées » sans numéro.
Essence : léger flou — « 100 % feuillus, sans écorce ni additif » selon un distributeur
vs « 100 % Hêtre » selon un autre (cohérent avec le nom de marque). Cendres < 0,5 %,
humidité < 8 % (cohérent avec le bullet base), PCI 5 kWh/kg (source : « 5000 kWh/tonne » —
légèrement au-dessus du bullet base 4,8 kWh/kg, écart mineur à vérifier). Densité
> 1050 kg/m³. Durée de combustion divergente selon la source (1h30 à 2h30 pour une bûche
unitaire).
**Point de vigilance** : la configuration « 90 paquets de 10 kg / 900 kg » n'a été
retrouvée nulle part telle quelle. La configuration documentée par la source la plus
détaillée est 104 paquets (~1040 kg) — à vérifier auprès du fournisseur. Aucun EAN, MPN ni
GTIN trouvé. **Confiance : moyenne** — identité du fabricant solidement établie et
caractéristiques par bûche cohérentes entre deux sources, mais configuration palette non
confirmée et durée de combustion divergente.

## Synthèse transversale

- **GTIN retenus pour le flux Merchant : 0/15.** C'est le résultat attendu compte tenu du
  mode de vente à la palette : aucune source consultée, pour aucune des 15 marques, ne
  publie de GTIN attribué explicitement à l'unité « palette ». Le candidat le plus proche
  (NESTRO, 4260680094843) a été examiné en détail et écarté pour insuffisance de
  corroboration plutôt que retenu par excès de confiance.
- **Certifications** : le DINplus est de loin la certification la plus répandue et la
  mieux sourcée sur ce lot (registre officiel DIN CERTCO consultable et interrogeable par
  société), confirmée pour 9 des 10 granulés (Butagaz excepté, numéro non vérifiable) et
  pour aucune des 5 bûches compressées avec certitude. Le bullet « ENplus A1 » de
  LIMOUZILIM en base est probablement erroné et mérite vérification avant publication.
- **Un signal récurrent et transversal, hors périmètre GTIN/certification mais notable** :
  pour six produits sur quinze (Crépito granulés, Woodstock, Hélios, Cogra, Badger, Crépito
  bûches, Ma Bûch'Hêtre), le nombre de sacs/paquets par palette indiqué en base ne
  correspond à aucune configuration retrouvée sur le marché pour cette marque précise
  (écarts de 1 à 14 sacs, ou de ~80 à ~140 kg selon les cas). Cela n'invalide aucune donnée
  du tableau ci-dessus, mais mérite une vérification directe auprès du/des fournisseurs
  réels de MLC Bois avant de figer poids et prix au litre/tonne dans les fiches produit.
