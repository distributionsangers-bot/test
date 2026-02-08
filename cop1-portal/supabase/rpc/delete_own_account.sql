-- ==============================================================================
-- FONCTION : delete_own_account (VERSION V2 - ROBUSTE)
-- DESCRIPTION : Supprime le compte de l'utilisateur ET toutes ses données liées
--              manuellement pour contourner l'absence de "ON DELETE CASCADE".
-- ==============================================================================

create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  -- 1. Récupérer l'ID de l'utilisateur connecté
  current_user_id := auth.uid();

  -- 2. Vérifier que l'utilisateur est bien connecté
  if current_user_id is null then
    raise exception 'Non autorisé : Vous devez être connecté pour effectuer cette action.';
  end if;

  -- 3. Nettoyage MANUEL des données liées (l'ordre est important pour respecter les FK)
  
  -- Supprimer les messages de support
  delete from public.messages where user_id = current_user_id;
  
  -- Supprimer les tickets de support (créés par l'utilisateur)
  delete from public.tickets where user_id = current_user_id;
  
  -- Supprimer les inscriptions aux shifts
  delete from public.registrations where user_id = current_user_id;

  -- Supprimer les intérêts pour les pôles
  delete from public.pole_interests where user_id = current_user_id;

  -- Enfin, supprimer le profil public
  delete from public.profiles where id = current_user_id;

  -- 4. Supprimer l'utilisateur de la table auth.users
  delete from auth.users where id = current_user_id;
end;
$$;

-- 5. Permissions
grant execute on function delete_own_account to authenticated;

comment on function delete_own_account is 'Supprime le compte utilisateur et toutes les données associées manuellement.';
