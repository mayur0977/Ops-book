-- Backout for 0002_app_role_and_grants.sql.
--
-- Revokes the application role's access. The role is not dropped: it may own
-- active sessions, and DROP ROLE fails while any grant remains anywhere in the
-- cluster. Dropping it is a manual, deliberate step.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM daybook_app;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM daybook_app;
REVOKE USAGE ON SCHEMA public FROM daybook_app;

-- To remove entirely, once nothing references it:
--   REASSIGN OWNED BY daybook_app TO daybook; DROP OWNED BY daybook_app; DROP ROLE daybook_app;
