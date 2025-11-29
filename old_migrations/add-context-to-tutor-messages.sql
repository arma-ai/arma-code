-- Добавление поля context в таблицу tutor_messages
-- Выполните этот скрипт в Supabase SQL Editor

-- Проверяем, существует ли колонка, и добавляем её если нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tutor_messages' 
        AND column_name = 'context'
    ) THEN
        ALTER TABLE tutor_messages 
        ADD COLUMN context TEXT DEFAULT 'chat' CHECK (context IN ('chat', 'selection'));
        
        -- Обновляем существующие записи, устанавливая значение по умолчанию
        UPDATE tutor_messages SET context = 'chat' WHERE context IS NULL;
    END IF;
END $$;

-- Создаем индекс для быстрого поиска по context
CREATE INDEX IF NOT EXISTS tutor_messages_context_idx ON tutor_messages(context);

