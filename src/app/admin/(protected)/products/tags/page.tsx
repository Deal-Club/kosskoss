import type { Metadata } from "next";
import { lireVocabulaireAdmin } from "@/server/kk/vocabulaire-tags";
import { TagVocabularyAdmin } from "@/components/admin/TagVocabularyAdmin";

export const metadata: Metadata = { title: "Vocabulaire des tags — Administration" };

export default async function AdminTagVocabularyPage() {
  const rows = await lireVocabulaireAdmin();
  return <TagVocabularyAdmin initial={rows} />;
}
