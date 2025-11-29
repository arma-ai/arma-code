-- Update allowed MIME types for the materials bucket to include audio
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'audio/mpeg')
WHERE id = 'materials' AND NOT ('audio/mpeg' = ANY(allowed_mime_types));

-- Alternative: Set explicit list if append fails or to be sure
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'audio/mpeg']
WHERE id = 'materials';
