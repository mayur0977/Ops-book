-- Backout for 0003_user_scoped_membership_reads.sql.
-- Restores the strict tenant-only policies from 0001. The business switcher
-- stops working until an alternative is in place.

DROP POLICY IF EXISTS tenant_isolation ON business_members;
CREATE POLICY tenant_isolation ON business_members
  USING      (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());

DROP POLICY IF EXISTS tenant_isolation ON businesses;
CREATE POLICY tenant_isolation ON businesses
  USING      (id = current_business_id())
  WITH CHECK (id = current_business_id());

DROP FUNCTION IF EXISTS current_user_id();
