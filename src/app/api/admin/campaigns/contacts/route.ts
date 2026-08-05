import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { listContacts } from "@/server/contacts";

/**
 * Base de contacts de l'étape « destinataires ».
 *
 * Les désinscrits ne sont PAS filtrés ici : l'assistant doit pouvoir les
 * montrer, grisés, avec la mention de leur désinscription. Les masquer laisserait
 * croire que la boutique a perdu des adresses, alors qu'elle honore un refus.
 */
export async function GET() {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const contacts = await listContacts();
  return NextResponse.json(contacts);
}
