-- Add column for Presentation Embed URL
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS presentation_embed_url TEXT;

COMMENT ON COLUMN materials.presentation_embed_url IS 'URL to embed the generated presentation';
