-- Update the handle_new_user function to include the school column
-- This is necessary for the school to be saved in the public.profiles table

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    has_permit,
    mandatory_hours,
    school
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    (new.raw_user_meta_data->>'has_permit')::boolean,
    (new.raw_user_meta_data->>'mandatory_hours')::boolean,
    new.raw_user_meta_data->>'school'
  );
  return new;
end;
$$ language plpgsql security definer;
