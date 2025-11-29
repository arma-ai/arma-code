-- Исправление кодировки для уже сохраненного текста в БД
-- ВНИМАНИЕ: Этот скрипт пытается исправить кодировку через SQL функции
-- Но лучше переобработать материалы через кнопку "Force Update"

-- Функция для конвертации Windows-1251 → UTF-8 через SQL
-- (работает только если в БД есть поддержка iconv или аналогичных функций)

-- Вариант 1: Обновить через chunks (если они есть)
-- Это восстановит правильный текст из chunks
UPDATE materials
SET full_text = (
    SELECT string_agg(chunk_text, E'\n\n' ORDER BY chunk_index)
    FROM material_embeddings
    WHERE material_embeddings.material_id = materials.id
)
WHERE full_text IS NOT NULL
AND full_text LIKE '%È%'
AND EXISTS (
    SELECT 1 
    FROM material_embeddings 
    WHERE material_embeddings.material_id = materials.id
);

-- Проверка результата
SELECT 
    id,
    title,
    CASE 
        WHEN full_text LIKE '%È%' THEN 'STILL HAS ENCODING ISSUE'
        WHEN full_text LIKE '%Информатика%' OR full_text LIKE '%информатика%' THEN 'FIXED (has cyrillic)'
        ELSE 'CHECK MANUALLY'
    END as encoding_status,
    LEFT(full_text, 100) as text_preview
FROM materials
WHERE full_text IS NOT NULL
LIMIT 5;


