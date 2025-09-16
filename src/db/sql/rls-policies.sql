-- RLS Policies for FreelawSales

-- Users table policies
CREATE POLICY "Users can read their own profile" ON users
  FOR SELECT USING (id = auth.user_id());

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (auth.user_role() = 'admin');

CREATE POLICY "Admins and leads can update user profiles" ON users
  FOR UPDATE USING (
    auth.user_role() IN ('admin', 'lead') OR 
    id = auth.user_id()
  );

CREATE POLICY "Only admins can insert users" ON users
  FOR INSERT WITH CHECK (auth.user_role() = 'admin');

-- Meetings table policies
CREATE POLICY "Users can read meetings they are involved in" ON meetings
  FOR SELECT USING (
    seller_id = auth.user_id() OR 
    auth.user_role() IN ('admin', 'lead')
  );

CREATE POLICY "Users can insert their own meetings" ON meetings
  FOR INSERT WITH CHECK (seller_id = auth.user_id());

CREATE POLICY "Users can update their own meetings" ON meetings
  FOR UPDATE USING (
    seller_id = auth.user_id() OR 
    auth.user_role() IN ('admin', 'lead')
  );

CREATE POLICY "Admins can delete meetings" ON meetings
  FOR DELETE USING (auth.user_role() = 'admin');

-- Transcripts table policies
CREATE POLICY "Users can read transcripts for their meetings" ON transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = transcripts.meeting_id 
      AND (meetings.seller_id = auth.user_id() OR auth.user_role() IN ('admin', 'lead'))
    )
  );

CREATE POLICY "System can insert transcripts" ON transcripts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update transcripts" ON transcripts
  FOR UPDATE USING (true);

-- Analyses table policies  
CREATE POLICY "Users can read analyses for their meetings" ON analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = analyses.meeting_id 
      AND (meetings.seller_id = auth.user_id() OR auth.user_role() IN ('admin', 'lead'))
    )
  );

CREATE POLICY "System can insert analyses" ON analyses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update analyses" ON analyses
  FOR UPDATE USING (true);

-- Sync events table policies
CREATE POLICY "Users can read sync events for their meetings" ON sync_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = sync_events.meeting_id 
      AND (meetings.seller_id = auth.user_id() OR auth.user_role() IN ('admin', 'lead'))
    )
  );

CREATE POLICY "System can insert sync events" ON sync_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update sync events" ON sync_events
  FOR UPDATE USING (true);

CREATE POLICY "Admins can delete sync events" ON sync_events
  FOR DELETE USING (auth.user_role() = 'admin');