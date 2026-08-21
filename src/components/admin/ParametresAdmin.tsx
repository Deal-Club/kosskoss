"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import { normaliserParametres, CHAMPS_PARAMETRES, type ParametresBoutique } from "@/lib/kk/parametres";

const inputCls =
  "w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary";
const labelCls = "block text-sm font-semibold text-foreground";
const aideCls = "mt-1 text-xs text-muted-foreground";
const erreurCls = "mt-1 text-xs text-destructive";

// Label et aide sont propres à cet écran (où trouver la valeur) ; le
// validateur et le message de format viennent de CHAMPS_PARAMETRES, partagé
// avec la route d'enregistrement — une seule source pour ne plus jamais les
// laisser diverger.
const INFOS_AFFICHAGE: Record<keyof ParametresBoutique, { label: string; aide: string }> = {
  whatsapp: {
    label: "Numéro WhatsApp",
    aide: "En chiffres, indicatif compris : 237658013646",
  },
  formulaireEvaluation: {
    label: "Lien du formulaire d'évaluation",
    aide: "Adresse https du Google Form envoyé au client après livraison",
  },
  ga4: {
    label: "Identifiant GA4",
    aide: "De la forme G-XXXXXXXXXX, dans Google Analytics › Administration › Flux de données",
  },
  metaPixel: {
    label: "Identifiant du Pixel Meta",
    aide: "Suite de chiffres, dans le Gestionnaire d'événements Meta",
  },
};

export function ParametresAdmin({ initial }: { initial: ParametresBoutique }) {
  const router = useRouter();
  // `baseline` est ce qui est réellement en base ; `values` est la saisie en
  // cours. Les deux démarrent identiques et ne divergent qu'aux frappes de
  // l'administrateur. Après un enregistrement réussi, `baseline` est
  // remplacée par l'état renvoyé par le serveur : ce qui vient d'être
  // sauvegardé n'est plus « modifié ».
  const [baseline, setBaseline] = useState<ParametresBoutique>(initial);
  const [values, setValues] = useState<ParametresBoutique>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);

  // NORMALISER D'ABORD, VALIDER ENSUITE (règle du contrôleur sur la tâche 1) :
  // sans cette étape, un numéro écrit naturellement avec des espaces ou un
  // « + » — la façon dont un humain l'écrit — serait rejeté à tort par
  // `numeroWhatsappValide`, qui n'accepte que des chiffres.
  const normalized = useMemo(() => normaliserParametres(values), [values]);

  // Champs que l'administrateur a réellement touchés depuis le chargement de
  // l'écran (ou depuis le dernier enregistrement réussi).
  const dirty = useMemo(() => {
    const s = new Set<keyof ParametresBoutique>();
    for (const { cle } of CHAMPS_PARAMETRES) {
      if (values[cle] !== baseline[cle]) s.add(cle);
    }
    return s;
  }, [values, baseline]);

  // Chaque champ est facultatif : les validateurs rendent `true` sur une
  // chaîne vide. Un message reste affiché sous un champ non touché mais
  // invalide (valeur déjà en base avant que ce validateur existe, par
  // exemple) — l'administrateur doit pouvoir le voir — mais cette table
  // n'est PAS filtrée par `dirty` : c'est `peutEnregistrer`, plus bas, qui
  // fait ce tri pour décider si on bloque l'enregistrement.
  const erreurs = useMemo(() => {
    const map: Partial<Record<keyof ParametresBoutique, string>> = {};
    for (const { cle, valide, format } of CHAMPS_PARAMETRES) {
      if (!valide(normalized[cle])) map[cle] = `Format attendu : ${format}`;
    }
    return map;
  }, [normalized]);

  // Le bouton n'est bloqué que par les champs MODIFIÉS et invalides. Une
  // valeur déjà en base — écrite avant que ce validateur existe, ou par un
  // autre chemin que cet écran — que personne n'a touchée aujourd'hui ne doit
  // jamais empêcher d'enregistrer les trois autres champs, valides. Sans ce
  // tri, la seule issue pour l'administrateur serait un appel direct à
  // l'API, ce qui n'est pas l'utilisateur de cet écran.
  const peutEnregistrer = useMemo(() => {
    for (const cle of dirty) {
      if (erreurs[cle]) return false;
    }
    return true;
  }, [dirty, erreurs]);

  function patch(cle: keyof ParametresBoutique, value: string) {
    setValues((v) => ({ ...v, [cle]: value }));
  }

  async function save() {
    if (!peutEnregistrer || dirty.size === 0) return;
    setSaving(true);
    setStatus(null);
    try {
      // On n'envoie que les champs modifiés : la route ne valide que ce
      // qu'on lui soumet (les quatre clés sont facultatives), donc un champ
      // déjà en base et invalide, mais non touché, n'est jamais renvoyé et ne
      // peut jamais faire échouer la requête.
      const partiel: Partial<ParametresBoutique> = {};
      for (const cle of dirty) partiel[cle] = values[cle];

      const res = await fetch("/api/admin/parametres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partiel),
      });
      if (!res.ok) {
        setStatus("error");
      } else {
        // La réponse renvoie l'état normalisé réellement enregistré (par
        // exemple le numéro réduit à ses chiffres) : on en fait la nouvelle
        // référence, si bien que ce qui vient d'être sauvegardé n'est plus
        // « modifié » — sans attendre un rechargement complet de la page.
        const data = (await res.json()) as { parametres?: ParametresBoutique };
        if (data.parametres) {
          setBaseline(data.parametres);
          setValues(data.parametres);
        }
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
            disabled={saving || !peutEnregistrer || dirty.size === 0}
            className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </div>

      <div className="max-w-xl space-y-5 rounded-lg border border-border bg-card p-5">
        {CHAMPS_PARAMETRES.map(({ cle }) => {
          const { label, aide } = INFOS_AFFICHAGE[cle];
          return (
            <label key={cle} className="block">
              <span className={labelCls}>{label}</span>
              <input value={values[cle]} onChange={(e) => patch(cle, e.target.value)} className={inputCls} />
              {erreurs[cle] ? <p className={erreurCls}>{erreurs[cle]}</p> : <p className={aideCls}>{aide}</p>}
            </label>
          );
        })}
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
