-- Function to set up auth schema and tables
CREATE OR REPLACE FUNCTION public.setup_auth_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create profiles table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT CHECK (role IN ('customer', 'courier', 'partner', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Enable Row Level Security
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

    -- Create new policies
    CREATE POLICY "Users can view their own profile"
        ON public.profiles FOR SELECT
        USING (auth.uid() = id);

    CREATE POLICY "Users can update their own profile"
        ON public.profiles FOR UPDATE
        USING (auth.uid() = id);

    -- Grant permissions
    GRANT USAGE ON SCHEMA public TO postgres, authenticated, service_role;
    GRANT ALL ON public.profiles TO postgres, service_role;
    GRANT SELECT, UPDATE ON public.profiles TO authenticated;
END;
$$;

-- Execute the function
SELECT setup_auth_schema(); 