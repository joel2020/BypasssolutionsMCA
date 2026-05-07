/*
  # Bypass Solution — Core Schema

  ## Tables Created
  - `leads` — All inbound leads and applicants with full business/owner info
  - `notes` — Internal notes attached to leads
  - `tasks` — Follow-up tasks assigned to leads and reps
  - `call_logs` — Call history per lead
  - `documents` — Document records (metadata) per lead
  - `offers` — Funding offers created per lead
  - `funders` — Funder/partner database
  - `commissions` — Commission tracking per funded deal
  - `contact_submissions` — Public contact form submissions

  ## Security
  - RLS enabled on all tables
  - All write operations require authenticated users
  - Contact submissions allow anonymous inserts (public form)
  - Leads allow anonymous inserts (public apply form)
*/

-- ─────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Business info
  business_name text NOT NULL DEFAULT '',
  dba text DEFAULT '',
  industry text DEFAULT '',
  website text DEFAULT '',
  state text DEFAULT '',
  time_in_business text DEFAULT '',
  monthly_revenue numeric DEFAULT 0,
  funding_amount_requested numeric DEFAULT 0,

  -- Owner info
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  credit_score_range text DEFAULT '',
  ownership_pct text DEFAULT '',

  -- Funding details
  use_of_funds text DEFAULT '',
  existing_advances boolean DEFAULT false,
  monthly_deposits numeric DEFAULT 0,
  avg_daily_balance numeric DEFAULT 0,
  urgency text DEFAULT '',

  -- CRM fields
  status text DEFAULT 'New Lead',
  assigned_rep text DEFAULT 'Unassigned',
  lead_score integer DEFAULT 0,
  source text DEFAULT 'Website',
  last_contact_at timestamptz,
  notes text DEFAULT '',

  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  consent boolean DEFAULT false
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admins/reps) can do everything
CREATE POLICY "Authenticated users can read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (true);

-- Public can insert (apply form)
CREATE POLICY "Anyone can submit a lead"
  ON leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ─────────────────────────────────────────
-- NOTES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  created_by_name text DEFAULT 'Admin'
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notes"
  ON notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete notes"
  ON notes FOR DELETE
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  task_type text DEFAULT 'Follow Up',
  assigned_rep text DEFAULT 'Unassigned',
  due_date date,
  priority text DEFAULT 'Medium',
  status text DEFAULT 'Open'
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────
-- CALL LOGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  rep_name text DEFAULT '',
  duration text DEFAULT '0:00',
  disposition text DEFAULT 'Connected',
  notes text DEFAULT ''
);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read call_logs"
  ON call_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert call_logs"
  ON call_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ─────────────────────────────────────────
-- DOCUMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT '',
  doc_type text DEFAULT 'Bank Statement',
  storage_path text DEFAULT '',
  status text DEFAULT 'Pending',
  review_notes text DEFAULT ''
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public can insert document records (apply form)
CREATE POLICY "Anon can insert document records"
  ON documents FOR INSERT
  TO anon
  WITH CHECK (true);

-- ─────────────────────────────────────────
-- OFFERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  funder_name text NOT NULL DEFAULT '',
  funding_amount numeric DEFAULT 0,
  payback_amount numeric DEFAULT 0,
  factor_rate numeric DEFAULT 1.0,
  estimated_payment numeric DEFAULT 0,
  term text DEFAULT '',
  frequency text DEFAULT 'Daily',
  commission_pct numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  status text DEFAULT 'Draft',
  created_by_name text DEFAULT 'Admin'
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read offers"
  ON offers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert offers"
  ON offers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update offers"
  ON offers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────
-- FUNDERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS funders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL DEFAULT '',
  contact_name text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  min_revenue numeric DEFAULT 0,
  min_time_in_business text DEFAULT '',
  industries_accepted text[] DEFAULT '{}',
  states text DEFAULT 'All 50 states',
  max_funding numeric DEFAULT 0,
  notes text DEFAULT '',
  status text DEFAULT 'Active'
);

ALTER TABLE funders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read funders"
  ON funders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert funders"
  ON funders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update funders"
  ON funders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────
-- COMMISSIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  lead_name text DEFAULT '',
  business_name text DEFAULT '',
  funder_name text DEFAULT '',
  rep_name text DEFAULT '',
  funded_amount numeric DEFAULT 0,
  commission_pct numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  status text DEFAULT 'Pending',
  funded_date date DEFAULT CURRENT_DATE
);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert commissions"
  ON commissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update commissions"
  ON commissions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────
-- CONTACT SUBMISSIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  company text DEFAULT '',
  inquiry_type text DEFAULT '',
  message text NOT NULL DEFAULT ''
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public can submit contact forms
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read contact submissions"
  ON contact_submissions FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'leads_updated_at') THEN
    CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_updated_at') THEN
    CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'offers_updated_at') THEN
    CREATE TRIGGER offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'funders_updated_at') THEN
    CREATE TRIGGER funders_updated_at BEFORE UPDATE ON funders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
