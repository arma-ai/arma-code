-- Обновленный скрипт миграции (безопасный для повторного запуска)
-- Выполните этот код в Supabase SQL Editor

-- 1. Создаем таблицу, если её нет
CREATE TABLE IF NOT EXISTS transcript_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  start_time DECIMAL(10, 3) NOT NULL, -- Время начала в секундах
  end_time DECIMAL(10, 3) NOT NULL,   -- Время окончания в секундах
  text TEXT NOT NULL,                 -- Текст сегмента
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(material_id, segment_index)
);

-- 2. Создаем индексы (IF NOT EXISTS предотвращает ошибки)
CREATE INDEX IF NOT EXISTS idx_transcript_segments_material_id ON transcript_segments(material_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_lookup ON transcript_segments(material_id, start_time, end_time);

-- 3. Включаем RLS
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;

-- 4. Удаляем старые политики перед созданием новых (чтобы избежать ошибки "already exists")
DROP POLICY IF EXISTS "Users can view their own transcript segments" ON transcript_segments;
DROP POLICY IF EXISTS "Users can insert their own transcript segments" ON transcript_segments;
DROP POLICY IF EXISTS "Users can delete their own transcript segments" ON transcript_segments;

-- 5. Создаем политики заново
-- Политика на чтение
CREATE POLICY "Users can view their own transcript segments"
ON transcript_segments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM materials 
    WHERE materials.id = transcript_segments.material_id 
    AND materials.user_id = auth.uid()
  )
);

-- Политика на вставку
CREATE POLICY "Users can insert their own transcript segments"
ON transcript_segments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM materials 
    WHERE materials.id = transcript_segments.material_id 
    AND materials.user_id = auth.uid()
  )
);

-- Политика на удаление
CREATE POLICY "Users can delete their own transcript segments"
ON transcript_segments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM materials 
    WHERE materials.id = transcript_segments.material_id 
    AND materials.user_id = auth.uid()
  )
);
