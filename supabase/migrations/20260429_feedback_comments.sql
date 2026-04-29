-- Phase F PF.1 — in-app feedback widget
--
-- Lets approved testers (Kyle, Yanie, owner) drop pinned comments anywhere on
-- the site while gated by SITE_PASSWORD. The dev/admin views all comments at
-- /admin and resolves them.
--
-- Anchoring: route + x_pct/y_pct (% of page width/height) + viewport size.
-- Storing percentages instead of pixels means pins survive viewport resize
-- and most layout shifts.

CREATE TABLE IF NOT EXISTS feedback_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route         text NOT NULL,
  x_pct         real NOT NULL,
  y_pct         real NOT NULL,
  viewport_w    integer NOT NULL,
  viewport_h    integer NOT NULL,
  scroll_y      integer NOT NULL DEFAULT 0,
  message       text NOT NULL CHECK (length(message) BETWEEN 1 AND 1000),
  author        text NOT NULL CHECK (length(author) BETWEEN 1 AND 80),
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_comments_route ON feedback_comments (route);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_status ON feedback_comments (status);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_created_at ON feedback_comments (created_at DESC);

ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;

-- Public read: anyone past the basic-auth gate can see pins on the page they're on.
CREATE POLICY "feedback_select_all" ON feedback_comments
  FOR SELECT TO anon, authenticated USING (true);

-- Public insert: tester widget creates rows from the client. Server-side validation
-- happens at the API route (length checks above + the check constraints).
CREATE POLICY "feedback_insert_all" ON feedback_comments
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Public update: status changes (resolve/reopen). The API route limits this to
-- the `status` column only.
CREATE POLICY "feedback_update_all" ON feedback_comments
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
