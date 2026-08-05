import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { parseProductInput, toCreateInput } from "@/server/productInput";
import { createProduct, listProducts } from "@/server/store";

export async function GET(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const categoryId = url.searchParams.get("categoryId") ?? undefined;
  const products = await listProducts(categoryId ? { categoryId } : undefined);
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const { values, errors } = parseProductInput(body, "create");
  const input = errors.length === 0 ? toCreateInput(values) : undefined;

  if (!input) {
    return NextResponse.json(
      {
        error: errors[0] ?? "categoryId, brand, name et price sont obligatoires.",
        errors,
      },
      { status: 400 },
    );
  }

  try {
    const product = await createProduct(input);
    // Shop-Seiten neu aufbauen, damit das neue Produkt sofort sichtbar ist
    revalidatePath("/", "layout");
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la création.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
