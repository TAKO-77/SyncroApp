-- The account's language, shared by every device and used by send-reminders for the text of phone notifications.
alter table public.profiles add column language text not null default 'pt-PT' check (language in ('pt-PT', 'en', 'de', 'fr'));
