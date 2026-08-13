"use client";

import { useEffect } from "react";

/**
 * Verrou de défilement pour les panneaux modaux (tiroir du panier, menu
 * mobile, recherche).
 *
 * `document.body.style.overflow = "hidden"` — ce que faisaient jusqu'ici le
 * tiroir et le menu — ne tient pas sur mobile : Safari iOS et les Chrome
 * Android récents continuent de faire glisser la page SOUS le panneau ouvert.
 * Le visiteur croit faire défiler son panier, c'est l'accueil qui bouge
 * derrière, et il retrouve à la fermeture une page qui n'est plus là où il
 * l'avait laissée. C'est le symptôme le plus visible du « ça casse le site ».
 *
 * La seule méthode fiable sur tous les navigateurs consiste à FIGER la page à
 * sa position : `position: fixed` sur `<body>` avec un décalage négatif égal
 * au défilement en cours, puis restitution exacte à la fermeture.
 *
 * Deux compensations vont avec :
 *   — la largeur de la barre de défilement sur ordinateur, qui disparaît avec
 *     le passage en `fixed` et décalerait toute la page de ~15 px ;
 *   — la position de défilement, restaurée sans animation (`scroll-behavior`
 *     est en `smooth` sur `<html>`, ce qui ferait remonter la page en douceur
 *     sous les yeux du visiteur au lieu de la remettre en place).
 */
export function useScrollLock(actif: boolean) {
  useEffect(() => {
    if (!actif) return;

    const { body, documentElement: html } = document;
    const y = window.scrollY;
    const barre = window.innerWidth - html.clientWidth;

    const avant = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      comportement: html.style.scrollBehavior,
    };

    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    if (barre > 0) body.style.paddingRight = `${barre}px`;

    return () => {
      body.style.position = avant.position;
      body.style.top = avant.top;
      body.style.left = avant.left;
      body.style.right = avant.right;
      body.style.width = avant.width;
      body.style.overflow = avant.overflow;
      body.style.paddingRight = avant.paddingRight;

      html.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      html.style.scrollBehavior = avant.comportement;
    };
  }, [actif]);
}
