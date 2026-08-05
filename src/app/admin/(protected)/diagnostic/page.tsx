import type { Metadata } from "next";
import { getAdminQuestionnaire } from "@/server/kk/diagnostic-admin";
import { DiagnosticAdmin } from "@/components/admin/DiagnosticAdmin";

export const metadata: Metadata = { title: "Diagnostic beauté — Administration" };

export default async function AdminDiagnosticPage() {
  const questions = await getAdminQuestionnaire();
  return <DiagnosticAdmin initial={questions} />;
}
