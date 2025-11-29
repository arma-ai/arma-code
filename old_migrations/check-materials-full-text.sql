-- Проверка статуса full_text для всех материалов
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Показываем все материалы с их статусом full_text
SELECT 
    id,
    title,
    type,
    created_at,
    CASE 
        WHEN full_text IS NULL THEN 'NULL'
        WHEN full_text = '' THEN 'EMPTY'
        ELSE CONCAT('HAS TEXT (', LENGTH(full_text), ' chars)')
    END as full_text_status,
    LENGTH(full_text) as text_length
FROM materials
ORDER BY created_at DESC
LIMIT 20;

-- 2. Проверяем, сколько материалов имеют full_text
SELECT 
    COUNT(*) as total_materials,
    COUNT(full_text) as materials_with_text,
    COUNT(*) - COUNT(full_text) as materials_without_text
FROM materials;

-- 3. Для проверки конкретного материала:
--    Скопируйте ID из первого запроса и вставьте ниже вместо YOUR_ID_HERE
--    Пример: WHERE id = '123e4567-e89b-12d3-a456-426614174000'::uuid;

-- SELECT 
--     id, 
--     title, 
--     LENGTH(full_text) as text_length,
--     CASE 
--         WHEN full_text IS NULL THEN 'NULL'
--         WHEN full_text = '' THEN 'EMPTY'
--         ELSE LEFT(full_text, 100) || '...'
--     END as text_preview
-- FROM materials 
-- WHERE id = 'YOUR_ID_HERE'::uuid;

