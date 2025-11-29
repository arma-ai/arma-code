-- Проверка наличия поля full_text в таблице materials
-- Выполните этот скрипт в Supabase SQL Editor для диагностики

-- 1. Проверяем, существует ли поле full_text
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'materials' 
AND column_name = 'full_text';

-- 2. Проверяем, есть ли данные в full_text
SELECT 
    id,
    title,
    CASE 
        WHEN full_text IS NULL THEN 'NULL'
        WHEN full_text = '' THEN 'EMPTY'
        ELSE CONCAT('HAS TEXT (', LENGTH(full_text), ' chars)')
    END as full_text_status
FROM materials
LIMIT 10;

-- 3. Проверяем RLS политики для UPDATE
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'materials' 
AND cmd = 'UPDATE';


