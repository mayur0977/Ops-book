-- Backout for 0001_rls_and_audit_guards.sql.
--
-- Reverses the guards only; it drops no data and no table. Running this leaves
-- the schema intact and tenant isolation OFF, so it is an emergency measure,
-- not a routine step. If it is ever run in production, every subsequent query
-- is unisolated until 0001 is reapplied.

DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
DROP POLICY IF EXISTS tenant_isolation ON member_permissions;
DROP POLICY IF EXISTS tenant_isolation ON role_permissions;
DROP POLICY IF EXISTS tenant_isolation ON idempotency_keys;
DROP POLICY IF EXISTS tenant_isolation ON roles;
DROP POLICY IF EXISTS tenant_isolation ON business_members;
DROP POLICY IF EXISTS tenant_isolation ON businesses;

ALTER TABLE audit_logs         NO FORCE ROW LEVEL SECURITY;
ALTER TABLE member_permissions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE role_permissions   NO FORCE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys   NO FORCE ROW LEVEL SECURITY;
ALTER TABLE roles              NO FORCE ROW LEVEL SECURITY;
ALTER TABLE business_members   NO FORCE ROW LEVEL SECURITY;
ALTER TABLE businesses         NO FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_logs         DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions   DISABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys   DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles              DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_members   DISABLE ROW LEVEL SECURITY;
ALTER TABLE businesses         DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
DROP FUNCTION IF EXISTS refuse_mutation();

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
DROP TRIGGER IF EXISTS roles_set_updated_at ON roles;
DROP TRIGGER IF EXISTS business_members_set_updated_at ON business_members;
DROP TRIGGER IF EXISTS businesses_set_updated_at ON businesses;
DROP FUNCTION IF EXISTS set_updated_at();

DROP FUNCTION IF EXISTS current_business_id();
