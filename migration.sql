-- First drop any existing constraints and indexes
DROP INDEX IF EXISTS public.idx_profiles_phone_number;
DROP INDEX IF EXISTS public.idx_profiles_phone;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_number_key;

-- Ensure the profiles table has the correct columns
DO $$
BEGIN
    -- Handle full_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'full_name'
    ) THEN
        -- If display_name exists, rename it to full_name
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'display_name'
        ) THEN
            ALTER TABLE public.profiles RENAME COLUMN display_name TO full_name;
        ELSE
            -- If neither exists, create full_name
            ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
        END IF;
    END IF;

    -- Handle phone_number column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'phone_number'
    ) THEN
        -- If phone exists, rename it to phone_number
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'phone'
        ) THEN
            ALTER TABLE public.profiles RENAME COLUMN phone TO phone_number;
        ELSE
            -- If neither exists, create phone_number
            ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;
        END IF;
    END IF;

    -- Drop any remaining old columns if they still exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE public.profiles DROP COLUMN display_name;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.profiles DROP COLUMN phone;
    END IF;
END $$;

-- Create new index and unique constraint
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);

-- Update existing records from auth.users metadata
UPDATE public.profiles p
SET phone_number = COALESCE(u.raw_user_meta_data->>'phone_number', u.raw_user_meta_data->>'phone'),
    full_name = COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name')
FROM auth.users u
WHERE p.id = u.id
AND (p.phone_number IS NULL OR p.full_name IS NULL);

-- Update RLS policies for profiles table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone_number,
        role
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
        'customer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 