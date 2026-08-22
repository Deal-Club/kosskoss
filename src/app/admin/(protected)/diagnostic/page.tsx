import type { Metadata } from "next";
import { requireCapacitePage } from "@/lib/dal";
import { getAdminQuestionnaire } from "@/server/kk/diagnostic-admin";
import { DiagnosticAdmin } from "@/components/admin/DiagnosticAdmin";

export const metadata: Metadata = { title: "Diagnostic beauté — Administration" };

export default async function AdminDiagnosticPage() {
  await requireCapacitePage("reglages");
  const questions = await getAdminQuestionnaire();
  return <DiagnosticAdmin initial={questions} />;
}
