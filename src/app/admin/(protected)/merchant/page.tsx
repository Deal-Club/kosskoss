import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, ExternalLink, FileDown, Info } from "lucide-react";
import { requireAdminSession } from "@/lib/dal";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { paginate, parsePageParam } from "@/lib/pagination";
import { auditCatalog, siteUrl, type MerchantAudit, type MerchantIssue } from "@/server/merchant";

// Page de contrôle « Google Merchant » : elle donne au commerçant, produit par
// produit, la liste exacte de ce qui manque avant de lancer une campagne Shopping.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Google Merchant Center | Administration",
};

const CARD = "rounded-sm border border-border bg-white p-5";

/** Compteur de tête : une valeur, son intitulé et une précision d'une ligne. */
function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "neutral" | "ok" | "alert";
}) {
  const valueClass =
    tone === "alert" ? "text-primary" : tone === "ok" ? "text-emerald-600" : "text-foreground";

  return (
    <div className={CARD}>
      <p className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-black ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Une anomalie : rouge si elle bloque la diffusion, jaune si elle la dégrade. */
function IssueLine({ issue }: { issue: MerchantIssue }) {
  const isError = issue.level === "error";

  return (
    <li className="flex gap-2 text-xs leading-relaxed">
      {isError ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      ) : (
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
      )}
      <span>
        <code
          className={`mr-1.5 rounded-sm px-1 py-0.5 text-[10px] font-black ${
            isError ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-800"
          }`}
        >
          {issue.attribute}
        </code>
        <span className="text-muted-foreground">{issue.message}</span>
      </span>
    </li>
  );
}

/** Un produit et la liste de ses anomalies, erreurs d'abord. */
function ProductRow({ audit }: { audit: MerchantAudit }) {
  const errors = audit.issues.filter((issue) => issue.level === "error");
  const warnings = audit.issues.filter((issue) => issue.level === "warning");

  return (
    <li className="border-b border-border py-4 last:border-b-0 last:pb-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-foreground">{audit.title}</p>
          <p className="text-xs text-muted-foreground">
            {audit.categoryLabel} · Réf. {audit.sku}
            {!audit.active && " · désactivé"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs font-bold">
          {errors.length > 0 ? (
            <span className="rounded-sm bg-primary px-2 py-0.5 text-white">
              {errors.length} {errors.length === 1 ? "erreur" : "erreurs"}
            </span>
          ) : (
            <span className="rounded-sm bg-amber-100 px-2 py-0.5 text-amber-800">
              {warnings.length} {warnings.length === 1 ? "avertissement" : "avertissements"}
            </span>
          )}
          <Link href={audit.adminHref} className="text-primary underline">
            Modifier
          </Link>
          <a
            href={audit.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-muted-foreground hover:text-primary"
          >
            Fiche <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <ul className="space-y-1.5">
        {[...errors, ...warnings].map((issue) => (
          <IssueLine key={`${issue.attribute}-${issue.message}`} issue={issue} />
        ))}
      </ul>
    </li>
  );
}

export default async function MerchantPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; warnPage?: string }>;
}) {
  await requireAdminSession();
  // Deux clés distinctes : « page » pour les produits refusés, « warnPage » pour
  // ceux qui ne portent que des avertissements.
  const params = await searchParams;
  const overview = await auditCatalog();
  const base = siteUrl();

  // Les produits bloqués d'abord, puis ceux qui n'ont que des avertissements.
  const blocked = overview.audits.filter((audit) => !audit.ready);
  const warned = overview.audits.filter((audit) => audit.ready && audit.issues.length > 0);

  const blockedPageInfo = paginate(blocked, parsePageParam(params.page));
  const warnedPageInfo = paginate(warned, parsePageParam(params.warnPage));

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Google Merchant Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contrôle de tout le catalogue au regard de la spécification des données produits de
          Google. Les points en rouge entraînent le refus de l&apos;offre, ceux en jaune une
          diffusion dégradée.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Produits au total"
          value={overview.total}
          hint={`${overview.feedCount} actifs et présents dans le flux`}
          tone="neutral"
        />
        <StatCard
          label="Prêts pour le flux"
          value={overview.ready}
          hint="Aucune erreur bloquante"
          tone="ok"
        />
        <StatCard
          label="À corriger"
          value={overview.blocked}
          hint="Refusés par Google"
          tone="alert"
        />
        <StatCard
          label="Avec avertissements"
          value={overview.withWarnings}
          hint="Diffusés, mais avec des restrictions"
          tone="neutral"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={CARD}>
          <h2 className="mb-1 text-sm font-black text-foreground">Sources de données produits</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Saisir l&apos;une de ces adresses dans le Merchant Center, via « Sources de données
            produits → Ajouter une source de données → Planifier un fichier ». Une seule des deux
            suffit.
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="/feed/google"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 font-bold text-primary underline"
              >
                <FileDown className="h-4 w-4" /> Flux XML (RSS 2.0)
              </a>
              <code className="mt-0.5 block text-[11px] break-all text-muted-foreground">
                {base}/feed/google
              </code>
            </li>
            <li>
              <a
                href="/feed/google-csv"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 font-bold text-primary underline"
              >
                <FileDown className="h-4 w-4" /> Flux TSV (séparé par des tabulations)
              </a>
              <code className="mt-0.5 block text-[11px] break-all text-muted-foreground">
                {base}/feed/google-csv
              </code>
            </li>
          </ul>
        </div>

        <div className={CARD}>
          <h2 className="mb-1 text-sm font-black text-foreground">État global</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Informations que seul le commerçant peut se procurer.
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Sans GTIN (EAN)</dt>
              <dd className="font-black text-foreground">
                {overview.missingGtin} / {overview.total}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Sans MPN</dt>
              <dd className="font-black text-foreground">
                {overview.missingMpn} / {overview.total}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Sans photo produit propre</dt>
              <dd className="font-black text-foreground">
                {overview.missingOwnImage} / {overview.total}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Les GTIN ne sont volontairement pas générés automatiquement : un numéro inventé entraîne
            la suspension du compte Merchant Center.
          </p>
        </div>
      </div>

      {blockedPageInfo.totalItems > 0 && (
        <section className={`${CARD} mb-6`}>
          <h2 className="mb-1 text-sm font-black text-foreground">
            Refusés par Google ({blockedPageInfo.totalItems})
          </h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Ces produits ne remplissent pas au moins une exigence obligatoire.
          </p>
          <ul>
            {blockedPageInfo.items.map((audit) => (
              <ProductRow key={audit.productId} audit={audit} />
            ))}
          </ul>
          <AdminPagination
            {...blockedPageInfo}
            basePath="/admin/merchant"
            params={params}
            label="produits"
          />
        </section>
      )}

      {warnedPageInfo.totalItems > 0 && (
        <section className={`${CARD} mb-6`}>
          <h2 className="mb-1 text-sm font-black text-foreground">
            Diffusés avec des restrictions ({warnedPageInfo.totalItems})
          </h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Aucun motif de refus, mais chaque point corrigé améliore la visibilité et le coût par
            clic.
          </p>
          <ul>
            {warnedPageInfo.items.map((audit) => (
              <ProductRow key={audit.productId} audit={audit} />
            ))}
          </ul>
          <AdminPagination
            {...warnedPageInfo}
            basePath="/admin/merchant"
            params={params}
            label="produits"
            pageParam="warnPage"
          />
        </section>
      )}

      {blocked.length === 0 && warned.length === 0 && (
        <div className={`${CARD} flex items-center gap-3`}>
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
          <p className="text-sm font-bold text-foreground">
            Les {overview.total} produits remplissent les exigences de Google Merchant Center.
          </p>
        </div>
      )}
    </>
  );
}
