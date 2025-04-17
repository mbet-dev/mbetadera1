-- Function to create test users
CREATE OR REPLACE FUNCTION public.create_test_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    user_exists BOOLEAN;
BEGIN
    -- Test Customer
    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'alex@example.com'
    ) INTO user_exists;

    IF NOT user_exists THEN
        INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
        VALUES (
            'alex@example.com',
            crypt('password123', gen_salt('bf')),
            NOW(),
            'authenticated'
        )
        RETURNING id INTO user_id;

        INSERT INTO public.profiles (id, email, role)
        VALUES (user_id, 'alex@example.com', 'customer');
    END IF;

    -- Test Courier
    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'courier@example.com'
    ) INTO user_exists;

    IF NOT user_exists THEN
        INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
        VALUES (
            'courier@example.com',
            crypt('password123', gen_salt('bf')),
            NOW(),
            'authenticated'
        )
        RETURNING id INTO user_id;

        INSERT INTO public.profiles (id, email, role)
        VALUES (user_id, 'courier@example.com', 'courier');
    END IF;

    -- Test Partner
    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'partner@example.com'
    ) INTO user_exists;

    IF NOT user_exists THEN
        INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
        VALUES (
            'partner@example.com',
            crypt('password123', gen_salt('bf')),
            NOW(),
            'authenticated'
        )
        RETURNING id INTO user_id;

        INSERT INTO public.profiles (id, email, role)
        VALUES (user_id, 'partner@example.com', 'partner');
    END IF;
END;
$$;

-- Execute the function
SELECT create_test_users(); 