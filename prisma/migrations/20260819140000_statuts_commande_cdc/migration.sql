-- Statuts de commande alignés sur le cahier des charges KossKoss.
--
-- Le défaut valait « recue », hérité de mlcbois, alors que le tunnel de
-- commande écrivait déjà « en_attente_paiement » — une valeur qui ne figurait
-- dans aucune liste. Les commandes existantes portent toutes cette dernière :
-- il n'y a donc aucune donnée à convertir, seulement le défaut à rattraper.
--
-- Le filet ci-dessous couvre le cas d'une base où d'anciennes valeurs
-- subsisteraient (environnement de recette, dump plus ancien).

ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'en_attente_paiement';

UPDATE "Order" SET "status" = 'en_attente_paiement' WHERE "status" = 'recue';
UPDATE "Order" SET "status" = 'en_preparation'      WHERE "status" = 'en_traitement';
UPDATE "Order" SET "status" = 'en_acheminement'     WHERE "status" = 'expediee';
