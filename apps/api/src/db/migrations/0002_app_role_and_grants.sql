-- The unprivileged role the application actually connects as.
--
-- Why this exists: a superuser bypasses row-level security entirely, FORCE or
-- not. The Postgres Docker image makes POSTGRES_USER a superuser, so connecting
-- as it meant every policy in 0001 was present and silently ignored. The
-- tenant-isolation suite caught it; without a separate role the whole isolation
-- design is decorative.
--
-- This role owns nothing and creates nothing. It is granted exactly what the
-- API needs and no more. NOBYPASSRLS is stated explicitly rather than relied on
-- as a default, because it is the single attribute that would void 0001.
--
-- The role is created NOLOGIN. Granting it LOGIN and a password is an
-- environment concern, never a migration one — no credential belongs in here.
-- Local development does it in `pnpm db:bootstrap`.
--
-- Backout: 0002_app_role_and_grants.down.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'daybook_app') THEN
    CREATE ROLE daybook_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE daybook_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO daybook_app;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON
  users, sessions, refresh_tokens, otp_requests,
  businesses, business_members, roles, role_permissions, member_permissions,
  idempotency_keys
TO daybook_app;
--> statement-breakpoint

-- Audit tables are append-only. The trigger in 0001 refuses UPDATE and DELETE
-- outright; withholding the grant as well means the attempt fails before it
-- reaches the trigger. Two independent guards, because a lost audit trail is
-- not recoverable.
GRANT SELECT, INSERT ON audit_logs TO daybook_app;
--> statement-breakpoint

-- The permission catalogue is seeded by deploy, never written by a request.
GRANT SELECT ON permissions TO daybook_app;
--> statement-breakpoint

-- Future tables default to the same shape, so a new table is not accidentally
-- unreadable — or accidentally writable — until someone remembers a grant.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO daybook_app;
