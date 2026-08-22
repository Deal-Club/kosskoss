import { requireCapacitePage } from "@/lib/dal";
import { MODELES_TRADUISIBLES } from "@/lib/kk/traductions";
import { compterParModele, listerEnregistrements } from "@/server/kk/traductions";
import { TraductionsEditeur } from "@/components/admin/TraductionsEditeur";

const FILTRES = ["tout", "a-traduire", "traduit"] as const;
type Filtre = (typeof FILTRES)[number];

function estFiltre(valeur: string | undefined): valeur is Filtre {
  return valeur !== undefined && (FILTRES as readonly string[]).includes(valeur);
}

type Search = Promise<{ modele?: string; filtre?: string }>;

export default async function AdminTraductionsPage({ searchParams }: { searchParams: Search }) {
  await requireCapacitePage("contenu");

  const params = await searchParams;
  const apercu = await compterParModele();

  // Modèle et filtre par défaut à l'ouverture : le premier modèle du
  // registre, et « à traduire » — cet écran s'ouvre pour combler, pas pour
  // admirer un pourcentage. `?modele=&filtre=` permet de lier directement
  // vers une vue précise (utile en revue), sans changer ce défaut.
  const modeleInitial = MODELES_TRADUISIBLES.some((m) => m.cle === params.modele)
    ? (params.modele as string)
    : MODELES_TRADUISIBLES[0].cle;
  const filtreInitial: Filtre = estFiltre(params.filtre) ? params.filtre : "a-traduire";
  const lignesInitiales = await listerEnregistrements(modeleInitial, filtreInitial);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Traductions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ce que la boutique anglaise affiche encore en français, par manque de contrepartie
          anglaise. Un champ français vide n&apos;attend aucune traduction ; une traduction
          identique au français compte comme traduite.
        </p>
      </div>

      <TraductionsEditeur
        modeles={MODELES_TRADUISIBLES}
        apercu={apercu}
        modeleInitial={modeleInitial}
        filtreInitial={filtreInitial}
        lignesInitiales={lignesInitiales}
      />
    </div>
  );
}
