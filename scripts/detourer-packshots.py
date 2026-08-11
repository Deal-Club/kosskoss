"""
Détourage et recadrage des visuels produits.

POURQUOI
────────
Les 70 visuels du catalogue sont des JPG — format qui ne connaît pas la
transparence. Chaque flacon traîne donc son fond de studio, un blanc cassé
légèrement différent d'un produit à l'autre (#f1f1f1, #efeff1, #f0eff4…).

Tant que ces vignettes vivaient sur des cartes blanches, cela ne se voyait pas.
La refonte les pose sur les teintes des routines et sur le vert profond du focus
marque : chaque packshot y apparaît alors comme un rectangle gris flottant sur
la couleur. C'est ce que le retour décrit — « du fait qu'elles ont du
background, ça a gâté l'affichage ».

Second défaut, mesuré : le sujet n'occupe que 5 à 21 % de l'image. Le flacon est
minuscule au milieu d'une marge vide, et aucune mise en page ne peut rattraper
ça — d'où « les images ne sont pas bien disposées ».

MÉTHODE
───────
1. La couleur de fond est relevée sur la bande périphérique de l'image, et non
   supposée blanche : elle varie d'un produit à l'autre.

2. Le fond est retiré PAR PROPAGATION DEPUIS LES BORDS, et non par simple seuil
   global. La différence est décisive : un bouchon blanc ou une étiquette claire
   ressemblent au fond, mais ne lui sont pas reliés. Un seuil global les
   effacerait — un test l'a montré, un flacon perdait les trois quarts de sa
   surface. La propagation ne retire que ce qui touche le bord.

3. Le bord du sujet est adouci sur un pixel : sans cela le détourage laisse un
   liseré en escalier, très visible sur fond sombre.

4. L'image est recadrée sur le sujet avec 4 % de marge, puis reposée au carré.
   Le flacon occupe alors le cadre au lieu d'y flotter.

5. Sortie en WebP avec couche alpha : plus léger que le PNG à qualité égale.

Les JPG d'origine ne sont pas touchés. Le code choisit le WebP quand il existe
et retombe sur le JPG sinon, de sorte qu'un produit non traité reste affiché.

Lancement :  python scripts/detourer-packshots.py
"""

from __future__ import annotations

import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

SOURCE = os.path.join("public", "images", "products")
SORTIE = os.path.join("public", "images", "products", "detoures")
MANIFESTE = os.path.join("src", "data", "kk", "packshots-detoures.json")

# Écart maximal à la couleur de fond, en distance euclidienne RVB. Calé large
# assez pour absorber le dégradé du fond de studio, serré assez pour ne pas
# entamer un flacon clair.
TOLERANCE = 26.0

# Marge conservée autour du sujet, en proportion du plus grand côté.
MARGE = 0.04


def couleur_de_fond(pixels: np.ndarray) -> np.ndarray:
    """Couleur dominante de la bande périphérique — le fond, quel qu'il soit."""
    bande = np.concatenate(
        [
            pixels[0:6].reshape(-1, 3),
            pixels[-6:].reshape(-1, 3),
            pixels[:, 0:6].reshape(-1, 3),
            pixels[:, -6:].reshape(-1, 3),
        ]
    )
    return np.median(bande, axis=0)


def fond_relie_au_bord(proche_du_fond: np.ndarray) -> np.ndarray:
    """
    Parmi les pixels qui ressemblent au fond, ceux qui lui sont RELIÉS.

    Parcours en largeur depuis les quatre bords. Un bouchon blanc au centre du
    flacon ressemble au fond mais n'est atteint par aucun chemin : il survit.
    """
    h, w = proche_du_fond.shape
    vu = np.zeros((h, w), dtype=bool)
    file: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if proche_du_fond[y, x] and not vu[y, x]:
                vu[y, x] = True
                file.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if proche_du_fond[y, x] and not vu[y, x]:
                vu[y, x] = True
                file.append((y, x))

    while file:
        y, x = file.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and proche_du_fond[ny, nx] and not vu[ny, nx]:
                vu[ny, nx] = True
                file.append((ny, nx))

    return vu


