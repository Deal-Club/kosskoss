"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import {
  normaliserParametres,
  numeroWhatsappValide,
  lienEvaluationValide,
  identifiantGa4Valide,
  identifiantPixelValide,
  type ParametresBoutique,
} from "@/lib/kk/parametres";

const inputCls =
  "w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary";
const labelCls = "block text-sm font-semibold text-foreground";
const aideCls = "mt-1 text-xs text-muted-foreground";
const erreurCls = "mt-1 text-xs text-destructive";

interface Champ {
  cle: keyof ParametresBoutique;
  label: string;
  aide: string;
  valide: (valeur: string) => boolean;
  format: string;
}

// Pour chaque champ : où trouver la valeur (l'aide affichée sous le champ) et
// le format attendu (repris dans le message d'erreur si la saisie, une fois
// normalisée, ne passe pas la validation).
const CHAMPS: Champ[] = [
  {
    cle: "whatsapp",
    label: "Numéro WhatsApp",
    aide: "En chiffres, indicatif compris : 237658013646",
    valide: numeroWhatsappValide,
    format: "6 à 20 chiffres, indicatif compris",
  },
  {
    cle: "formulaireEvaluation",
    label: "Lien du formulaire d'évaluation",
    aide: "Adresse https du Google Form envoyé au client après livraison",
    valide: lienEvaluationValide,
    format: "une adresse https",
  },
  {
    cle: "ga4",
    label: "Identifiant GA4",
    aide: "De la forme G-XXXXXXXXXX, dans Google Analytics › Administration › Flux de données",
    valide: identifiantGa4Valide,
    format: "G-XXXXXXXXXX",
  },
  {
    cle: "metaPixel",
    label: "Identifiant du Pixel Meta",
    aide: "Suite de chiffres, dans le Gestionnaire d'événements Meta",
    valide: identifiantPixelValide,
    format: "une suite de chiffres",
  },
];

export function ParametresAdmin({ initial }: { initial: ParametresBoutique }) {
  const router = useRouter();
  const [values, setValues] = useState<ParametresBoutique>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);

  // NORMALISER D'ABORD, VALIDER ENSUITE (règle du contrôleur sur la tâche 1) :
  // sans cette étape, un numéro écrit naturellement avec des espaces ou un
  // « + » — la façon dont un humain l'écrit — serait rejeté à tort par
  // `numeroWhatsappValide`, qui n'accepte que des chiffres.
  const normalized = useMemo(() => normaliserParametres(values), [values]);

  // Chaque champ est facultatif : les quatre validateurs rendent `true` sur
  // une chaîne vide, donc un formulaire entièrement vidé ne produit jamais
  // d'erreur ici.
  const erreurs = useMemo(() => {
    const map: Partial<Record<keyof ParametresBoutique, string>> = {};
    for (const { cle, valide, format } of CHAMPS) {
      if (!valide(normalized[cle])) map[cle] = `Format attendu : ${format}`;
    }
    return map;
  }, [normalized]);

  const peutEnregistrer = Object.keys(erreurs).length === 0;

  function patch(cle: keyof ParametresBoutique, value: string) {
    setValues((v) => ({ ...v, [cle]: value }));
  }

  async function save() {
    if (!peutEnregistrer) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/parametres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        setStatus("error");
      } else {
        // La réponse renvoie l'état normalisé réellement enregistré (par
        // exemple le numéro réduit à ses chiffres) : on le reprend tel quel
        // pour que le champ affiche ce qui est en base, sans attendre un
        // rechargement complet de la page.
        const data = (await res.json()) as { parametres?: ParametresBoutique };
        if (data.parametres) setValues(data.parametres);
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
          <h1 className="text-2xl font-black text-foreground">Paramètres de la boutique</h1>
          <p className="text-sm text-muted-foreground">
            Numéro WhatsApp, lien du formulaire d&rsquo;évaluation et identifiants de mesure —
            modifiables sans redéploiement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status === "saved" && <span className="text-sm text-primary">Enregistré ✓</span>}
          {status === "error" && <span className="text-sm text-destructive">Erreur d&rsquo;enregistrement</span>}
          <button
            type="button"
            onClick={save}
            disabled={saving || !peutEnregistrer}
            className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </div>

      <div className="max-w-xl space-y-5 rounded-lg border border-border bg-card p-5">
        {CHAMPS.map(({ cle, label, aide }) => (
          <label key={cle} className="block">
            <span className={labelCls}>{label}</span>
            <input value={values[cle]} onChange={(e) => patch(cle, e.target.value)} className={inputCls} />
            {erreurs[cle] ? <p className={erreurCls}>{erreurs[cle]}</p> : <p className={aideCls}>{aide}</p>}
          </label>
        ))}
      </div>

      {/* Honnêteté requise par la tâche : ces deux identifiants sont enregistrés
          dès aujourd'hui, mais aucune balise ne les lit encore sur le site — la
          pose des balises appartient au lot de mesure d'audience. Sans cette
          phrase, le client croirait la mesure déjà active et découvrirait des
          mois plus tard que rien n'a jamais été collecté. */}
      <p className="max-w-xl text-sm text-muted-foreground">
        Les identifiants GA4 et Pixel Meta sont{" "}
        <strong className="font-bold text-foreground">enregistrés mais pas encore posés</strong> sur le
        site : les balises de mesure correspondantes appartiennent à un lot ultérieur.
      </p>
    </div>
  );
}
