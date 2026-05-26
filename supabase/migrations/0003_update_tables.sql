-- Add status column to requests table (with 'cancelled' option)
ALTER TABLE requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Add start_time, end_time, and expiration to events_and_announcements
ALTER TABLE events_and_announcements ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE events_and_announcements ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE events_and_announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Make sure resident_profiles is the correct table (since existing code uses resident_information too)
-- Let's rename resident_information to resident_profiles for consistency (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resident_information') THEN
    ALTER TABLE resident_information RENAME TO resident_profiles;
  END IF;
END $$;
