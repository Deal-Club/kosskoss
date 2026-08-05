/**
 * Lecture des événements PayPal — partie pure, sans appel réseau ni base.
 *
 * Isolée pour être testable : c'est ici que se joue le rattachement d'un
 * paiement à une commande de la boutique, et PayPal range le `custom_id` à des
 * endroits différents selon le type d'événement.
 */

/** Corps d'un webhook PayPal, réduit à ce qu'on en exploite. */
export interface PayPalWebhookEvent {
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    invoice_id?: string;
    purchase_units?: { custom_id?: string; invoice_id?: string }[];
    /**
     * Montant de la capture. PayPal l'exprime en unité principale sous forme de
     * chaîne décimale — « 214.50 » et non 21450 — contrairement à Stripe et
     * Square qui comptent en centimes.
     */
    amount?: { value?: string; currency_code?: string };
  };
}


/** Réponse de création de commande, réduite à ce qu'on en exploite. */
export interface PayPalOrderResponse {
  id?: string;
  links?: { rel?: string; href?: string }[];
}

/**
 * Lien vers lequel envoyer le client.
 *
 * `payer-action` est renvoyé quand la commande précise `payment_source.paypal`,
 * `approve` est la forme historique : on accepte les deux plutôt que de dépendre
 * d'un détail de la requête.
 */
export function paypalApprovalLink(order: PayPalOrderResponse): string | null {
  const links = order.links ?? [];
  const link =
    links.find((entry) => entry.rel === "payer-action") ??
    links.find((entry) => entry.rel === "approve");
  return link?.href ?? null;
}

/**
 * Numéro de commande, déposé en `custom_id` et en `invoice_id` à la création.
 *
 * Un événement de capture le porte à la racine de `resource`, un événement de
 * commande le porte dans `purchase_units` : on cherche aux deux endroits plutôt
 * que d'écrire un cas par type d'événement.
 */
export function paypalOrderNumber(event: PayPalWebhookEvent): string | null {
  const resource = event.resource;
  return (
    resource?.custom_id ??
    resource?.invoice_id ??
    resource?.purchase_units?.[0]?.custom_id ??
    resource?.purchase_units?.[0]?.invoice_id ??
    null
  );
}
