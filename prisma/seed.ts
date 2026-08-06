/**
 * Configuration de la boutique KossKoss Select : moyens de paiement,
 * intégrations et premier compte administrateur.
 *
 * Le CATALOGUE (univers, catégories, produits, diagnostic beauté) est seedé
 * séparément par prisma/seed-kk.ts. Le script « npm run db:seed » lance les deux.
 * Lancement direct : tsx prisma/seed.ts
 */
// Le client de l'application, pour que le seed vise exactement la même base
// que le site — un second createClient() avait fini par diverger.
import { prisma } from "../src/server/prisma";
import { hashPassword } from "../src/lib/password";

// Moyens de paiement proposés dans le tunnel de commande (marché Cameroun).
const PAYMENT_METHODS = [
  {
    key: "orange-money",
    label: "Orange Money",
    description: "Paiement mobile via Orange Money.",
    icon: "smartphone",
    feeLabel: "Sans frais",
    position: 0,
  },
  {
    key: "mtn-momo",
    label: "MTN Mobile Money",
    description: "Paiement mobile via MTN Mobile Money.",
    icon: "smartphone",
    feeLabel: "Sans frais",
    position: 1,
  },
  {
    key: "carte-bancaire",
    label: "Carte bancaire",
    description: "Visa et Mastercard.",
    icon: "credit-card",
    feeLabel: "Sans frais",
    position: 2,
  },
  {
    key: "paiement-livraison",
    label: "Paiement à la livraison",
    description: "Règlement en espèces à la remise du colis, selon la zone de livraison.",
    icon: "banknote",
    feeLabel: "Sans frais",
    position: 3,
  },
];

// Clés d'intégration (les secrets sont saisis puis chiffrés depuis le
// back-office ; ils ne figurent jamais ici). CinetPay agrège le paiement
// Mobile Money (Orange, MTN) et la carte bancaire pour le marché camerounais.
const INTEGRATIONS = [
  {
    key: "cinetpay_apikey",
    label: "CinetPay — Clé API",
    description: "Clé API du compte CinetPay (Mobile Money et carte bancaire).",
  },
  {
    key: "cinetpay_site_id",
    label: "CinetPay — Identifiant de site",
    description: "Identifiant du site marchand CinetPay.",
  },
  {
    key: "cinetpay_secret_key",
    label: "CinetPay — Clé secrète",
    description: "Clé secrète servant à vérifier les notifications de paiement CinetPay.",
  },
  // Ni SMTP ni stockage d'images ici : l'envoi d'e-mails et les images se
  // configurent uniquement par variables d'environnement (voir .env.example).
];

async function seedShopConfig(): Promise<void> {
  for (const method of PAYMENT_METHODS) {
    await prisma.paymentMethod.upsert({
      where: { key: method.key },
      // On ne réécrit pas une ligne existante : les libellés et l'état
      // « activé » ajustés depuis le back-office doivent être préservés.
      update: {},
      create: method,
    });
  }

  for (const integration of INTEGRATIONS) {
    await prisma.integration.upsert({
      where: { key: integration.key },
      update: {},
      create: integration,
    });
  }

  console.log(
    `Configuration : ${PAYMENT_METHODS.length} moyens de paiement, ${INTEGRATIONS.length} intégrations`,
  );
}

async function seedAdmin(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "change-me";

  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Administrator",
      passwordHash: hashPassword(password),
      role: "owner",
    },
  });

  console.log(`Accès administrateur : ${email}`);
}

async function main(): Promise<void> {
  await seedShopConfig();
  await seedAdmin();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
