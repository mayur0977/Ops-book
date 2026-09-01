-- Lets someone who knows a join code find the business it belongs to.
--
-- Joining is the one read that must work for a caller who is deliberately NOT
-- a member yet, so 0003's "member of it" clause cannot help. Without this the
-- lookup returns zero rows and every join attempt is a 404 — which is what
-- happened, and what the join tests caught.
--
-- The widening is exactly as narrow as the credential: a row is visible only
-- to a caller who has already set `app.join_code` to that row's own code. Not
-- knowing the code reveals nothing, and knowing one code reveals one business.
-- The code is the credential, which is why it is rotatable and why reading it
-- is gated behind `business.settings`.
--
-- WITH CHECK is untouched: this grants no ability to write.
--
-- Backout: 0004_join_by_code_lookup.down.sql

CREATE OR REPLACE FUNCTION current_join_code() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.join_code', true), '')
$$ LANGUAGE sql STABLE;
--> statement-breakpoint

DROP POLICY IF EXISTS tenant_isolation ON businesses;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON businesses
  USING (
    id = current_business_id()
    OR (
      current_user_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM business_members m
        WHERE m.business_id = businesses.id
          AND m.user_id = current_user_id()
          AND m.status = 'active'
      )
    )
    OR (current_join_code() IS NOT NULL AND join_code = current_join_code())
  )
  WITH CHECK (id = current_business_id());
