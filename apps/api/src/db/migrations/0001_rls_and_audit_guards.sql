-- Row-level security, the append-only audit guard, and the updated_at trigger.
--
-- Hand-written rather than generated: drizzle-kit does not model RLS, and this
-- is the migration that makes root CLAUDE.md rule 1 true. Reviewed as its own
-- commit per the repo conventions.
--
-- Backout: see 0001_rls_and_audit_guards.down.sql alongside this file.

-- ---------------------------------------------------------------------------
-- The tenant id, as a function.
--
-- `current_setting('app.business_id', true)` returns NULL only if the setting
-- was NEVER set on this session. Once a transaction has set it, later
-- statements on that pooled connection see an EMPTY STRING instead — and
-- ''::uuid raises 22P02 rather than filtering the row out. Under load that
-- turns into intermittent 500s on exactly the queries RLS is protecting.
--
-- NULLIF collapses both cases to NULL, so `business_id = current_business_id()`
-- is NULL and the row is filtered, which is the behaviour the policies want.
-- Every policy goes through here so the rule is stated once.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_business_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.business_id', true), '')::uuid
$$ LANGUAGE sql STABLE;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- updated_at is maintained by the database, not by every call site
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER businesses_set_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER business_members_set_updated_at BEFORE UPDATE ON business_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER roles_set_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Audit logs are append-only. Not "by convention" — by trigger.
--
-- Grants alone are not enough: the owner of a table bypasses its grants, and
-- the migration role IS the owner. A trigger refuses the statement regardless
-- of who issues it, which is the property actually wanted.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refuse_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION refuse_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION refuse_mutation();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Row-level security on every tenant table.
--
-- FORCE matters as much as ENABLE: without it the table owner is exempt, and
-- the application connects as the owner in development.
--
-- WITH CHECK matters as much as USING: without it a caller could INSERT a row
-- belonging to another tenant even though they could not read it back.
--
-- `current_setting(..., true)` returns NULL when unset rather than erroring, so
-- a query outside withTenant() sees zero rows instead of failing confusingly.
-- ---------------------------------------------------------------------------
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE businesses FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON businesses
  USING      (id = current_business_id())
  WITH CHECK (id = current_business_id());
--> statement-breakpoint

ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE business_members FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON business_members
  USING      (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());
--> statement-breakpoint

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON roles
  USING      (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());
--> statement-breakpoint

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE idempotency_keys FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON idempotency_keys
  USING      (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());
--> statement-breakpoint

-- role_permissions and member_permissions carry no business_id of their own;
-- they are reached through roles and business_members, which are themselves
-- protected. Isolating them via the parent keeps a single source of truth for
-- what a tenant boundary means.
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON role_permissions
  USING (EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id = role_permissions.role_id
      AND r.business_id = current_business_id()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id = role_permissions.role_id
      AND r.business_id = current_business_id()));
--> statement-breakpoint

ALTER TABLE member_permissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE member_permissions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON member_permissions
  USING (EXISTS (
    SELECT 1 FROM business_members m
    WHERE m.id = member_permissions.member_id
      AND m.business_id = current_business_id()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM business_members m
    WHERE m.id = member_permissions.member_id
      AND m.business_id = current_business_id()));
--> statement-breakpoint

-- audit_logs holds global rows (login, user creation) with a NULL business_id.
-- Those must stay invisible to any tenant-scoped read, so the policy requires a
-- non-null match rather than treating NULL as "everyone's".
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON audit_logs
  USING      (business_id = current_business_id())
  WITH CHECK (business_id IS NOT DISTINCT FROM current_business_id()
              OR business_id IS NULL);
