-- Добавление политики для удаления сообщений из tutor_messages
-- Выполните этот скрипт в Supabase SQL Editor

-- Удаление старой политики, если она существует
DROP POLICY IF EXISTS "Users can delete own tutor messages" ON tutor_messages;

-- Создание политики для удаления
CREATE POLICY "Users can delete own tutor messages"
  ON tutor_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = tutor_messages.material_id
      AND materials.user_id = auth.uid()
    )
  );


