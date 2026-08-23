"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import {
  normaliserParametres,
  saisieEffacee,
  CHAMPS_PARAMETRES,
  jetonCapiValide,
  type ParametresBoutique,
} from "@/lib/kk/parametres";

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
  metaCapiDatasetId: {
    label: "Identifiant du jeu de données Meta (CAPI)",
    aide:
      "Suite de chiffres, dans Gestionnaire d'événements Meta › Paramètres. Souvent identique au Pixel.",
  },
};

interface ParametresAdminProps {
  initial: ParametresBoutique;
  /** Le jeton CAPI est-il déjà enregistré ? La valeur, elle, ne quitte jamais le serveur. */
  capiConfigured: boolean;
}

export function ParametresAdmin({ initial, capiConfigured: capiConfiguredInitial }: ParametresAdminProps) {
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

  // Le jeton CAPI ne revient jamais du serveur : ce champ reste vide au
  // chargement, comme celui des clés de passerelle de paiement. `capiConfigured`
  // est mis à jour depuis la réponse de l'enregistrement, pas depuis une
  // lecture directe — la valeur en clair, elle, ne quitte jamais le serveur.
  const [capiToken, setCapiToken] = useState("");
  const [capiConfigured, setCapiConfigured] = useState(capiConfiguredInitial);
  const capiTokenSaisi = capiToken.trim();
  const capiTokenErreur =
    capiTokenSaisi && !jetonCapiValide(capiTokenSaisi)
      ? "Format attendu : jeton d'accès Meta (20 à 512 caractères, sans espace)"
      : null;

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
      // Même règle qu'à la route : une saisie non vide que la normalisation
      // réduit à rien satisferait le validateur — le vide est une valeur
      // légitime — et l'écran afficherait « Enregistré ✓ » sur un réglage
      // qu'il vient d'effacer. Voir `saisieEffacee`.
      if (saisieEffacee(values[cle], normalized[cle]) || !valide(normalized[cle])) {
        map[cle] = `Format attendu : ${format}`;
      }
    }
    return map;
  }, [values, normalized]);

  // Le bouton n'est bloqué que par les champs MODIFIÉS et invalides. Une
  // valeur déjà en base — écrite avant que ce validateur existe, ou par un
  // autre chemin que cet écran — que personne n'a touchée aujourd'hui ne doit
  // jamais empêcher d'enregistrer les trois autres champs, valides. Sans ce
  // tri, la seule issue pour l'administrateur serait un appel direct à
  // l'API, ce qui n'est pas l'utilisateur de cet écran.
  const peutEnregistrer = useMemo(() => {
    if (capiTokenErreur) return false;
    for (const cle of dirty) {
      if (erreurs[cle]) return false;
    }
    return true;
  }, [dirty, erreurs, capiTokenErreur]);

  // Rien à enregistrer : ni champ modifié, ni jeton saisi.
  const rienAEnregistrer = dirty.size === 0 && !capiTokenSaisi;

  function patch(cle: keyof ParametresBoutique, value: string) {
    setValues((v) => ({ ...v, [cle]: value }));
  }

  async function save() {
    if (!peutEnregistrer || rienAEnregistrer) return;
    setSaving(true);
    setStatus(null);
    try {
      // On n'envoie que les champs modifiés : la route ne valide que ce
      // qu'on lui soumet (les cinq clés sont facultatives), donc un champ
      // déjà en base et invalide, mais non touché, n'est jamais renvoyé et ne
      // peut jamais faire échouer la requête.
      const partiel: Partial<ParametresBoutique> & { capiToken?: string } = {};
      for (const cle of dirty) partiel[cle] = values[cle];
      // Le jeton n'est envoyé que s'il a été saisi : un champ vide laisse le
      // jeton déjà enregistré inchangé, la route ne le touche alors pas.
      if (capiTokenSaisi) partiel.capiToken = capiTokenSaisi;

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
        const data = (await res.json()) as {
          parametres?: ParametresBoutique;
          capiConfigured?: boolean;
        };
        if (data.parametres) {
          setBaseline(data.parametres);
          setValues(data.parametres);
        }
        if (typeof data.capiConfigured === "boolean") setCapiConfigured(data.capiConfigured);
        setCapiToken("");
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
            disabled={saving || !peutEnregistrer || rienAEnregistrer}
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

      {/* Le jeton CAPI suit le patron des clés de passerelle de paiement
          (GatewaySettingsForm) : stocké chiffré, jamais réaffiché — seulement
          « configuré » ou « non configuré ». Un champ vide au moment d'enregistrer
          laisse le jeton déjà enregistré inchangé. */}
      <div className="max-w-xl space-y-3 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-black text-foreground">
            Jeton de l&rsquo;API de conversions Meta (CAPI)
          </h2>
          {capiConfigured ? (
            <span className="rounded-sm bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
              Configuré
            </span>
          ) : (
            <span className="rounded-sm bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              Non configuré
            </span>
          )}
        </div>
        <label className="block">
          <span className={labelCls}>{capiConfigured ? "Saisir un nouveau jeton" : "Saisir le jeton"}</span>
          <input
            type="password"
            autoComplete="off"
            value={capiToken}
            onChange={(e) => setCapiToken(e.target.value)}
            placeholder={capiConfigured ? "•••••••••••••••• (inchangé)" : "Jeton d'accès système Meta"}
            className={`${inputCls} font-mono`}
          />
          {capiTokenErreur ? (
            <p className={erreurCls}>{capiTokenErreur}</p>
          ) : (
            <p className={aideCls}>
              Jeton système du Gestionnaire d&rsquo;événements Meta. Laissez vide pour conserver le
              jeton déjà enregistré : il n&rsquo;est jamais réaffiché ici.
            </p>
          )}
        </label>
      </div>

      {/* Honnêteté requise par la tâche : cette phrase disait « enregistrés mais
          pas encore posés », vrai après la tâche 2 — mais les tâches 3 et 4 ont
          depuis branché les balises GA4/Pixel et la CAPI dessus. La laisser
          telle quelle inverserait son sens : un exploitant qui la croit encore
          rassurerait un jeton MIS EN PRODUCTION en pensant qu'il ne partira
          nulle part, et ne se poserait alors ni la question du bandeau de
          consentement ni celle de la mention légale — les deux conditions qui
          rendent cette collecte licite. */}
      <p className="max-w-xl text-sm text-muted-foreground">
        Dès leur enregistrement, ces identifiants{" "}
        <strong className="font-bold text-foreground">activent réellement</strong> la mesure : GA4 et le
        Pixel se chargent dans le navigateur, et l&rsquo;API de conversions Meta envoie les achats
        confirmés côté serveur — dans les deux cas uniquement pour un visiteur ayant donné son
        consentement (catégories « mesure » et « marketing » du bandeau). Assurez-vous que le bandeau
        de consentement et la mention légale correspondante sont à jour avant d&rsquo;enregistrer un
        identifiant ici.
      </p>
    </div>
  );
}
