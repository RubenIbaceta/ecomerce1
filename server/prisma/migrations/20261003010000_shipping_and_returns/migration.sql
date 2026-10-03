CREATE TYPE "ShippingMethod" AS ENUM ('STANDARD', 'EXPRESS');

ALTER TABLE "orders"
ADD COLUMN "shipping_method" "ShippingMethod" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "estimated_delivery_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '5 days';

ALTER TABLE "orders" ALTER COLUMN "estimated_delivery_at" DROP DEFAULT;

CREATE TYPE "ReturnRequestStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'REFUNDED', 'REJECTED');

CREATE TABLE "return_requests" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "amount_clp" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReturnRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "admin_note" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "return_requests_order_id_key" ON "return_requests"("order_id");
CREATE INDEX "return_requests_status_requested_at_idx" ON "return_requests"("status", "requested_at");
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
