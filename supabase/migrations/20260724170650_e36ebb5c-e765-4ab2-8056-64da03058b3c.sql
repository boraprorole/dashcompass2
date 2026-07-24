-- Remover políticas existentes para evitar conflitos
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

-- 1. Permitir leitura pública para qualquer um
create policy "Avatar images are publicly accessible"
on storage.objects for select
to public
using ( bucket_id = 'avatars' );

-- 2. Permitir que usuários autenticados façam upload na sua própria pasta
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Permitir que usuários atualizem seus próprios arquivos
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Permitir que usuários deletem seus próprios arquivos
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
