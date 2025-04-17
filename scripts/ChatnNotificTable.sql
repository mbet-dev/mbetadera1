-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    receiver_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE SET NULL,
    CONSTRAINT sender_receiver_different CHECK (sender_id != receiver_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_parcel_id ON public.messages(parcel_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read) WHERE read = false;

-- Enable row-level security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own received messages" ON public.messages;

CREATE POLICY "Users can view their own messages"
    ON public.messages
    FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages"
    ON public.messages
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own received messages"
    ON public.messages
    FOR UPDATE
    USING (auth.uid() = receiver_id);

-- Grant permissions
GRANT ALL ON public.messages TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;

-- Seed with sample messages between alex and beza
-- Alex sending messages to Beza
INSERT INTO public.messages (sender_id, receiver_id, content, read)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'alex@mbet.com' LIMIT 1), 
    (SELECT id FROM auth.users WHERE email = 'beza@mbet.com' LIMIT 1), 
    'Hi Beza, I have a package to send to Addis Ababa. Can you help?', 
    false
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'alex@mbet.com')
AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'beza@mbet.com');

-- Beza sending messages to Alex (unread)
INSERT INTO public.messages (sender_id, receiver_id, content, read)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'beza@mbet.com' LIMIT 1), 
    (SELECT id FROM auth.users WHERE email = 'alex@mbet.com' LIMIT 1), 
    'Hello Alex! Yes, I can arrange pickup for your package. When would you like it collected?', 
    false
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'beza@mbet.com')
AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'alex@mbet.com');

INSERT INTO public.messages (sender_id, receiver_id, content, read)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'beza@mbet.com' LIMIT 1), 
    (SELECT id FROM auth.users WHERE email = 'alex@mbet.com' LIMIT 1), 
    'Also, I need the delivery address details.', 
    false
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'beza@mbet.com')
AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'alex@mbet.com');

INSERT INTO public.messages (sender_id, receiver_id, content, read)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'beza@mbet.com' LIMIT 1), 
    (SELECT id FROM auth.users WHERE email = 'alex@mbet.com' LIMIT 1), 
    'We have a special discount for customers in your area this week!', 
    false
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'beza@mbet.com')
AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'alex@mbet.com');