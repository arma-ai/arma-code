-- Добавление поддержки YouTube материалов
-- Выполните этот скрипт в Supabase SQL Editor

-- Добавляем поля type и source в таблицу materials
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'pdf' CHECK (type IN ('pdf', 'youtube')),
ADD COLUMN IF NOT EXISTS source TEXT;

-- Обновляем существующие записи
UPDATE materials SET type = 'pdf' WHERE type IS NULL;

-- Создаем индекс для быстрого поиска по типу
CREATE INDEX IF NOT EXISTS materials_type_idx ON materials(type);

