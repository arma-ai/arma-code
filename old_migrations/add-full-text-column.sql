-- Добавление поля full_text в таблицу materials
-- Выполните этот скрипт в Supabase SQL Editor

-- Добавляем поле full_text для хранения очищенного текста документа
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS full_text TEXT;

-- Создаем индекс для быстрого поиска (опционально)
CREATE INDEX IF NOT EXISTS materials_full_text_idx ON materials(full_text) WHERE full_text IS NOT NULL;


