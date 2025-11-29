-- Add columns for podcast feature
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS podcast_script TEXT,
ADD COLUMN IF NOT EXISTS podcast_audio_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN materials.podcast_script IS 'Generated dialogue script for the AI podcast';
COMMENT ON COLUMN materials.podcast_audio_url IS 'URL to the generated audio file for the podcast';
