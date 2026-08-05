"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { GatewayAdminState } from "@/server/gateways/admin";
import type { GatewayConnectionCheck } from "@/server/gateways";
import type { PaymentMethodRecord } from "@/server/types";

interface GatewaySettingsFormProps {
  state: GatewayAdminState;
  /** Moyens de paiement de la boutique, pour rattacher ceux encaissés en ligne. */
  methods: PaymentMethodRecord[];
}

const NONE = "none";

export function GatewaySettingsForm({ state, methods }: GatewaySettingsFormProps) {
  const router = useRouter();
  const [provider, setProvider] = useState<string>(state.provider ?? NONE);
  const [methodKeys, setMethodKeys] = useState<string[]>(state.methodKeys);
  // Une entrée par clé d'intégration, saisie à la volée. Vide = on ne touche pas
  // à la clé déjà enregistrée.
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [check, setCheck] = useState<GatewayConnectionCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(
    () => state.gateways.find((gateway) => gateway.id === provider),
    [state.gateways, provider],
  );

  function toggleMethod(key: string, on: boolean) {
    setMethodKeys((current) =>
      on ? [...new Set([...current, key])] : current.filter((entry) => entry !== key),
    );
  }

  /**
   * Enregistre les clés saisies puis interroge le prestataire en lecture seule.
   * Le double effet est assumé — et annoncé par le libellé du bouton : tester
   * une clé qu'on vient de taper suppose de l'avoir enregistrée.
   */
  async function handleTest() {
    if (!selected) return;
    setError(null);
    setNotice(null);
    setCheck(null);
    setTesting(true);

    const response = await fetch("/api/admin/payment-gateway/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: selected.id, secrets }),
    });
    setTesting(false);

    const data = (await response.json().catch(() => null)) as
      | (GatewayConnectionCheck & { error?: string })
      | null;

    if (!response.ok || !data) {
      setError(data?.error ?? "Le test de connexion a échoué.");
      return;
    }

    setSecrets({});
    setCheck(data);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const response = await fetch("/api/admin/payment-gateway", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: provider === NONE ? null : provider,
        methodKeys: provider === NONE ? [] : methodKeys,
        secrets,
      }),
    });
    setPending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Échec de l'enregistrement.");
      return;
    }

    setSecrets({});
    setNotice("Configuration du paiement en ligne enregistrée.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-sm border border-border bg-white p-4 md:p-6">
      {/* Choix du prestataire actif */}
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm font-black text-foreground">Prestataire actif</legend>
        <p className="mb-3 text-xs text-muted-foreground">
          Un seul prestataire encaisse à la fois. « Aucun » désactive le paiement en ligne : les
          commandes restent réglées hors ligne (virement, etc.).
        </p>

        <div className="space-y-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3 ${
              provider === NONE ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <input
              type="radio"
              name="provider"
              value={NONE}
              checked={provider === NONE}
              onChange={() => setProvider(NONE)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="text-sm font-bold text-foreground">Aucun (paiement hors ligne)</span>
          </label>

          {state.gateways.map((gateway) => {
            const active = provider === gateway.id;
            const ready = gateway.keys.every((key) => key.configured);
            return (
              <label
                key={gateway.id}
                className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3 ${
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value={gateway.id}
                  checked={active}
                  onChange={() => setProvider(gateway.id)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{gateway.label}</span>
                    {gateway.implemented ? (
                      <span className="rounded-sm bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                        Prêt
                      </span>
                    ) : (
                      <span className="rounded-sm bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                        Pré-câblé
                      </span>
                    )}
                    {ready && (
                      <span className="rounded-sm bg-[#16a34a] px-2 py-0.5 text-[11px] font-bold text-white">
                        Clés OK
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {gateway.availability}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Clés secrètes du prestataire choisi */}
      {selected && (
        <fieldset className="mb-5 border-t border-border pt-5">
          <legend className="sr-only">Clés de {selected.label}</legend>
          <h4 className="mb-1 text-sm font-black text-foreground">Clés secrètes — {selected.label}</h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Stockées chiffrées, jamais réaffichées. Laissez un champ vide pour conserver la clé déjà
            enregistrée.
          </p>
          {!selected.implemented && (
            <p className="mb-3 rounded-sm bg-muted px-3 py-2 text-xs text-muted-foreground">
              Ce prestataire est pré-câblé : vous pouvez déjà enregistrer ses clés, mais
              l&apos;encaissement sera à finaliser avant de l&apos;activer. Utilisez Stripe pour un
              paiement en ligne opérationnel.
            </p>
          )}
          {selected.caution && (
            <p className="mb-3 rounded-sm border border-destructive bg-destructive/5 px-3 py-2 text-xs text-foreground">
              <span className="font-bold text-destructive">À valider avant production — </span>
              {selected.caution}
            </p>
          )}
          <div className="space-y-3">
            {selected.keys.map((key) => (
              <label key={key.integrationKey} className="block text-sm">
                <span className="mb-1 flex flex-wrap items-center gap-2 font-semibold text-foreground">
                  {key.label}
                  {key.configured ? (
                    <span className="text-[11px] font-bold text-[#16a34a]">✓ enregistrée</span>
                  ) : key.optional ? (
                    <span className="text-[11px] font-bold text-muted-foreground">facultative</span>
                  ) : (
                    <span className="text-[11px] font-bold text-muted-foreground">non renseignée</span>
                  )}
                </span>
                <input
                  type="password"
                  autoComplete="off"
                  value={secrets[key.integrationKey] ?? ""}
                  onChange={(event) =>
                    setSecrets((current) => ({ ...current, [key.integrationKey]: event.target.value }))
                  }
                  placeholder={key.configured ? "•••••••• (inchangée)" : "Saisir la clé"}
                  className="w-full rounded-sm border border-border px-3 py-2 font-mono outline-none focus:border-primary"
                />
                <span className="mt-1 block text-xs text-muted-foreground">{key.hint}</span>
              </label>
            ))}
          </div>

          {/* Vérification des clés auprès du prestataire, sans rien encaisser. */}
          {selected.testable && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="rounded-sm border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-60"
              >
                {testing ? "Test en cours…" : "Enregistrer les clés et tester la connexion"}
              </button>

              {check && (
                <div
                  className={`mt-3 rounded-sm border p-3 text-xs ${
                    check.ok ? "border-[#16a34a] bg-[#16a34a]/5" : "border-destructive bg-destructive/5"
                  }`}
                >
                  <p
                    className={`text-sm font-bold ${
                      check.ok ? "text-[#16a34a]" : "text-destructive"
                    }`}
                  >
                    {check.ok ? "✓ " : "⚠ "}
                    {check.summary}
                  </p>

                  {check.issues.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-foreground">
                      {check.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  )}

                  {check.details.length > 0 && (
                    <dl className="mt-3 space-y-1 border-t border-border pt-2">
                      {check.details.map((detail) => (
                        <div key={`${detail.label}-${detail.value}`} className="flex flex-wrap gap-2">
                          <dt className="font-semibold text-foreground">{detail.label} :</dt>
                          <dd className="font-mono break-all text-muted-foreground">{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )}
            </div>
          )}
        </fieldset>
      )}

      {/* Moyens de paiement encaissés en ligne */}
      {selected && (
        <fieldset className="mb-5 border-t border-border pt-5">
          <legend className="sr-only">Moyens de paiement en ligne</legend>
          <h4 className="mb-1 text-sm font-black text-foreground">
            Moyens de paiement encaissés par {selected.label}
          </h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Cochez les moyens de paiement de la boutique qui déclenchent une redirection vers{" "}
            {selected.label}. Les autres (virement…) restent réglés hors ligne.
          </p>
          {methods.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucun moyen de paiement dans la boutique pour l&apos;instant.
            </p>
          ) : (
            <div className="space-y-2">
              {methods.map((method) => (
                <label
                  key={method.key}
                  className="flex cursor-pointer items-center gap-3 rounded-sm border border-border p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={methodKeys.includes(method.key)}
                    onChange={(event) => toggleMethod(method.key, event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="font-semibold text-foreground">{method.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{method.key}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}

      {error && <p className="mb-3 text-sm font-semibold text-destructive">{error}</p>}
      {notice && <p className="mb-3 text-sm font-semibold text-[#16a34a]">{notice}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer le paiement en ligne"}
      </button>
    </form>
  );
}
