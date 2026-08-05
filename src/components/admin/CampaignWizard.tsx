"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { CampaignStepType } from "@/components/admin/CampaignStepType";
import { CampaignStepProducts } from "@/components/admin/CampaignStepProducts";
import { CampaignStepSettings } from "@/components/admin/CampaignStepSettings";
import { CampaignStepMessage } from "@/components/admin/CampaignStepMessage";
import { CampaignStepRecipients } from "@/components/admin/CampaignStepRecipients";
import {
  applyType,
  createDraft,
  draftToPayload,
  stepIssue,
  type CampaignDraft,
} from "@/components/admin/campaignDraft";
import type { CampaignProductOption } from "@/server/campaignAdmin";
import type { CategoryRecord } from "@/server/types";
import type { CampaignType } from "@/lib/campaigns";

const STEPS: readonly { number: number; title: string }[] = [
  { number: 1, title: "Type" },
  { number: 2, title: "Produits" },
  { number: 3, title: "Paramètres" },
  { number: 4, title: "Message" },
  { number: 5, title: "Destinataires" },
];

interface CampaignWizardProps {
  initialProducts: CampaignProductOption[];
  categories: CategoryRecord[];
  /** Adresse de l'administrateur connecté, proposée pour l'envoi de test. */
  adminEmail: string;
}

/**
 * Assistant de création d'une campagne, en cinq étapes.
 *
 * Le brouillon vit entièrement en mémoire jusqu'à la cinquième étape : rien
 * n'est écrit en base tant que l'administrateur n'a pas demandé un message de
 * test ou le lancement. Une campagne à moitié saisie n'a aucune raison
 * d'encombrer la liste.
 *
 * Le passage d'une étape à l'autre est gardé par `stepIssue()` : le bouton
 * « Suivant » reste désactivé et le motif est écrit à côté, plutôt que de
 * laisser l'administrateur chercher ce qui bloque.
 */
export function CampaignWizard({
  initialProducts,
  categories,
  adminEmail,
}: CampaignWizardProps) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<CampaignDraft>(createDraft);
  const [products, setProducts] = useState<CampaignProductOption[]>(initialProducts);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  // Identifiant obtenu au premier enregistrement : les appels suivants
  // modifient le brouillon au lieu d'en créer un second.
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const issue = stepIssue(step, draft, { products, recipientCount: selectedEmails.length });

  function patch(values: Partial<CampaignDraft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  function handleTypeChange(type: CampaignType) {
    // Ne rien réécrire quand le type ne change pas : un message déjà retouché
    // serait effacé par un simple retour en arrière.
    if (draft.type === type) return;
    setDraft((current) => applyType(current, type));
  }

  /** Recharge le catalogue après la création d'un produit dans le panneau. */
  const refreshProducts = useCallback(async (): Promise<void> => {
    const response = await fetch("/api/admin/campaigns/products");
    if (!response.ok) return;
    const fresh = (await response.json()) as CampaignProductOption[];
    setProducts(fresh);
  }, []);

  /**
   * Écrit le brouillon en base et rend son identifiant.
   *
   * Appelé par l'envoi de test comme par le lancement : dans les deux cas la
   * campagne doit exister, ne serait-ce que pour porter les jetons de suivi.
   */
  async function saveDraft(): Promise<string | null> {
    const url = campaignId ? `/api/admin/campaigns/${campaignId}` : "/api/admin/campaigns";
    const response = await fetch(url, {
      method: campaignId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftToPayload(draft)),
    });

    const data = (await response.json().catch(() => null)) as
      | { id?: string; error?: string }
      | null;

    if (!response.ok || !data?.id) {
      setError(data?.error ?? "Échec de l'enregistrement de la campagne.");
      return null;
    }

    setCampaignId(data.id);
    return data.id;
  }

  async function handleTest(email: string): Promise<string | null> {
    setError(null);
    setPending(true);
    try {
      const id = await saveDraft();
      if (!id) return null;

      const response = await fetch(`/api/admin/campaigns/${id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Échec de l'envoi du message de test.");
        return null;
      }
      return email;
    } finally {
      setPending(false);
    }
  }

  async function handleLaunch(): Promise<void> {
    setError(null);
    setPending(true);
    try {
      const id = await saveDraft();
      if (!id) return;

      const response = await fetch(`/api/admin/campaigns/${id}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: selectedEmails }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Échec du lancement de la campagne.");
        return;
      }

      router.push(`/admin/campaigns/${id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Fil des étapes : toujours visible, il situe l'avancement et rappelle
          ce qui reste à faire. Le numéro et le libellé portent l'information,
          la couleur ne fait que souligner. */}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 rounded-sm border border-border bg-white px-4 py-3">
        {STEPS.map((entry, index) => {
          const done = entry.number < step;
          const current = entry.number === step;
          const content = (
            <>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                  current
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-[#16a34a] text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3 w-3" aria-hidden /> : entry.number}
              </span>
              {entry.title}
            </>
          );

          const shared = `flex items-center gap-2 rounded-sm px-2 py-1 text-sm ${
            current
              ? "bg-primary/10 font-black text-primary"
              : done
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
          }`;

          return (
            <li key={entry.number} className="flex items-center gap-2">
              {/* Une étape franchie redevient accessible d'un clic : y revenir
                  par « Précédent » demanderait autant de clics que d'étapes. */}
              {done ? (
                <button
                  type="button"
                  onClick={() => setStep(entry.number)}
                  className={`${shared} hover:text-primary`}
                >
                  {content}
                </button>
              ) : (
                <span aria-current={current ? "step" : undefined} className={shared}>
                  {content}
                </span>
              )}
              {index < STEPS.length - 1 && (
                <span className="text-muted-foreground" aria-hidden>
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <CampaignStepType
          name={draft.name}
          type={draft.type}
          onNameChange={(name) => patch({ name })}
          onTypeChange={handleTypeChange}
        />
      )}

      {step === 2 && (
        <CampaignStepProducts
          products={products}
          categories={categories}
          selectedIds={draft.productIds}
          onSelectionChange={(productIds) => patch({ productIds })}
          onProductCreated={refreshProducts}
        />
      )}

      {step === 3 && draft.type && (
        <CampaignStepSettings draft={draft} products={products} onChange={patch} />
      )}

      {step === 4 && draft.type && (
        <CampaignStepMessage draft={draft} products={products} onChange={patch} />
      )}

      {step === 5 && (
        <CampaignStepRecipients
          draft={draft}
          adminEmail={adminEmail}
          selectedEmails={selectedEmails}
          onSelectionChange={setSelectedEmails}
          onChange={patch}
          onTest={handleTest}
          onLaunch={handleLaunch}
          blocked={issue}
          pending={pending}
        />
      )}

      {error && (
        <p
          role="alert"
          className="rounded-sm border border-destructive bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          disabled={step === 1 || pending}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Précédent
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {issue && <p className="text-sm text-muted-foreground">{issue}</p>}
          {step < STEPS.length && (
            <button
              type="button"
              onClick={() => setStep((current) => Math.min(STEPS.length, current + 1))}
              disabled={issue !== null || pending}
              className="flex items-center gap-1.5 rounded-sm bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40"
            >
              Suivant
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
