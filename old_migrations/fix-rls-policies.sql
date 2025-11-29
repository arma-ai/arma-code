-- Исправление RLS политик для таблицы materials
-- Выполните этот скрипт в Supabase SQL Editor

-- Удаление старых политик (если они существуют)
DROP POLICY IF EXISTS "Users can view own materials" ON materials;
DROP POLICY IF EXISTS "Users can insert own materials" ON materials;
DROP POLICY IF EXISTS "Users can update own materials" ON materials;
DROP POLICY IF EXISTS "Users can delete own materials" ON materials;

-- Убедитесь, что RLS включен
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут читать только свои материалы
CREATE POLICY "Users can view own materials"
  ON materials FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователи могут вставлять только свои материалы
-- ВАЖНО: WITH CHECK проверяет данные ПЕРЕД вставкой
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

-- Проверка: убедитесь, что таблица существует и RLS включен
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'materials';

