"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocalizedLink as Link, withLocale } from "./localized-link";
import { Loader2, LogOut } from "lucide-react";
import { resetFavoritesAfterLogout, syncFavoritesAfterLogin } from "@/lib/favorites";

const inputCls =
  "mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-deep";

export function AccountLogin({ returnTo }: { returnTo?: string }) {
  const t = useTranslations("account");
  const router = useRouter();
  const pathname = usePathname();
  const safeReturn =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/compte";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        // Un seul message quel que soit le motif : distinguer « adresse
        // inconnue » de « mot de passe faux » permettrait d'énumérer les comptes.
        setError(t("login.genericError"));
        setSubmitting(false);
        return;
      }
      // Les favoris mis de côté avant la connexion rejoignent le compte.
      // `router.refresh()` ne réinitialise pas le magasin : il faut le lui dire.
      syncFavoritesAfterLogin();
      // `safeReturn` (comme le paramètre `suite` qui l'alimente) est délibérément
      // sans préfixe de langue : c'est ici, au moment de revenir, qu'on applique
      // celui de la page de connexion couramment affichée.
      router.push(withLocale(pathname, safeReturn));
      router.refresh();
    } catch {
      setError(t("login.unexpectedError"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md">
      <label className="block text-sm">
        <span className="font-medium text-foreground">{t("login.emailFieldLabel")}</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="email" />
      </label>
      <label className="mt-4 block text-sm">
        <span className="font-medium text-foreground">{t("fields.password")}</span>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete="current-password" />
      </label>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="kk-fill mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-deep px-6 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("login.submit")}
      </button>

      {/* Les deux issues d'un client bloqué devant ce formulaire : il n'a pas
          encore de compte, ou il a oublié son mot de passe. */}
      <div className="mt-5 flex flex-col items-center gap-2 text-sm">
        <Link
          href="/compte/mot-de-passe-oublie"
          className="text-muted-foreground underline underline-offset-4 transition hover:text-deep"
        >
          {t("login.forgot")}
        </Link>
        <p className="text-muted-foreground">
          {t("login.noAccountShort")}{" "}
          <Link href="/compte/inscription" className="font-semibold text-deep underline underline-offset-4">
            {t("login.createOne")}
          </Link>
        </p>
      </div>
    </form>
  );
}

export function AccountLogout() {
  const t = useTranslations("account");
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/account/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    // Sur un poste partagé, la sélection du compte ne doit pas rester affichée
    // pour la personne suivante.
    resetFavoritesAfterLogout();
    router.push(withLocale(pathname, "/"));
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-deep"
    >
      <LogOut className="h-4 w-4" /> {t("nav.logout")}
    </button>
  );
}
