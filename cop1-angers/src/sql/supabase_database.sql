-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.event_templates (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  event_title text,
  event_location text,
  shifts_config jsonb,
  created_at timestamp with time zone DEFAULT now(),
  event_description text,
  CONSTRAINT event_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title text NOT NULL,
  location text,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_visible boolean DEFAULT true,
  publish_at timestamp with time zone,
  description text,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ticket_id bigint NOT NULL,
  user_id uuid NOT NULL,
  content text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  reply_to_id bigint,
  edited_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id),
  CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.pole_interests (
  user_id uuid NOT NULL,
  team_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pole_interests_pkey PRIMARY KEY (user_id, team_id),
  CONSTRAINT pole_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT pole_interests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text,
  last_name text,
  email text,
  phone text,
  photo_url text,
  is_admin boolean DEFAULT false,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  has_permit boolean DEFAULT false,
  mandatory_hours boolean DEFAULT false,
  total_hours numeric DEFAULT 0,
  role_title text,
  pole_id bigint,
  admin_note text,
  created_at timestamp with time zone DEFAULT now(),
  school text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_pole_id_fkey FOREIGN KEY (pole_id) REFERENCES public.teams(id)
);
CREATE TABLE public.registrations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  shift_id bigint,
  attended boolean DEFAULT false,
  hours_counted numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  checked_in_at timestamp with time zone,
  counts_for_hours boolean DEFAULT false,
  note text,
  CONSTRAINT registrations_pkey PRIMARY KEY (id),
  CONSTRAINT registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT registrations_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id)
);
CREATE TABLE public.shifts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  event_id bigint,
  title text NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  max_slots integer DEFAULT 10,
  reserved_slots integer DEFAULT 0,
  hours_value numeric DEFAULT 0,
  referent_name text,
  total_registrations integer DEFAULT 0,
  reserved_taken integer DEFAULT 0,
  CONSTRAINT shifts_pkey PRIMARY KEY (id),
  CONSTRAINT shifts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.teams (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'users'::text,
  created_at timestamp with time zone DEFAULT now(),
  email text,
  color text DEFAULT 'brand'::text,
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tickets (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  subject text,
  category text DEFAULT 'support'::text,
  last_message_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  status text DEFAULT 'open'::text,
  hidden_for_admin boolean DEFAULT false,
  hidden_for_volunteer boolean DEFAULT false,
  admin_last_read_at timestamp with time zone DEFAULT now(),
  volunteer_last_read_at timestamp with time zone DEFAULT now(),
  assigned_admin_id uuid,
  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_assigned_admin_id_fkey FOREIGN KEY (assigned_admin_id) REFERENCES public.profiles(id),
  CONSTRAINT tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);