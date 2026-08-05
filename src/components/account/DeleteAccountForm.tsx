"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { sendAccountRequest } from "@/components/account/request";
import {
  ALERT_ERROR,
  DANGER_BUTTON,
  INPUT,
  LABEL,
  PRIMARY_BUTTON,
} from "@/components/account/formStyles";

/** Mot à recopier, identique à celui attendu par la route. */
const CONFIRMATION_WORD = "SUPPRIMER";

/**
 * Suppression du compte (art. 17 RGPD).
 *
 * Deux confirmations avant d'agir : le mot de passe et le mot « SUPPRIMER »
 * recopié à la main. Le texte affiché juste au-dessus explique ce qui subsiste
 * malgré la suppression — les commandes, pour les délais de conservation
 * comptables. Informer avant la confirmation évite le reproche d'un art. 17
 * mal exécuté.
 */
export function DeleteAccountForm() {
  const t = useTranslations("account");
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const ready = confirm.trim().toUpperCase() === CONFIRMATION_WORD && password.length > 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorCode(null);

    const result = await sendAccountRequest("/api/account/delete", "POST", { password, confirm });

    if (!result.ok) {
      setPending(false);
      setErrorCode(result.code ?? "server_error");
      return;
    }

    setDone(true);
    setPassword("");
    setConfirm("");
    // La session est déjà fermée côté serveur ; on recharge pour que l'en-tête
    // repasse en mode visiteur.
    router.refresh();
  }

  if (done) {
    return (
      <div role="status" className="text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[#16a34a]" aria-hidden />
        <h3 className="text-lg font-black text-foreground">{t("data.deleteDoneTitle")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("data.deleteDoneText")}</p>
        <Link href="/" className={`${PRIMARY_BUTTON} mt-5`}>
          {t("data.deleteDoneCta")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="flex items-start gap-2 rounded-sm border border-primary bg-primary/10 px-4 py-3 text-sm text-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{t("data.deleteRetention")}</span>
      </p>

      {errorCode && (
        <p role="alert" className={ALERT_ERROR}>
          {t(`errors.${errorCode}` as "errors.server_error")}
        </p>
      )}

      <div>
        <label className={LABEL} htmlFor="delete-password">
          {t("data.deletePasswordLabel")}
        </label>
        <input
          id="delete-password"
          type="password"
          required
          autoComplete="current-password"
          maxLength={200}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="delete-confirm">
          {t("data.deleteConfirmLabel", { word: CONFIRMATION_WORD })}
        </label>
        <input
          id="delete-confirm"
          required
          autoComplete="off"
          maxLength={20}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={`${INPUT} sm:w-56`}
        />
      </div>

      <button
        type="submit"
        disabled={pending || !ready}
        aria-busy={pending}
        className={DANGER_BUTTON}
      >
        {pending ? t("data.deleteSubmitting") : t("data.deleteButton")}
      </button>
    </form>
  );
}
