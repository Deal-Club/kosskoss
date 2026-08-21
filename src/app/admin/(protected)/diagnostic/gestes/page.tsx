import type { Metadata } from "next";
import { lireGestes } from "@/server/kk/gestes";
import { DiagStepsAdmin } from "@/components/admin/DiagStepsAdmin";

export const metadata: Metadata = { title: "Gestes du diagnostic — Administration" };

export default async function AdminDiagStepsPage() {
  const rows = await lireGestes();
  return <DiagStepsAdmin initial={rows} />;
}
