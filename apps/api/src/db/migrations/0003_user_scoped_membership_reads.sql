-- Lets a signed-in user see their OWN membership rows without a tenant set.
--
-- The chicken-and-egg this solves: the business switcher must list which
-- businesses a user belongs to, but that read happens before any business is
-- selected, and 0001's policies make every tenant table invisible without
-- `app.business_id`. Without this, choosing a business would require already
-- having chosen one.
--
-- The widening is deliberately narrow. A user gains visibility of:
--   * their own business_members rows, in any business they belong to
--   * the businesses those rows point at
-- and nothing else. Other members of those businesses stay hidden, every other
-- tenant table is untouched, and WITH CHECK is left strict — a caller still
-- cannot WRITE a row into a business that is not the current tenant.
--
-- Backout: 0003_user_scoped_membership_reads.down.sql

CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$ LANGUAGE sql STABLE;
--> statement-breakpoint

DROP POLICY IF EXISTS tenant_isolation ON business_members;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON business_members
  USING (
    business_id = current_business_id()
    OR (current_user_id() IS NOT NULL AND user_id = current_user_id())
  )
  WITH CHECK (business_id = current_business_id());
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
  )
  WITH CHECK (id = current_business_id());