def traiter(chemin: str) -> tuple[bool, str]:
    image = Image.open(chemin).convert("RGB")
    pixels = np.asarray(image).astype(np.int16)

    fond = couleur_de_fond(pixels)
    distance = np.sqrt(((pixels - fond) ** 2).sum(axis=2))
    proche = distance <= TOLERANCE

    # Un fond qui ne couvre pas au moins la moitié de l'image n'est pas un fond
    # de studio : mieux vaut ne rien faire que de trouer le visuel.
    if proche.mean() < 0.5:
        return False, "fond non détecté"

    a_retirer = fond_relie_au_bord(proche)
    sujet = ~a_retirer

    if sujet.mean() < 0.005:
        return False, "sujet introuvable"

    alpha = Image.fromarray((sujet * 255).astype(np.uint8), mode="L")
    # Adoucit le bord : sans cela, le détourage laisse un escalier de pixels,
    # très visible dès que la vignette est posée sur un fond sombre.
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))

    decoupe = image.convert("RGBA")
    decoupe.putalpha(alpha)

    boite = decoupe.getbbox()
    if boite is None:
        return False, "sujet vide"

    gauche, haut, droite, bas = boite
    marge = int(max(droite - gauche, bas - haut) * MARGE)
    decoupe = decoupe.crop(
        (
            max(0, gauche - marge),
            max(0, haut - marge),
            min(decoupe.width, droite + marge),
            min(decoupe.height, bas + marge),
        )
    )

    # Reposé au carré : les vignettes gardent des proportions identiques d'un
    # produit à l'autre, sans quoi une grille de flacons devient un escalier.
    cote = max(decoupe.size)
    carre = Image.new("RGBA", (cote, cote), (0, 0, 0, 0))
    carre.paste(
        decoupe,
        ((cote - decoupe.width) // 2, (cote - decoupe.height) // 2),
    )
    if cote > 900:
        carre = carre.resize((900, 900), Image.LANCZOS)

    nom = os.path.splitext(os.path.basename(chemin))[0] + ".webp"
    carre.save(os.path.join(SORTIE, nom), "WEBP", quality=88, method=6)
    return True, f"sujet {sujet.mean() * 100:.0f}%"


def main() -> int:
    if not os.path.isdir(SOURCE):
        print(f"Dossier introuvable : {SOURCE}")
        return 1

    os.makedirs(SORTIE, exist_ok=True)
    fichiers = sorted(f for f in os.listdir(SOURCE) if f.lower().endswith((".jpg", ".jpeg", ".png")))

    faits: list[str] = []
    ignores: list[str] = []
    for nom in fichiers:
        ok, note = traiter(os.path.join(SOURCE, nom))
        if ok:
            faits.append(os.path.splitext(nom)[0])
        else:
            ignores.append(f"{nom} ({note})")

    # Manifeste des visuels réellement détourés.
    #
    # Le site ne peut pas vérifier l'existence d'un fichier à chaque rendu, et
    # deviner le chemin sans vérifier casserait l'affichage du premier produit
    # ajouté après ce traitement. La liste est donc écrite ici et lue par
    # src/lib/kk/packshot.ts : un produit qui n'y figure pas garde son JPG.
    with open(MANIFESTE, "w", encoding="utf-8") as f:
        json.dump(sorted(faits), f, ensure_ascii=False, indent=2)
        f.write("\n")

    # Sortie en ASCII : la console Windows est en cp1252 et une flèche Unicode
    # y fait planter le script au tout dernier print, après tout le travail.
    print(f"Detourage : {len(faits)}/{len(fichiers)} visuels traites -> {SORTIE}")
    print(f"Manifeste : {MANIFESTE}")
    for ligne in ignores:
        print(f"  ignore : {ligne}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
