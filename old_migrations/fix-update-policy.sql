-- Исправление RLS политики для UPDATE на таблице materials
-- Важно: политика UPDATE должна иметь и USING, и WITH CHECK
-- Выполните этот скрипт в Supabase SQL Editor

-- Удаляем старую политику (если существует)
DROP POLICY IF EXISTS "Users can update own materials" ON materials;

-- Создаем правильную политику с USING и WITH CHECK
CREATE POLICY "Users can update own materials"
  ON materials FOR UPDATE
  USING (auth.uid() = user_id)  -- Проверяет, может ли пользователь обновить строку
  WITH CHECK (auth.uid() = user_id);  -- Проверяет данные после обновления

-- Проверяем, что политика создана
SELECT 
    policyname,
    cmd,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'materials' 
AND cmd = 'UPDATE';


