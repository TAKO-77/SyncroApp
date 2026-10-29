-- Images inside workspace notes. Notes reference a file with a line such as
-- '![imagem](imagem:<file>)'; the file lives in this private bucket under '<user id>/<file>'.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-images', 'note-images', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create policy note_images_owner on storage.objects for all to authenticated
using (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
