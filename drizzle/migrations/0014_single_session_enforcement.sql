-- Single active session per account: a random token is stamped on the
-- profile at every login (claimSession) and polled by the client
-- (checkSession) to detect when a newer login elsewhere invalidated this
-- one, so a shared login gets kicked out within seconds instead of waiting
-- for the access token to expire. Only service_role (server functions)
-- writes this column -- no authenticated-write policy is added.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_token uuid;
