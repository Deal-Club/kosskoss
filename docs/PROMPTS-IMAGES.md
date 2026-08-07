# Prompts de génération — visuels d'accueil

Trois emplacements, trois intentions différentes. Les prompts sont en anglais :
tous les générateurs (Midjourney, Flux, DALL·E, Ideogram) y répondent mieux.

## Palette à reprendre dans chaque prompt

| Rôle | Hex | Nom charte |
|---|---|---|
| Primaire | `#0F3B46` | Bleu Profond |
| Secondaire | `#F3E8DD` | Beige Sable |
| Fond de page | `#FAF6F0` | Crème |
| Accent | `#B98A4B` | Laiton |

## Consignes valables pour les trois

- **Peaux riches en mélanine.** C'est le positionnement de la boutique, pas une
  option : « soins pour les peaux noires, mates et métissées ».
- **Aucun texte, logo ni étiquette lisible** dans l'image. Les flacons doivent
  rester neutres : afficher une marque qu'on ne distribue pas est trompeur, et
  une étiquette générée est toujours illisible de près.
- **Personne non identifiable de préférence** (cadrage, angle, lumière) tant
  qu'aucun droit à l'image n'est signé.
- Générer **plus grand que nécessaire**, puis recadrer : les ratios ci-dessous
  sont ceux du gabarit, pas ceux du fichier livré.

---

## 1. Bandeau « Diagnostic beauté »

**Où** : la bannière sable de l'accueil (`DiagnosticPromo`), pleine largeur,
coins arrondis 2 rem.
**Format** : 3:1 — générer en 2400 × 800 px.
**Composition** : le sujet occupe **le tiers droit**. Les deux tiers gauches
restent une surface calme où viendront le titre, le paragraphe et le bouton.

```
Editorial beauty banner, 3:1 ultra-wide format. A Black woman with deep
melanin-rich skin sits in the right third of the frame, three-quarter view,
eyes closed, serene — a moment of care rather than a pose. Bare shoulders,
minimal styling, no jewellery. Soft diffused daylight from the right, gentle
falloff. Around her, sparse tropical botanicals: hibiscus, frangipani, a few
broad green leaves, arranged loosely, never crowding the subject.

The left two thirds dissolve into a smooth warm gradient of sand beige #F3E8DD
fading to cream #FAF6F0 — empty, unoccupied negative space with no detail,
reserved for text. Deep teal #0F3B46 appears only as shadow depth and in the
darkest botanical tones. A single brass #B98A4B highlight, no more.

Fine-grain film texture, muted natural palette, editorial skincare campaign
mood, calm and expensive. Shot on medium format, 80mm, shallow depth of field.

Avoid: text, logos, product labels, watermark, harsh contrast, cold blue tones,
clinical white, busy background, subject centred or on the left.
```

**Réglages** : `--ar 3:1 --style raw` (Midjourney) · guidance 3–4 (Flux).

**Note d'intégration** : sur mobile la bannière devient haute et le cadrage
`cover` couperait le sujet. Prévoir `object-position: right` et, en dessous de
`md`, soit masquer l'image, soit la passer en fond très atténué.

---

## 2. Visuel du hero

**Où** : colonne droite du hero, `aspect-[4/5]`, coins arrondis 2 rem, ombre
portée.
**Format** : 4:5 portrait — générer en 1200 × 1500 px.

> **Parti pris à trancher.** Le hero porte aujourd'hui un packshot produit
> détourné (Nubiance HRB-3), choisi parce qu'il illustre littéralement le
> positionnement « hyperpigmentation, peaux noires ». Une image d'ambiance
> raconte mieux la marque mais nomme moins l'offre. Les deux se défendent —
> le prompt ci-dessous suit la demande d'une image d'ambiance.

```
Vertical portrait, 4:5. Close three-quarter crop of a Black woman applying
facial serum with her fingertips, chin to forehead only — no full face, keeping
her unidentifiable. Deep melanin-rich skin, luminous and healthy, visible skin
texture kept natural: no retouching, no plastic smoothing, fine pores and a
soft sheen where the light catches. Short natural nails, no rings.

Background: a deep teal #0F3B46 wall in soft shadow, with one warm sand #F3E8DD
light shape falling diagonally behind her. A dropper bottle in undecorated
frosted glass rests out of focus at the lower edge — unbranded, unlabelled.

Warm directional window light from the upper left, deep gentle shadows, no
hard specular hotspots. Rich, quiet, editorial. Analogue film grain.

Avoid: text, logos, readable labels, full frontal face, teeth, jewellery,
plastic-smooth retouching, cold clinical lighting, white studio background,
stock-photo smile.
```

**Réglages** : `--ar 4:5 --style raw` · guidance 3–4.

**Note d'intégration** : passer la balise en `object-cover` (le hero est en
`object-contain p-8` pour le packshot actuel, qui couperait une photo cadrée).

---

## 3. Visuel « Notre exigence »

**Où** : colonne gauche de `EditorialBlock`, `aspect-[5/4]`, coins arrondis 2 rem.
**Format** : 5:4 paysage — générer en 1500 × 1200 px.

La section parle de **méthode et de tri** : « nous filtrons l'offre plutôt que
de l'empiler », « peu de doublons, aucun produit au hasard ». Une nature morte
sobre dit cela mieux qu'un portrait — le sujet ici, c'est le choix, pas la
cliente. Trois objets, pas douze : la rareté dans l'image porte le propos.

```
Still life, 5:4 landscape. Exactly three unbranded skincare vessels — one
frosted glass dropper bottle, one matte ceramic jar, one small amber flask —
arranged with wide, deliberate spacing on a raw textured surface of warm
terracotta and sand #F3E8DD. Generous empty space between objects: the
composition should feel curated and edited down, not abundant.

Low raking side light casting long soft shadows, late afternoon quality. A
single dried botanical stem and one broad green leaf lie flat, adding rhythm
without clutter. Deep teal #0F3B46 in the shadow tones and background falloff;
one brass #B98A4B glint on a cap.

Muted, mineral, tactile. Fine film grain, medium format, 100mm macro, sharp
focus on the central vessel, soft falloff. Quiet luxury, apothecary restraint.

Avoid: text, logos, readable labels, more than three vessels, symmetrical
centred layout, glossy commercial reflections, white seamless background,
scattered petals, cold tones.
```

**Réglages** : `--ar 5:4 --style raw` · guidance 3–4.

---

## Après génération

1. Convertir en WebP et redimensionner à la largeur d'affichage réelle
   (`scripts/generer-logos.mjs` montre le motif avec `sharp`).
2. Déposer dans `public/images/editorial/`.
3. Vérifier le contraste du texte posé par-dessus — surtout sur le bandeau
   diagnostic, où le titre est en Bleu Profond sur la zone claire de gauche.
