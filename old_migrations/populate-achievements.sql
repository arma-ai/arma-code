-- Создание и заполнение таблицы achievements
-- Выполните этот скрипт в Supabase SQL Editor

-- Создание таблицы achievements (если не существует)
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

-- Создание таблицы user_achievements (если не существует)
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

-- Удаление старых политик (если они существуют)
DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;

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

-- Удаление старых достижений (опционально, если нужно пересоздать)
-- DELETE FROM achievements;

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

-- Проверка: сколько достижений создано
SELECT COUNT(*) as total_achievements FROM achievements;

