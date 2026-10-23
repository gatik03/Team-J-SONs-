-- CreateExtension
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'vector extension not available, skipping';
END $$;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'LOAN_OFFICER', 'CREDIT_ANALYST', 'POLICY_ADMIN');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('PERSONAL', 'HOME', 'VEHICLE', 'EDUCATION');

-- CreateEnum
CREATE TYPE "CustomerSegment" AS ENUM ('SALARIED', 'SELF_EMPLOYED', 'STUDENT');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('VERIFIED', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('IDENTITY', 'ADDRESS', 'INCOME');

-- CreateTable
CREATE TABLE "app_user" (
    "username" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "display_name" TEXT NOT NULL,
    "customer_id" TEXT,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "customer" (
    "customer_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "segment" "CustomerSegment" NOT NULL,
    "employment_type" TEXT NOT NULL,
    "monthly_income" INTEGER NOT NULL,
    "existing_monthly_obligations" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "kyc_status" "KycStatus" NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "kyc_ref" TEXT,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "loan_product" (
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "loan_type" "LoanType" NOT NULL,
    "description" TEXT NOT NULL,
    "min_interest_rate" DOUBLE PRECISION NOT NULL,
    "max_interest_rate" DOUBLE PRECISION NOT NULL,
    "indicative_rate" DOUBLE PRECISION NOT NULL,
    "min_tenure_months" INTEGER NOT NULL,
    "max_tenure_months" INTEGER NOT NULL,
    "min_amount" INTEGER NOT NULL,
    "max_amount" INTEGER NOT NULL,
    "processing_fee_percent" DOUBLE PRECISION NOT NULL,
    "processing_fee_min" INTEGER NOT NULL,
    "processing_fee_max" INTEGER,
    "eligibility" JSONB NOT NULL,

    CONSTRAINT "loan_product_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "loan_application" (
    "application_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "product_id" TEXT,
    "requested_amount" INTEGER,
    "tenure_months" INTEGER,
    "purpose" TEXT,
    "employment_type" TEXT,
    "monthly_income" INTEGER,
    "existing_monthly_obligations" INTEGER,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "estimated_emi" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_application_pkey" PRIMARY KEY ("application_id")
);

-- CreateTable
CREATE TABLE "status_event" (
    "id" SERIAL NOT NULL,
    "application_id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "status_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_document" (
    "document_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "stored_path" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_document_pkey" PRIMARY KEY ("document_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_customer_id_key" ON "app_user"("customer_id");

-- CreateIndex
CREATE INDEX "loan_application_customer_id_idx" ON "loan_application"("customer_id");

-- CreateIndex
CREATE INDEX "loan_application_status_idx" ON "loan_application"("status");

-- CreateIndex
CREATE INDEX "status_event_application_id_idx" ON "status_event"("application_id");

-- CreateIndex
CREATE INDEX "application_document_application_id_idx" ON "application_document"("application_id");

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_application" ADD CONSTRAINT "loan_application_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_application" ADD CONSTRAINT "loan_application_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "loan_product"("product_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_event" ADD CONSTRAINT "status_event_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "loan_application"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_document" ADD CONSTRAINT "application_document_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "loan_application"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;
