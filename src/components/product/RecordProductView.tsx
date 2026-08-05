"use client";

import { useEffect } from "react";
import { recordProductView } from "@/lib/recentlyViewed";

interface RecordProductViewProps {
  productId: string;
  slug: string;
  brand: string;
  name: string;
  image: string;
  path: string;
  priceCents: number;
}

/**
 * Sonde invisible posée sur la fiche produit : elle note la consultation dans
 * l'historique de session, lu ensuite par le popup de sortie et la page
 * « Consultés récemment ». Aucun rendu, un seul effet au montage.
 *
 * Les champs sont pris un par un (et non un objet `item`) pour que la liste de
 * dépendances de l'effet ne contienne que des primitives stables — un objet
 * recréé à chaque rendu du parent aurait rejoué l'effet en boucle.
 */
export function RecordProductView({
  productId,
  slug,
  brand,
  name,
  image,
  path,
  priceCents,
}: RecordProductViewProps) {
  useEffect(() => {
    recordProductView({ productId, slug, brand, name, image, path, priceCents });
  }, [productId, slug, brand, name, image, path, priceCents]);

  return null;
}
