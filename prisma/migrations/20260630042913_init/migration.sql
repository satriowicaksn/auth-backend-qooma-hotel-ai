-- CreateTable
CREATE TABLE "tiers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "display_name" VARCHAR(50) NOT NULL,
    "outbound_quota_monthly" INTEGER NOT NULL,
    "agent_cap" INTEGER NOT NULL,
    "agent_minimum" INTEGER NOT NULL DEFAULT 3,
    "user_cap" INTEGER NOT NULL,
    "department_cap" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "tier_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
    "branding" JSONB,
    "dnd" JSONB,
    "gm_contact" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "hotel_id" UUID,
    "dept_id" UUID,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "language" VARCHAR(2) NOT NULL DEFAULT 'id',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_rotate_password" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token" VARCHAR(512) NOT NULL,
    "csrf_token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "user_agent" VARCHAR(500),
    "ip_address" INET,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "token" VARCHAR(255) NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "tiers_name_key" ON "tiers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_code_key" ON "hotels"("code");

-- CreateIndex
CREATE INDEX "hotels_status_idx" ON "hotels"("status");

-- CreateIndex
CREATE INDEX "hotels_tier_id_idx" ON "hotels"("tier_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_hotel_id_is_active_idx" ON "users"("hotel_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_hotel_id_email_unique" ON "users"("hotel_id", "email");

-- CreateIndex
CREATE INDEX "sessions_user_id_revoked_at_idx" ON "sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- MANUAL CHECK CONSTRAINTS (per prisma/schema.prisma:141-163 comments)
--
-- Prisma 5 has no first-class CHECK constraint declaration, so the schema
-- author committed these as a comment block in the schema and asked the
-- migration generator to append them by hand. Translated verbatim from the
-- schema comment block.
--
-- Cross-slot execution per §4-D05 (Slot A canonical territory).
-- =============================================================================

ALTER TABLE "tiers" ADD CONSTRAINT "tiers_name_check"
  CHECK ("name" IN ('lite', 'professional', 'luxury', 'enterprise'));

ALTER TABLE "hotels" ADD CONSTRAINT "hotels_status_check"
  CHECK ("status" IN ('active', 'suspended'));

ALTER TABLE "users" ADD CONSTRAINT "users_role_check"
  CHECK ("role" IN ('super_admin', 'gm_admin', 'dept_head', 'staff'));

ALTER TABLE "users" ADD CONSTRAINT "users_role_hotel_mutual_exclusion"
  CHECK (
    ("role" = 'super_admin' AND "hotel_id" IS NULL)
    OR ("role" <> 'super_admin' AND "hotel_id" IS NOT NULL)
  );

ALTER TABLE "users" ADD CONSTRAINT "users_language_check"
  CHECK ("language" IN ('id', 'en'));
