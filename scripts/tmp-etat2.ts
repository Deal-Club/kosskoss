import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
import { prisma } from "../src/server/prisma";
async function main() {
  const o = await prisma.order.findMany({
    orderBy: { createdAt: "desc" }, take: 3,
    select: { orderNumber: true, status: true, paymentStatus: true, totalCents: true, createdAt: true },
  });
  console.log("DERNIERES_COMMANDES");
  for (const x of o) console.log(`  ${x.orderNumber} ${x.status}/${x.paymentStatus} ${x.totalCents} ${x.createdAt.toISOString().slice(0,16)}`);
  const t = await prisma.paymentTransaction.findMany({
    orderBy: { createdAt: "desc" }, take: 3,
    select: { reference: true, status: true, amount: true, completedAt: true },
  });
  console.log("TRANSACTIONS");
  for (const x of t) console.log(`  ${x.reference} ${x.status} ${x.amount} ${x.completedAt ? "conclu" : "-"}`);
  const w = await prisma.webhookEvent.findMany({
    orderBy: { receivedAt: "desc" }, take: 5,
    select: { event: true, status: true, error: true, receivedAt: true },
  });
  console.log("WEBHOOKS");
  for (const x of w) console.log(`  ${x.event} -> ${x.status}${x.error ? " ERR:" + x.error.slice(0,50) : ""} ${x.receivedAt.toISOString().slice(11,16)}`);
}
main().catch((e) => console.error("ERR", e.message)).finally(() => process.exit());
