-- Создание таблицы profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут читать только свой профиль
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Политика: пользователи могут обновлять только свой профиль
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Политика: пользователи могут вставлять только свой профиль
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Создание таблицы materials
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение Row Level Security для materials
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут читать только свои материалы
CREATE POLICY "Users can view own materials"
  ON materials FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователи могут вставлять только свои материалы
CREATE POLICY "Users can insert own materials"
  ON materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи могут обновлять только свои материалы
CREATE POLICY "Users can update own materials"
  ON materials FOR UPDATE
  USING (auth.uid() = user_id);

-- Политика: пользователи могут удалять только свои материалы
CREATE POLICY "Users can delete own materials"
  ON materials FOR DELETE
  USING (auth.uid() = user_id);

-- Создание Storage bucket для materials (выполнить в Supabase Dashboard > Storage)
-- Или через SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', false);

-- Политики для Storage bucket (выполнить после создания bucket)
-- CREATE POLICY "Users can upload own materials"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'materials' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can view own materials"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'materials' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can delete own materials"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'materials' AND auth.uid()::text = (storage.foldername(name))[1]);

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

-- Политики для вставки (для server actions)
CREATE POLICY "Users can insert own material summaries"
  ON material_summaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_summaries.material_id
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

-- Политика: пользователи могут читать только свои quizzes
CREATE POLICY "Users can view own quizzes"
  ON quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = quizzes.material_id
      AND materials.user_id = auth.uid()
    )
  );

-- Политика: пользователи могут вставлять только свои quizzes
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
CREATE INDEX IF NOT EXISTS material_embeddings_embedding_idx 
ON material_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

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

-- Создание таблицы user_progress
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, material_id)
);

-- Включение Row Level Security
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут читать только свой прогресс
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователи могут обновлять только свой прогресс
CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Политика: пользователи могут вставлять только свой прогресс
CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS user_progress_user_material_idx 
ON user_progress(user_id, material_id);

-- Создание таблицы achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы user_achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id, material_id)
);

-- Включение Row Level Security
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Политики для achievements (все могут читать)
CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  USING (true);

-- Политики для user_achievements
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Индексы
CREATE INDEX IF NOT EXISTS user_achievements_user_idx 
ON user_achievements(user_id);

CREATE INDEX IF NOT EXISTS user_achievements_achievement_idx 
ON user_achievements(achievement_id);

-- Заполнение начальными достижениями
INSERT INTO achievements (code, name, description, icon, condition_type, condition_value) VALUES
('first_xp', 'Первые шаги', 'Получите первую XP', '🎯', 'first_xp', NULL),
('streak_3', 'Трёхдневная серия', 'Изучайте материал 3 дня подряд', '🔥', 'streak', 3),
('streak_7', 'Недельная серия', 'Изучайте материал 7 дней подряд', '💪', 'streak', 7),
('level_5', 'Опытный ученик', 'Достигните 5 уровня', '⭐', 'level', 5),
('level_10', 'Мастер обучения', 'Достигните 10 уровня', '👑', 'level', 10),
('flashcards_50', 'Карточный мастер', 'Просмотрите 50 flashcards', '🃏', 'flashcards_viewed', 50),
('quiz_5', 'Тестовый эксперт', 'Пройдите 5 quiz', '📝', 'quiz_completed', 5),
('quiz_score_70', 'Хороший результат', 'Наберите 70% правильных ответов в quiz', '✅', 'quiz_score', 70),
('quiz_score_100', 'Идеальный результат', 'Наберите 100% правильных ответов в quiz', '💯', 'quiz_score', 100),
('tutor_messages_20', 'Любознательный', 'Отправьте 20 сообщений в AI Tutor', '💬', 'tutor_messages', 20)
ON CONFLICT (code) DO NOTHING;

