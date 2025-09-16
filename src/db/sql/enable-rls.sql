-- Enable RLS on all tables (default-deny)

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on meetings table
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on transcripts table
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on analyses table
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on sync_events table
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- Create auth helper function
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid,
    NULL
  );
$$ LANGUAGE SQL STABLE;

-- Create role helper function  
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json ->> 'user_role'),
    'rep'
  );
$$ LANGUAGE SQL STABLE;