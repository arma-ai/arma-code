-- Add columns for AI Presentation feature
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS presentation_status TEXT DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
ADD COLUMN IF NOT EXISTS presentation_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN materials.presentation_status IS 'Status of the AI presentation generation';
COMMENT ON COLUMN materials.presentation_url IS 'URL to download/view the generated presentation';
