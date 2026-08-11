"use client";

import { useState } from "react";
import { Star, Check, Loader2 } from "lucide-react";

/**
 * Dépôt d'un avis client.
 *
 * ── Ce que le formulaire promet ───────────────────────────────────────────
 * Rien n'est publié directement : l'API enregistre en `pending` et un
 * modérateur relit. Le formulaire le DIT avant l'envoi, pas seulement après —
 * quelqu'un qui écrit trois paragraphes et ne les voit jamais apparaître
 * conclut que le site avale les avis négatifs.
 *
 * ── Ce qui est demandé, et ce qui ne l'est pas ────────────────────────────
 * Un prénom, une note, un texte. La ville et l'e-mail restent facultatifs :
 * l'e-mail ne sert qu'à recontacter en cas de litige et n'est jamais publié
 * (voir server/kk/product-reviews.ts, qui ne le lit même pas). Chaque champ
 * réclamé en plus fait tomber le taux de dépôt, et un avis non déposé ne sert
 * personne.
 *
 * ── Validation ────────────────────────────────────────────────────────────
 * Les bornes sont celles de l'API (`/api/reviews`) : 2 à 80 caractères pour le
 * nom, 10 à 2000 pour le texte, note entière de 1 à 5. Elles sont répétées ici
 * pour éviter un aller-retour réseau qui ne dirait rien de plus, mais c'est
 * bien le serveur qui tranche — un formulaire ne valide jamais rien pour de
 * bon.
 */

const NOM_MIN = 2;
const NOM_MAX = 80;
const TEXTE_MIN = 10;
const TEXTE_MAX = 2000;

export function ReviewForm({ productId }: { productId: string }) {
  const [note, setNote] = useState(0);
  const [survol, setSurvol] = useState(0);
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [email, setEmail] = useState("");
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoye, setEnvoye] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");

    if (note < 1) return setErreur("Merci de choisir une note de 1 à 5 étoiles.");
    if (nom.trim().length < NOM_MIN) return setErreur("Merci d’indiquer votre prénom.");
    if (texte.trim().length < TEXTE_MIN)
      return setErreur(`Votre avis doit faire au moins ${TEXTE_MIN} caractères.`);

    setEnvoi(true);
    try {
      const reponse = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          authorName: nom.trim(),
          city: ville.trim(),
          authorEmail: email.trim(),
          rating: note,
          title: titre.trim(),
          body: texte.trim(),
        }),
      });

      const donnees = (await reponse.json().catch(() => null)) as { error?: string } | null;
      if (!reponse.ok) {
        setErreur(donnees?.error ?? "L’envoi a échoué. Merci de réessayer.");
        return;
      }
      setEnvoye(true);
    } catch {
      // Coupure réseau : le message ne doit pas laisser croire que l'avis est
      // parti, sans quoi la personne ne le redéposera jamais.
      setErreur("Connexion interrompue : votre avis n’a pas été envoyé.");
    } finally {
      setEnvoi(false);
    }
  }

  if (envoye) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-6">
        <p className="flex items-center gap-2 font-semibold text-deep">
          <Check className="h-5 w-5 text-gold-ink" />
          Merci, votre avis a bien été reçu.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Il sera publié sur cette page après vérification par notre équipe.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border/70 bg-card p-6">
      <h3 className="text-deep">Donnez votre avis</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Votre avis est relu par notre équipe avant publication. Votre adresse e-mail, si vous
        l’indiquez, ne sera jamais affichée.
      </p>

      {/* Note. Des boutons et non des étoiles décoratives : la note se choisit
          au clavier comme à la souris, et chacune porte son intitulé. */}
      <fieldset className="mt-5">
        <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Votre note
        </legend>
        <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setSurvol(0)}>
          {[1, 2, 3, 4, 5].map((valeur) => {
            const pleine = valeur <= (survol || note);
            return (
              <button
                key={valeur}
                type="button"
                onClick={() => setNote(valeur)}
                onMouseEnter={() => setSurvol(valeur)}
                aria-label={`${valeur} étoile${valeur > 1 ? "s" : ""} sur 5`}
                aria-pressed={valeur === note}
                className="rounded-full p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep"
              >
                <Star
                  className={`h-7 w-7 transition ${pleine ? "fill-gold text-gold" : "text-border"}`}
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Prénom
          </span>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={NOM_MAX}
            required
            className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Ville <span className="normal-case tracking-normal">(facultatif)</span>
          </span>
          <input
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            maxLength={80}
            className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          E-mail <span className="normal-case tracking-normal">(facultatif, jamais publié)</span>
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Titre <span className="normal-case tracking-normal">(facultatif)</span>
        </span>
        <input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          maxLength={120}
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Votre avis
        </span>
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={5}
          maxLength={TEXTE_MAX}
          required
          placeholder="Texture, tenue sur la journée, résultat après quelques semaines…"
          className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep"
        />
        <span className="figure mt-1 block text-right text-xs text-muted-foreground">
          {texte.length} / {TEXTE_MAX}
        </span>
      </label>

      {erreur && (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
          {erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={envoi}
        className="kk-fill group mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
      >
        {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
        {envoi ? "Envoi…" : "Publier mon avis"}
      </button>
    </form>
  );
}
