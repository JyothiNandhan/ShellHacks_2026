-- Run this entire block in Snowsight while on the same network as your local app.
-- Applies a policy to YOUR USER, not the whole account. It also restricts your
-- Snowsight sign-ins. Keep this session open; update the policy before changing networks.
EXECUTE IMMEDIATE $$
DECLARE
  client_ip STRING;
  user_name STRING;
  command STRING;
BEGIN
  USE ROLE ACCOUNTADMIN;
  client_ip := CURRENT_IP_ADDRESS();
  IF (NOT REGEXP_LIKE(client_ip, '^[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+$')) THEN
    RETURN 'An IPv4 address is required. Do not apply a guessed address.';
  END IF;
  user_name := '"' || REPLACE(CURRENT_USER(), '"', '""') || '"';
  command := 'CREATE NETWORK POLICY IF NOT EXISTS PS_LOCAL_ACCESS ALLOWED_IP_LIST = (' || CHR(39) || client_ip || '/32' || CHR(39) || ')';
  EXECUTE IMMEDIATE :command;
  command := 'ALTER NETWORK POLICY PS_LOCAL_ACCESS SET ALLOWED_IP_LIST = (' || CHR(39) || client_ip || '/32' || CHR(39) || ')';
  EXECUTE IMMEDIATE :command;
  ALTER USER IDENTIFIER(:user_name) SET NETWORK_POLICY = PS_LOCAL_ACCESS;
  RETURN 'Local network policy configured for your user.';
END;
$$;
