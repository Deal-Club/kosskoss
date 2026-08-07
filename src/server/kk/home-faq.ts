import { findLegalPage } from "@/server/legalPages";

/**
 * Questions fréquentes affichées sur l'accueil.
 *
 * Elles ne sont pas recopiées ici : elles sont lues dans la page /faq, qui est
 * la source unique et reste modifiable depuis le back-office. Une réponse
 * corrigée là-bas l'est aussi sur l'accueil, et les deux pages ne peuvent pas
 * se contredire — ce qui arriverait immanquablement avec deux textes parallèles.
 */

export interface HomeFaqEntry {
  question: string;
  /** Réponse ramenée à un seul paragraphe : l'accueil ne déroule pas le détail. */
  answer: string;
}

/**
 * `limit` vaut 8 par défaut, soit la grille 4 × 2 de l'accueil.
 * Renvoie une liste vide si la page FAQ est absente : la section se masque
 * alors d'elle-même plutôt que d'afficher un cadre vide.
 */
export async function getHomeFaq(locale: string, limit = 8): Promise<HomeFaqEntry[]> {
  const page = await findLegalPage("faq", locale);
  if (!page) return [];

  return page.sections
    .filter((section) => section.heading.trim().length > 0 && section.body.trim().length > 0)
    .slice(0, limit)
    .map((section) => ({
      question: section.heading.trim(),
      // Le corps peut contenir plusieurs paragraphes séparés par une ligne
      // vide ; sur une vignette d'accueil, le premier suffit.
      answer: section.body.split(/\n\s*\n/)[0].trim(),
    }));
}
