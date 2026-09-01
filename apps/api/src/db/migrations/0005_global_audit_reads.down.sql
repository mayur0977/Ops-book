-- Backout for 0005_global_audit_reads.sql.
-- Restores 0001's policy. Global audit rows become write-only again.

DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
CREATE POLICY tenant_isolation ON audit_logs
  USING      (business_id = current_business_id())
  WITH CHECK (business_id IS NOT DISTINCT FROM current_business_id()
              OR business_id IS NULL);
