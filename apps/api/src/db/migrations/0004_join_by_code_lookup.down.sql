-- Backout for 0004_join_by_code_lookup.sql.
-- Restores 0003's policy. Joining by code stops working.

DROP POLICY IF EXISTS tenant_isolation ON businesses;
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

DROP FUNCTION IF EXISTS current_join_code();
