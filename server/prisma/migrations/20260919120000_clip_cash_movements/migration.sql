-- DropForeignKey
ALTER TABLE "cash_movements" DROP CONSTRAINT "cash_movements_createdById_fkey";

-- AlterTable
ALTER TABLE "cash_movements" ADD COLUMN     "sourceClipTransactionId" TEXT,
ALTER COLUMN "createdById" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cash_movements_sourceClipTransactionId_key" ON "cash_movements"("sourceClipTransactionId");

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
