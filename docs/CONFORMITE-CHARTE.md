# Conformité à la charte KossKoss Select

Ce document confronte le site à la **charte de marque livrée par le client**
(`docs/design-references/kks/charte/`, pages extraites de `Charte_KK_V1.pdf`).
Il existe parce que le site s'écarte de la charte sur deux points, et que ces
écarts sont **délibérés** : quelqu'un doit pouvoir le savoir sans avoir à le
deviner.

Le kit complet a été reçu le 24 août 2026. Les six documents catalogue qu'il
contient sont **identiques** à ceux traités la veille — vérifié par empreinte
de fichier, conformément à ce que le client a précisé lui-même. Ce qu'il
apporte de neuf : la charte, l'identité de marque, les fichiers du logo et
97 visuels.

## 1. Ce que la charte impose

### Typographies (planche A-8)

| Rôle | Police imposée | Graisses |
|---|---|---|
| Texte courant, interface, descriptions | **Montserrat** | Light / Regular ; Medium pour les sous-titres |
| Titres et slogans | **Cormorant Garamond** | Regular ; Medium/Bold pour les mises en avant |
| Contre-signature, décoratif | **Naishila Dancing Script** | Regular uniquement |

### Couleurs (planche A-7)

| Rôle | Valeur |
|---|---|
| Couleur pilier — Confiance / Soin | `#0F3B46` |
| Couleur secondaire — Chaleur / Peau | `#F3E8DD` |
| Neutre — textes et séparations | `#D9D9D9` |
| Doré doux — accent premium | `#C89B3C` |

## 2. Ce que le site applique, et pourquoi

### Typographies — écart assumé

Le site utilise **Manrope** (texte), **Playfair Display** (titres) et
**Cinzel** (logotype). Aucune ne figure dans la charte.

Ce n'est pas un oubli : la question a été posée et **tranchée en faveur du
maintien**. Le coût du changement — refonte visuelle de toutes les pages,
reprise des interlignes et des tailles — a été jugé supérieur au gain de
conformité à ce stade.

**Ce que ça implique si l'on revient dessus** : Montserrat et Cormorant
Garamond sont toutes deux **gratuites sur Google Fonts**, donc sans coût de
licence ni obstacle technique. Naishila Dancing Script est en revanche une
police commerciale : elle demanderait une licence web avant tout usage.

À noter : `TARGET.md` annonce encore « Cinzel pour les titres, Gilroy pour le
texte courant ». **Cette ligne est périmée** — ni l'un ni l'autre ne
correspond à la charte, et la question de la licence Gilroy qu'elle soulevait
n'a plus d'objet, puisque la charte ne demande pas Gilroy.

### Couleurs — écart assumé

| Rôle | Charte | Site | Écart |
|---|---|---|---|
| Pilier | `#0F3B46` | `#11292d` | plus vert, plus sombre |
| Secondaire | `#F3E8DD` | `#eeebe6` | moins jaune |
| Doré | `#C89B3C` | `#bc8640` | plus laiton |
| Neutre | `#D9D9D9` | non repris tel quel | — |

Les valeurs du site ont été **relevées au pixel sur la maquette du client**
(`docs/design-references/kks/Mockup_site_Toutes pages.jpeg`), puis ajustées
pour le contraste : le doré de la charte plafonne à **3,2:1 sur blanc**, très
en dessous des 4,5:1 exigés pour du texte lisible.

Les deux documents viennent du client et se contredisent. La décision a été
de **suivre la maquette**, qui montre le site tel qu'il doit être vu.
`src/config/brand.ts` conserve les valeurs de charte (`#0F3B46`, `#F3E8DD`) :
c'est la référence de marque, pas la palette d'écran.

## 3. Ce qui a été intégré du kit

- **11 galeries produits.** Sur les 84 visuels appariés, **73 sont exactement
  la vignette déjà en place** — vérifié par comparaison perceptuelle, pas à
  l'estime. Les verser tous aurait affiché deux fois la même photo sur la
  fiche. Seuls les 11 qui montrent autre chose (un étui à côté d'un pot, un
  dos de flacon) ont été retenus. Voir `scripts/importer-visuels-kit.ts`.
- **13 ambiances de marque** rangées dans `public/images/brands/`.
- **La charte**, en 29 pages WebP lisibles (3 Mo au lieu de 29).
- **Nettoyage** : les 26 logos SVG de l'ancienne activité électroménager
  (acer, bosch, dji…) ont été retirés. Ils n'étaient référencés nulle part.

## 4. Ce qui manque encore, et que le kit n'apporte pas

| Manque | Conséquence |
|---|---|
| **Logos des 12 marques partenaires** | La vitrine affiche un packshot à la place. Les ambiances livrées ne peuvent pas y suppléer : l'emplacement est une pastille ronde de 64 px, où une gamme alignée serait illisible. |
| **Descriptions des 12 marques** | Les pages marque restent sans texte de présentation. |
| **Visuel pour « Clinique — Gommage exfoliant »** | Seul produit actif sans aucune image, ni vignette ni galerie. Le kit n'en contient pas. |
| **Visuels des 14 routines** | Les routines n'ont ni teinte ni image. |

## 5. Deux corrections de contenu à faire remonter au client

L'appariement des visuels a mis au jour deux confusions qui n'étaient visibles
qu'en comparant les images :

1. **Gel Hydratant Clinique Dramatically Different** — les contenances 50 ml
   et 125 ml portent des photos qui se ressemblent au point qu'un
   rapprochement par le nom les intervertit. Les références internes
   (`CLI-DRA-GEL-50`, `CLI-DRA-GEL-125`) ont servi d'arbitre. **À confirmer
   par le client** : quelle photo pour quelle contenance.
2. **`Clinique 2.png` et `Clinique 3.png`** sont des photos de gamme, pas des
   produits, malgré un nom qui ne le dit pas. Elles ont été traitées comme
   ambiances.
