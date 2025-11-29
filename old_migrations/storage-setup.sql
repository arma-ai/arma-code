-- Настройка Supabase Storage для материалов
-- Выполните этот скрипт в Supabase SQL Editor

-- Создание bucket (если еще не создан)
-- Примечание: Если bucket уже существует, команда не выдаст ошибку благодаря ON CONFLICT
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('materials', 'materials', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Удаление старых политик (если они существуют)
DROP POLICY IF EXISTS "Users can upload own materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own materials" ON storage.objects;

-- Политика для загрузки файлов (INSERT)
CREATE POLICY "Users can upload own materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'materials' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Политика для просмотра файлов (SELECT)
CREATE POLICY "Users can view own materials"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'materials' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Политика для удаления файлов (DELETE)
CREATE POLICY "Users can delete own materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'materials' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

