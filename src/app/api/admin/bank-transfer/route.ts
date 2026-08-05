import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import {
  getBankTransferSettings,
  saveBankTransferSettings,
  type BankTransferSettings,
} from "@/server/bankTransfer";

export async function GET() {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  return NextResponse.json(await getBankTransferSettings());
}

export async function PUT(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as Partial<BankTransferSettings> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const saved = await saveBankTransferSettings({
    holder: str(body.holder),
    iban: str(body.iban),
    bic: str(body.bic),
    transferType: str(body.transferType),
  });

  // La page de confirmation lit ces coordonnées ; on l'invalide pour que la
  // prochaine commande affiche la saisie à jour sans attendre l'expiration du
  // cache de rendu.
  revalidatePath("/", "layout");

  return NextResponse.json(saved);
}
