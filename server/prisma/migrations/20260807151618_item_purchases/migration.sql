-- CreateTable
CREATE TABLE "item_purchases" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_purchases_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "item_purchases" ADD CONSTRAINT "item_purchases_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
