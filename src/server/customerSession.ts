import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
  createCustomerSessionToken,
  verifyCustomerSessionToken,
  type CustomerSession,
} from "@/lib/customerAuth";
import { getActiveCustomer, type CustomerRecord } from "@/server/customers";

/**
 * Lecture et écriture de la session client.
 *
 * Le cookie porte un nom différent de celui du back-office et il est signé avec
 * un autre secret : une session client ne peut donc jamais être présentée à
 * `requireAdminSession()`, et le back-office reste inaccessible depuis la
 * boutique.
 */

/** Session brute, telle que signée. Ne touche pas la base. */
export const getCustomerSession = cache(async (): Promise<CustomerSession | null> => {
  const cookieStore = await cookies();
  return verifyCustomerSessionToken(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value);
});

/**
 * Compte correspondant à la session, relu en base.
 * Un compte supprimé ou désactivé entre-temps rend la session inopérante, même
 * si le cookie signé n'a pas encore expiré.
 */
export const getCurrentCustomer = cache(async (): Promise<CustomerRecord | null> => {
  const session = await getCustomerSession();
  if (!session) return null;
  return getActiveCustomer(session.customerId);
});

/**
 * Exige un client connecté, sinon renvoie vers la page de connexion.
 * `returnTo` est le chemin — sans préfixe de langue — vers lequel revenir après
 * la connexion, par exemple « /compte/commandes ».
 */
export async function requireCustomer(locale: string, returnTo?: string): Promise<CustomerRecord> {
  const customer = await getCurrentCustomer();
  if (customer) return customer;

  const target = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  // `getPathname` ajoute le préfixe de langue quand il en faut un (/en/...),
  // la redirection de Next fait le reste et interrompt le rendu.
  redirect(
    getPathname({
      href: returnTo
        ? { pathname: "/compte/connexion", query: { weiter: returnTo } }
        : "/compte/connexion",
      locale: target,
    }),
  );
}

/**
 * Ouvre la session. Un jeton neuf est émis à chaque connexion : l'identifiant
 * de session change après l'authentification, ce qui coupe court à la fixation
 * de session.
 *
 * `sameSite: "lax"` plutôt que `strict` : le client arrive régulièrement sur la
 * boutique depuis un lien d'e-mail (confirmation de commande, réinitialisation)
 * et se retrouverait déconnecté à la première page. Une requête POST venue d'un
 * autre site n'emporte pas non plus un cookie « lax » : la protection CSRF sur
 * les écritures est conservée.
 */
export async function openCustomerSession(customer: {
  id: string;
  email: string;
}): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, createCustomerSessionToken(customer.id, customer.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
  });
}

export async function closeCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}
