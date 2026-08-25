"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Trash2, Plus, Save, Loader2, Tags, Network } from "lucide-react";
import type { AdminQuestion, AdminAnswer } from "@/server/kk/diagnostic-admin";

const ICON_HINT = "droplet, wind, smile, contrast, sparkles, sun, clock, shield, wallet, gem, leaf, check";

const emptyAnswer = (): AdminAnswer => ({
  id: "", key: "", label: "", description: "", icon: "check", chip: "", tagsText: "", active: true,
});
const emptyQuestion = (): AdminQuestion => ({
  id: "", key: "", title: "", subtitle: "", active: true, answers: [emptyAnswer()],
});

const inputCls =
  "w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const labelCls = "block text-xs font-semibold text-muted-foreground";

export function DiagnosticAdmin({ initial }: { initial: AdminQuestion[] }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<AdminQuestion[]>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);

  function patchQuestion(qi: number, patch: Partial<AdminQuestion>) {
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  }
  function patchAnswer(qi: number, ai: number, patch: Partial<AdminAnswer>) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qi ? { ...q, answers: q.answers.map((a, j) => (j === ai ? { ...a, ...patch } : a)) } : q,
      ),
    );
  }
  function moveQuestion(qi: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const next = [...qs];
      const t = qi + dir;
      if (t < 0 || t >= next.length) return qs;
      [next[qi], next[t]] = [next[t], next[qi]];
      return next;
    });
  }
  function removeQuestion(qi: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== qi));
  }
  function addAnswer(qi: number) {
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, answers: [...q.answers, emptyAnswer()] } : q)));
  }
  function removeAnswer(qi: number, ai: number) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qi ? { ...q, answers: q.answers.filter((_, j) => j !== ai) } : q)),
    );
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      if (!res.ok) {
        setStatus("error");
      } else {
        setStatus("saved");
        router.refresh();
      }
    } catch {
      setStatus("error");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Diagnostic beauté</h1>
          <p className="text-sm text-muted-foreground">
            Questions, réponses et pondération des tags du questionnaire.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href="/admin/diagnostic"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Network className="h-4 w-4" /> Retour à l&apos;arbre du diagnostic
            </Link>
            <Link
              href="/admin/diagnostic/tags"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Tags className="h-4 w-4" /> Associer les produits aux tags
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === "saved" && <span className="text-sm text-primary">Enregistré ✓</span>}
          {status === "error" && <span className="text-sm text-destructive">Erreur d&rsquo;enregistrement</span>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </div>

      {questions.map((q, qi) => (
        <div key={q.id || `new-${qi}`} className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Question {qi + 1}
            </span>
            <div className="flex items-center gap-1">
              <label className="mr-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={q.active} onChange={(e) => patchQuestion(qi, { active: e.target.checked })} />
                Active
              </label>
              <button type="button" onClick={() => moveQuestion(qi, -1)} aria-label="Monter" className="rounded p-1.5 hover:bg-muted"><ChevronUp className="h-4 w-4" /></button>
              <button type="button" onClick={() => moveQuestion(qi, 1)} aria-label="Descendre" className="rounded p-1.5 hover:bg-muted"><ChevronDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => removeQuestion(qi)} aria-label="Supprimer la question" className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className={labelCls}>Intitulé</span>
              <input value={q.title} onChange={(e) => patchQuestion(qi, { title: e.target.value })} className={inputCls} />
            </label>
            <label className="sm:col-span-2">
              <span className={labelCls}>Sous-titre</span>
              <input value={q.subtitle} onChange={(e) => patchQuestion(qi, { subtitle: e.target.value })} className={inputCls} />
            </label>
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Réponses</p>
            {q.answers.map((a, ai) => (
              <div key={a.id || `newa-${ai}`} className="rounded border border-border/70 bg-background/50 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label>
                    <span className={labelCls}>Libellé</span>
                    <input value={a.label} onChange={(e) => patchAnswer(qi, ai, { label: e.target.value })} className={inputCls} />
                  </label>
                  <label>
                    <span className={labelCls}>Description</span>
                    <input value={a.description} onChange={(e) => patchAnswer(qi, ai, { description: e.target.value })} className={inputCls} />
                  </label>
                  <label>
                    <span className={labelCls}>Icône <span className="font-normal normal-case text-muted-foreground/70">({ICON_HINT})</span></span>
                    <input value={a.icon} onChange={(e) => patchAnswer(qi, ai, { icon: e.target.value })} className={inputCls} />
                  </label>
                  <label>
                    <span className={labelCls}>Étiquette profil (chip)</span>
                    <input value={a.chip} onChange={(e) => patchAnswer(qi, ai, { chip: e.target.value })} className={inputCls} />
                  </label>
                  <label className="sm:col-span-2">
                    <span className={labelCls}>Tags pondérés <span className="font-normal normal-case text-muted-foreground/70">(ex. peau_grasse:3, imperfections:1)</span></span>
                    <input value={a.tagsText} onChange={(e) => patchAnswer(qi, ai, { tagsText: e.target.value })} className={inputCls} placeholder="tag:poids, tag:poids" />
                  </label>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" checked={a.active} onChange={(e) => patchAnswer(qi, ai, { active: e.target.checked })} />
                    Active
                  </label>
                  <button type="button" onClick={() => removeAnswer(qi, ai)} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => addAnswer(qi)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <Plus className="h-4 w-4" /> Ajouter une réponse
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
        className="inline-flex items-center gap-2 rounded border border-dashed border-border px-4 py-3 text-sm font-medium text-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" /> Ajouter une question
      </button>
    </div>
  );
}
