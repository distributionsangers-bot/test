-- Function to allow a user to delete their own account
-- This must be called with a valid user session.
-- It deletes the user from auth.users, which triggers cascade deletes if FKs are set up correctly.
-- PRE-REQUISITE: You must have a way to delete from auth.users. 
-- Usually, standard users cannot delete from auth.users directly.
-- We typically need a Postgres Function with SECURITY DEFINER.

create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete from public tables (if not handled by cascade)
  -- Assuming ON DELETE CASCADE is set on foreign keys for profiles, registrations, messages, etc.
  -- If not, delete manually here:
  -- delete from public.profiles where id = current_user_id;

  -- Delete from auth.users (This is the critical part)
  -- Only works if the function has permissions (SECURITY DEFINER)
  delete from auth.users where id = current_user_id;
end;
$$;
