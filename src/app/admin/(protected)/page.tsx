import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Euro,
  Package,
  PackageX,
  Plus,
  Star,
  Tags,
  TrendingDown,
  ImageOff,
  FolderOpen,
} from "lucide-react";
import { requireAdminSession } from "@/lib/dal";
import { prisma } from "@/server/prisma";
import { formatPrice } from "@/server/store";
import {
  PriceDistributionChart,
  StockStatusChart,
  StockValueChart,
  type CategoryValue,
  type PriceBucket,
} from "@/components/admin/DashboardCharts";

interface TaskItem {
  key: string;
  href: string;
  title: string;
  note: string;
}

interface TaskBlock {
  id: string;
  title: string;
  icon: typeof AlertTriangle;
  tone: "critical" | "warning";
  items: TaskItem[];
}

/** Trois lignes par bloc : le tableau de bord signale, la page dédiée détaille. */
const MAX_TASK_ITEMS = 3;

function formatDate(value: Date): string {
  return value.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function AdminDashboardPage() {
  await requireAdminSession();

  const [categories, products, pendingReviews] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ group: { position: "asc" } }, { position: "asc" }],
      include: { group: true, _count: { select: { products: true } } },
    }),
    prisma.product.findMany({ include: { category: { include: { group: true } } } }),
    prisma.review.count({ where: { status: "pending" } }),
  ]);

  const stockValueCents = products.reduce(
    (total, product) => total + product.stock * product.priceCents,
    0,
  );

  const productHref = (id: string) => `/admin/products/${id}`;
  const categoryHref = (groupSlug: string, slug: string) => `/admin/categories/${groupSlug}/${slug}`;

  const outOfStock = products.filter((product) => product.stock <= 0);
  const lowStock = products.filter(
    (product) => product.stock > 0 && product.stock <= product.lowStockThreshold,
  );
  const emptyCategories = categories.filter((category) => category._count.products === 0);
  // On ne signale que les produits réellement sans visuel : ceux qui héritent
  // d'une image de catégorie s'affichent correctement en boutique.
  const withoutImage = products.filter(
    (product) =>
      (!product.image || !product.image.trim()) &&
      (!product.category.image || !product.category.image.trim()),
  );
  const brokenOldPrice = products.filter(
    (product) => product.oldPriceCents !== null && product.oldPriceCents <= product.priceCents,
  );

  const blocks: TaskBlock[] = ([
    {
      id: "out-of-stock",
      title: "En rupture de stock",
      icon: PackageX,
      tone: "critical",
      items: outOfStock.map((product) => ({
        key: product.id,
        href: productHref(product.id),
        title: `${product.brand} ${product.name}`,
        note: product.category.label,
      })),
    },
    {
      id: "low-stock",
      title: "Stock sous le seuil d'alerte",
      icon: TrendingDown,
      tone: "warning",
      items: lowStock.map((product) => ({
        key: product.id,
        href: productHref(product.id),
        title: `${product.brand} ${product.name}`,
        note: `${product.stock} pièce${product.stock > 1 ? "s" : ""} restante${product.stock > 1 ? "s" : ""}`,
      })),
    },
    {
      id: "empty-categories",
      title: "Catégories sans produit",
      icon: FolderOpen,
      tone: "warning",
      items: emptyCategories.map((category) => ({
        key: category.id,
        href: categoryHref(category.group.slug, category.slug),
        title: category.label,
        note: category.group.label,
      })),
    },
    {
      id: "without-image",
      title: "Produits sans image",
      icon: ImageOff,
      tone: "warning",
      items: withoutImage.map((product) => ({
        key: product.id,
        href: productHref(product.id),
        title: `${product.brand} ${product.name}`,
        note: product.category.label,
      })),
    },
    {
      id: "broken-old-price",
      title: "Prix barré sans réduction réelle",
      icon: AlertTriangle,
      tone: "warning",
      items: brokenOldPrice.map((product) => ({
        key: product.id,
        href: productHref(product.id),
        title: `${product.brand} ${product.name}`,
        note: `${formatPrice(product.oldPriceCents ?? 0)} au lieu de ${formatPrice(product.priceCents)}`,
      })),
    },
  ] satisfies TaskBlock[]).filter((block) => block.items.length > 0);

  const openTasks = blocks.reduce((total, block) => total + block.items.length, 0);

  const recentlyUpdated = [...products]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 6);

  // Tranches de prix en centimes, bornes lisibles pour un catalogue d'électroménager
  const PRICE_STEPS = [20000, 50000, 100000, 150000];
  const priceBuckets: PriceBucket[] = [
    { label: "moins de 200 €", count: 0 },
    { label: "200–499 €", count: 0 },
    { label: "500–999 €", count: 0 },
    { label: "1 000–1 499 €", count: 0 },
    { label: "1 500 € et plus", count: 0 },
  ];
  for (const product of products) {
    const index = PRICE_STEPS.findIndex((step) => product.priceCents < step);
    priceBuckets[index === -1 ? priceBuckets.length - 1 : index].count += 1;
  }

  const stockStatus = {
    ok: products.length - outOfStock.length - lowStock.length,
    low: lowStock.length,
    out: outOfStock.length,
  };

  const totalUnits = products.reduce((total, product) => total + product.stock, 0);
  const averagePriceCents = products.length
    ? Math.round(products.reduce((total, product) => total + product.priceCents, 0) / products.length)
    : 0;

  const valueByCategory = new Map<string, number>();
  for (const product of products) {
    const key = product.category.label;
    valueByCategory.set(key, (valueByCategory.get(key) ?? 0) + product.stock * product.priceCents);
  }
  const stockValueItems: CategoryValue[] = Array.from(valueByCategory, ([label, value]) => ({
    label,
    value,
    valueLabel: formatPrice(value),
  }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const metrics = [
    {
      label: "Catégories",
      value: String(categories.length),
      href: "/admin/categories",
      icon: Tags,
      note: `dans ${new Set(categories.map((category) => category.group.id)).size} univers`,
    },
    {
      label: "Produits",
      value: String(products.length),
      href: "/admin/products",
      icon: Package,
      note: `${outOfStock.length} en rupture`,
    },
    {
      label: "Valeur du stock",
      value: formatPrice(stockValueCents),
      href: "/admin/stock",
      icon: Euro,
      note: "Stock × prix de vente",
    },
    {
      label: "Avis clients",
      value: String(pendingReviews),
      href: "/admin/reviews",
      icon: Star,
      note: pendingReviews > 0 ? "en attente de validation" : "tout est validé",
      highlight: pendingReviews > 0,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-foreground">Vue d&apos;ensemble</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {openTasks > 0
              ? `${openTasks} point${openTasks > 1 ? "s" : ""} à traiter.`
              : "Le catalogue est entièrement à jour."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 rounded-sm bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Nouveau produit
          </Link>
          <Link
            href="/admin/categories/new"
            className="flex items-center gap-1.5 rounded-sm border border-border bg-white px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" /> Catégorie
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map(({ label, value, href, icon: Icon, note, highlight }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-sm border border-border bg-white p-5 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted text-muted-foreground group-hover:text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-transparent transition-colors group-hover:text-primary" />
            </div>
            <p
              className={`truncate text-2xl font-black ${highlight ? "text-primary" : "text-foreground"}`}
            >
              {value}
            </p>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StockStatusChart
          status={stockStatus}
          totalUnits={totalUnits}
          averagePriceLabel={formatPrice(averagePriceCents)}
        />
        <PriceDistributionChart buckets={priceBuckets} />
        <StockValueChart items={stockValueItems} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-black text-foreground">Actions requises</h2>
            {openTasks > 0 && (
              <span className="text-xs text-muted-foreground">
                {openTasks} point{openTasks > 1 ? "s" : ""} ouvert{openTasks > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {blocks.length === 0 ? (
            <div className="rounded-sm border border-border bg-white p-6">
              <p className="font-bold text-foreground">Tout est en ordre.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Stocks approvisionnés, catégories remplies, prix barrés cohérents.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-sm border border-border bg-white">
              {blocks.map(({ id, title, icon: Icon, tone, items }) => (
                <div key={id} className="p-5">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm ${
                        tone === "critical" ? "bg-primary/10 text-primary" : "bg-accent/25 text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="flex-1 text-sm font-black text-foreground">{title}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                      {items.length}
                    </span>
                  </div>

                  <ul className="space-y-1 pl-9.5">
                    {items.slice(0, MAX_TASK_ITEMS).map((item) => (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          className="flex items-baseline justify-between gap-3 rounded-sm py-1 text-sm hover:text-primary"
                        >
                          <span className="truncate font-medium text-foreground hover:text-primary">
                            {item.title}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{item.note}</span>
                        </Link>
                      </li>
                    ))}
                    {items.length > MAX_TASK_ITEMS && (
                      <li className="pt-1 text-xs text-muted-foreground">
                        … et {items.length - MAX_TASK_ITEMS} autre
                        {items.length - MAX_TASK_ITEMS > 1 ? "s" : ""}
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-3 text-lg font-black text-foreground">Modifiés récemment</h2>
            <div className="rounded-sm border border-border bg-white p-5">
              {recentlyUpdated.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun produit créé pour le moment. Dès que vous en enregistrez un, il apparaît ici.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentlyUpdated.map((product) => (
                    <li key={product.id} className="first:pt-0 last:pb-0">
                      <Link href={productHref(product.id)} className="block py-2 hover:text-primary">
                        <span className="block truncate text-sm font-semibold text-foreground hover:text-primary">
                          {product.brand} {product.name}
                        </span>
                        <span className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{product.category.label}</span>
                          <span className="shrink-0">{formatDate(product.updatedAt)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
