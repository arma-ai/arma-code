-- Создание всех таблиц для AI обработки материалов
-- Выполните этот скрипт в Supabase SQL Editor

-- Создание таблицы material_summaries
CREATE TABLE IF NOT EXISTS material_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы material_notes
CREATE TABLE IF NOT EXISTS material_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы flashcards
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение Row Level Security
ALTER TABLE material_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Удаление старых политик (если они существуют)
DROP POLICY IF EXISTS "Users can view own material summaries" ON material_summaries;
DROP POLICY IF EXISTS "Users can insert own material summaries" ON material_summaries;
DROP POLICY IF EXISTS "Users can view own material notes" ON material_notes;
DROP POLICY IF EXISTS "Users can insert own material notes" ON material_notes;
DROP POLICY IF EXISTS "Users can view own flashcards" ON flashcards;
DROP POLICY IF EXISTS "Users can insert own flashcards" ON flashcards;

-- Политики для material_summaries
CREATE POLICY "Users can view own material summaries"
  ON material_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_summaries.material_id
      AND materials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own material summaries"
  ON material_summaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_summaries.material_id
      AND materials.user_id = auth.uid()
    )
  );

-- Политики для material_notes
CREATE POLICY "Users can view own material notes"
  ON material_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_notes.material_id
      AND materials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own material notes"
  ON material_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_notes.material_id
      AND materials.user_id = auth.uid()
    )
  );

-- Политики для flashcards
CREATE POLICY "Users can view own flashcards"
  ON flashcards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = flashcards.material_id
      AND materials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own flashcards"
  ON flashcards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = flashcards.material_id
      AND materials.user_id = auth.uid()
    )
  );

-- Создание таблицы quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение Row Level Security для quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Удаление старых политик для quizzes
DROP POLICY IF EXISTS "Users can view own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can insert own quizzes" ON quizzes;

-- Политики для quizzes
CREATE POLICY "Users can view own quizzes"
  ON quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = quizzes.material_id
      AND materials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own quizzes"
  ON quizzes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = quizzes.material_id
      AND materials.user_id = auth.uid()
    )
  );

-- Включение расширения pgvector для работы с embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Создание таблицы material_embeddings
CREATE TABLE IF NOT EXISTS material_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(3072),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы tutor_messages
CREATE TABLE IF NOT EXISTS tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение Row Level Security
ALTER TABLE material_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_messages ENABLE ROW LEVEL SECURITY;

-- Удаление старых политик
DROP POLICY IF EXISTS "Users can view own material embeddings" ON material_embeddings;
DROP POLICY IF EXISTS "Users can insert own material embeddings" ON material_embeddings;
DROP POLICY IF EXISTS "Users can view own tutor messages" ON tutor_messages;
DROP POLICY IF EXISTS "Users can insert own tutor messages" ON tutor_messages;

-- Политики для material_embeddings
CREATE POLICY "Users can view own material embeddings"
  ON material_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_embeddings.material_id
      AND materials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own material embeddings"
  ON material_embeddings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_embeddings.material_id
      AND materials.user_id = auth.uid()
    )
  );

-- Политики для tutor_messages
CREATE POLICY "Users can view own tutor messages"
  ON tutor_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = tutor_messages.material_id
      AND materials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tutor messages"
  ON tutor_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = tutor_messages.material_id
      AND materials.user_id = auth.uid()
    )
  );

-- Создание индекса для быстрого поиска по cosine similarity
-- Примечание: ivfflat не поддерживает более 2000 измерений
-- Для text-embedding-3-large (3072 измерения) используем HNSW или убираем индекс
-- Индекс не обязателен - поиск будет работать, просто медленнее
-- CREATE INDEX IF NOT EXISTS material_embeddings_embedding_idx 
-- ON material_embeddings 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Функция для поиска релевантных чанков по cosine similarity
CREATE OR REPLACE FUNCTION match_material_chunks(
  query_embedding vector(3072),
  match_material_id uuid,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  material_id uuid,
  chunk_text text,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    material_embeddings.id,
    material_embeddings.material_id,
    material_embeddings.chunk_text,
    material_embeddings.chunk_index,
    1 - (material_embeddings.embedding <=> query_embedding) as similarity
  FROM material_embeddings
  WHERE material_embeddings.material_id = match_material_id
    AND 1 - (material_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY material_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

