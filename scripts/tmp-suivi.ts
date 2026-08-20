import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
import { prisma } from "../src/server/prisma";
async function main() {
  const o = await prisma.order.findUnique({
    where: { orderNumber: "KOSS-2026-000011" },
    select: { id: true, status: true, paymentStatus: true, totalCents: true },
  });
  console.log(`COMMANDE statut=${o?.status} paiement=${o?.paymentStatus} total=${o?.totalCents}`);
  const t = await prisma.paymentTransaction.findMany({ select: { reference: true, status: true, amount: true, currency: true } });
  console.log(`TRANSACTIONS=${t.length}`);
  for (const x of t) console.log(`  ${x.reference} ${x.status} ${x.amount} ${x.currency}`);
  const w = await prisma.webhookEvent.findMany({ select: { deliveryId: true, event: true, status: true }, orderBy: { receivedAt: "desc" }, take: 5 });
  console.log(`WEBHOOKS_RECUS=${w.length}`);
  for (const x of w) console.log(`  ${x.event} -> ${x.status} (${x.deliveryId.slice(0, 20)})`);
}
main().catch((e) => console.error("ERR", e.message)).finally(() => process.exit());
