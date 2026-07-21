-- ADD-25: remove the per-tier outbound monthly allotment (outbound is a prepaid
-- top-up balance, 0 included in any subscription) and the minimum-agent floor
-- (the min-agent gate is revoked; only the per-tier upper cap remains).
ALTER TABLE "tiers"
  DROP COLUMN "outbound_quota_monthly",
  DROP COLUMN "agent_minimum";
