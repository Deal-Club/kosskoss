-- Diagnostic Beauté : tags de correspondance sur les produits (JSON de clés).
ALTER TABLE "Product" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '[]';
