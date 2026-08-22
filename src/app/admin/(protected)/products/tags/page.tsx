import type { Metadata } from "next";
import { requireCapacitePage } from "@/lib/dal";
import { lireVocabulaireAdmin } from "@/server/kk/vocabulaire-tags";
import { TagVocabularyAdmin } from "@/components/admin/TagVocabularyAdmin";

export const metadata: Metadata = { title: "Vocabulaire des tags — Administration" };

export default async function AdminTagVocabularyPage() {
  await requireCapacitePage("catalogue");
  const rows = await lireVocabulaireAdmin();
  return <TagVocabularyAdmin initial={rows} />;
}
