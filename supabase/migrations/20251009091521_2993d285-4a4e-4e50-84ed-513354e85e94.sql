-- Fix critical security issues: Add user isolation and role-based access control

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Add created_by column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set existing tournaments to a default user (will be NULL for now - admins can reassign)
-- In production, you'd want to handle this migration more carefully

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Create trigger to auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- 6. Drop existing overly permissive RLS policies on tournaments
DROP POLICY IF EXISTS "Authenticated users can view tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Authenticated users can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Authenticated users can delete tournaments" ON public.tournaments;

-- 7. Create new ownership-based RLS policies for tournaments
CREATE POLICY "Users can view their own tournaments"
ON public.tournaments
FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create tournaments"
ON public.tournaments
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own tournaments"
ON public.tournaments
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own tournaments"
ON public.tournaments
FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 8. Update participants policies to be tournament-ownership based
DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.participants;
DROP POLICY IF EXISTS "Authenticated users can manage participants" ON public.participants;

CREATE POLICY "Users can view participants in their tournaments"
ON public.participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can manage participants in their tournaments"
ON public.participants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- 9. Update matches policies to be tournament-ownership based
DROP POLICY IF EXISTS "Authenticated users can view matches" ON public.matches;
DROP POLICY IF EXISTS "Authenticated users can manage matches" ON public.matches;

CREATE POLICY "Users can view matches in their tournaments"
ON public.matches
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can manage matches in their tournaments"
ON public.matches
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- 10. Create RLS policy for user_roles (users can view their own roles, admins can view all)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));