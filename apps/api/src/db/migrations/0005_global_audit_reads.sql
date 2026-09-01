-- Makes global audit rows readable by the user they are about.
--
-- audit_logs holds events with no business context — login, user creation —
-- and the ERD reserves a NULL business_id for exactly those. But 0001's policy
-- reads `business_id = current_business_id()`, and NULL = NULL is NULL, not
-- true. So those rows could be written and then read by nobody, ever: a
-- write-only audit trail, which is not an audit trail.
--
-- The fix is as narrow as the need. A global row is visible to the actor it
-- concerns and to no one else, which is what "your sign-in history" requires.
-- Business-scoped rows are untouched and stay behind the tenant check, so
-- `audit.view` still governs everything that belongs to a business.
--
-- Backout: 0005_global_audit_reads.down.sql

DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON audit_logs
  USING (
    business_id = current_business_id()
    OR (
      business_id IS NULL
      AND current_user_id() IS NOT NULL
      AND actor_id = current_user_id()
    )
  )
  WITH CHECK (
    business_id IS NOT DISTINCT FROM current_business_id()
    OR business_id IS NULL
  );
