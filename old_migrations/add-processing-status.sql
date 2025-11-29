-- Add processing_progress and processing_status columns to materials table
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'queued';

-- Update existing materials to have completed status if they have full_text
UPDATE materials 
SET processing_progress = 100, processing_status = 'completed' 
WHERE full_text IS NOT NULL;
