import { requireAdminSession } from "@/lib/dal";
import { listCoupons } from "@/server/coupons";
import { CouponManager } from "@/components/admin/CouponManager";

export default async function AdminCouponsPage() {
  await requireAdminSession();
  const coupons = await listCoupons();
  const actifs = coupons.filter((c) => c.active).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Codes promo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {actifs} code{actifs > 1 ? "s" : ""} actif{actifs > 1 ? "s" : ""} sur {coupons.length}.
          Le client saisit son code au moment de payer ; la remise est recalculée sur le serveur à
          partir des prix en base, jamais d&apos;après ce que le navigateur annonce.
        </p>
      </div>

      <CouponManager coupons={coupons} />
    </div>
  );
}
