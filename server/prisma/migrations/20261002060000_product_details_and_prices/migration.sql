ALTER TABLE "products"
ADD COLUMN "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "specifications" TEXT NOT NULL DEFAULT '',
ADD COLUMN "condition" TEXT NOT NULL DEFAULT 'Nuevo',
ADD COLUMN "transfer_price_clp" INTEGER;
