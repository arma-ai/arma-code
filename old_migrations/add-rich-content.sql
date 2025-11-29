-- Adds structured rich blocks for materials
-- Run this script inside Supabase SQL editor before deploying

CREATE TABLE IF NOT EXISTS material_rich_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  block_type TEXT NOT NULL,
  page_number INTEGER,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE material_rich_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rich blocks" ON material_rich_blocks;
DROP POLICY IF EXISTS "Users can insert own rich blocks" ON material_rich_blocks;

CREATE POLICY "Users can view own rich blocks"
  ON material_rich_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_rich_blocks.material_id
      AND materials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own rich blocks"
  ON material_rich_blocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_rich_blocks.material_id
      AND materials.user_id = auth.uid()
    )
  );

