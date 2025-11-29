-- Восстановление full_text из chunks (material_embeddings) для всех материалов
-- Выполните этот скрипт в Supabase SQL Editor

-- Обновляем full_text для всех материалов, у которых есть chunks, но нет full_text
UPDATE materials
SET full_text = (
    SELECT string_agg(chunk_text, E'\n\n' ORDER BY chunk_index)
    FROM material_embeddings
    WHERE material_embeddings.material_id = materials.id
)
WHERE full_text IS NULL 
AND EXISTS (
    SELECT 1 
    FROM material_embeddings 
    WHERE material_embeddings.material_id = materials.id
)
RETURNING 
    id,
    title,
    LENGTH(full_text) as text_length,
    CASE 
        WHEN full_text IS NULL THEN 'NULL'
        WHEN full_text = '' THEN 'EMPTY'
        ELSE 'RESTORED'
    END as status;

-- Проверяем результат
SELECT 
    id,
    title,
    CASE 
        WHEN full_text IS NULL THEN 'NULL'
        WHEN full_text = '' THEN 'EMPTY'
        ELSE CONCAT('HAS TEXT (', LENGTH(full_text), ' chars)')
    END as full_text_status,
    LENGTH(full_text) as text_length
FROM materials
ORDER BY created_at DESC;


