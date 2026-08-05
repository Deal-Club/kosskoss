import { NextResponse } from "next/server";
import { closeCustomerSession } from "@/server/customerSession";

/** Déconnexion : le cookie de session est supprimé, rien d'autre n'est touché. */
export async function POST() {
  await closeCustomerSession();
  return NextResponse.json({ ok: true });
}
