CREATE EXTENSION IF NOT EXISTS vector;
-- CreateEnum
CREATE TYPE "KbLoanType" AS ENUM ('PERSONAL', 'HOME', 'VEHICLE', 'EDUCATION', 'ALL');

-- CreateEnum
CREATE TYPE "KbDocumentType" AS ENUM ('TERMS_AND_CONDITIONS', 'RATE_FEE_SCHEDULE', 'CREDIT_POLICY', 'KYC_CHECKLIST', 'PREPAYMENT_POLICY', 'GRIEVANCE', 'REGULATORY_CIRCULAR', 'OFFICER_PLAYBOOK');

-- CreateEnum
CREATE TYPE "KbAudience" AS ENUM ('CUSTOMER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "KbCustomerSegment" AS ENUM ('SALARIED', 'SELF_EMPLOYED', 'STUDENT', 'ALL');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('AGENT_START', 'TOOL_CALL', 'TOOL_RESULT', 'LLM_CALL', 'LLM_RESULT', 'PERMISSION_DENIED', 'AGENT_END', 'HUMAN_REQUIRED', 'POLICY_DRAFTED', 'POLICY_PUBLISHED', 'POLICY_RETIRED');

-- CreateTable
CREATE TABLE "kb_document" (
    "id" TEXT NOT NULL,
    "document_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effective_date" DATE NOT NULL,
    "loan_type" "KbLoanType" NOT NULL,
    "document_type" "KbDocumentType" NOT NULL,
    "audience" "KbAudience" NOT NULL,
    "customer_segment" "KbCustomerSegment" NOT NULL DEFAULT 'ALL',
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "change_note" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "published_by" TEXT,
    "published_at" TIMESTAMP(3),
    "retired_at" TIMESTAMP(3),
    "retired_reason" TEXT,
    "source_file" TEXT NOT NULL,
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_chunk" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 0,
    "section" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(768) NOT NULL,

    CONSTRAINT "kb_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_run" (
    "audit_trail_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "recommendation" JSONB,

    CONSTRAINT "agent_run_pkey" PRIMARY KEY ("audit_trail_id")
);

-- CreateTable
CREATE TABLE "audit_event" (
    "id" TEXT NOT NULL,
    "audit_trail_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent" TEXT NOT NULL,
    "event_type" "AuditEventType" NOT NULL,
    "tool_name" TEXT,
    "input_json" JSONB NOT NULL,
    "output_json" JSONB NOT NULL,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kb_document_document_key_status_effective_date_idx" ON "kb_document"("document_key", "status", "effective_date");

-- CreateIndex
CREATE UNIQUE INDEX "kb_document_document_key_version_key" ON "kb_document"("document_key", "version");

-- CreateIndex
CREATE INDEX "kb_chunk_document_id_idx" ON "kb_chunk"("document_id");

-- CreateIndex
CREATE INDEX "agent_run_application_id_started_at_idx" ON "agent_run"("application_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "audit_event_audit_trail_id_sequence_key" ON "audit_event"("audit_trail_id", "sequence");

-- AddForeignKey
ALTER TABLE "kb_chunk" ADD CONSTRAINT "kb_chunk_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "kb_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_audit_trail_id_fkey" FOREIGN KEY ("audit_trail_id") REFERENCES "agent_run"("audit_trail_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HNSW index for cosine distance (operator <=>)
CREATE INDEX IF NOT EXISTS kb_chunk_embedding_hnsw ON kb_chunk USING hnsw (embedding vector_cosine_ops);
