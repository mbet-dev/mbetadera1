-- First, ensure all necessary tables exist and have proper permissions
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('customer', 'courier', 'partner', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT,
    country TEXT NOT NULL DEFAULT 'Ethiopia',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_id TEXT UNIQUE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pickup_point_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    dropoff_point_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    courier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
    description TEXT,
    weight DECIMAL(10,2),
    dimensions TEXT,
    special_instructions TEXT,
    pickup_code TEXT,
    delivery_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT CHECK (type IN ('payment', 'refund', 'commission')),
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
    payment_method TEXT CHECK (payment_method IN ('wallet', 'yenepay', 'telebirr', 'cash')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Create policies for addresses
CREATE POLICY "Users can view their own addresses"
    ON public.addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own addresses"
    ON public.addresses FOR ALL
    USING (auth.uid() = user_id);

-- Create policies for parcels
CREATE POLICY "Users can view their own parcels"
    ON public.parcels FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR auth.uid() = courier_id OR auth.uid() = pickup_point_id OR auth.uid() = dropoff_point_id);

CREATE POLICY "Users can manage their own parcels"
    ON public.parcels FOR ALL
    USING (auth.uid() = sender_id OR auth.uid() = courier_id);

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Insert profiles for all users
INSERT INTO public.profiles (id, email, role) VALUES
    ('de9af1c4-f908-406a-9abc-4d3200f47925', 'alex@example.com', 'customer'),
    ('1ee6fa70-9c81-4b2e-a16a-550f0fb9850a', 'beza@example.com', 'customer'),
    ('4a958d9e-836f-41d9-8195-fb0f579c16d8', 'partner1@example.com', 'partner'),
    ('c6985013-0602-4a6e-a9c8-f56b12ac5c45', 'partner2@example.com', 'partner'),
    ('c44de80e-d4bc-4f0c-b686-5fc81d6d8bed', 'courier1@example.com', 'courier');

-- Insert sample addresses
INSERT INTO public.addresses (user_id, name, address_line1, address_line2, city, state, postal_code, latitude, longitude, is_default) VALUES
    -- Alex's addresses
    ('de9af1c4-f908-406a-9abc-4d3200f47925', 'Home', 'Bole Road', 'Near Edna Mall', 'Addis Ababa', 'Addis Ababa', '1000', 8.9806, 38.7578, true),
    ('de9af1c4-f908-406a-9abc-4d3200f47925', 'Office', 'Mexico Square', '5th Floor', 'Addis Ababa', 'Addis Ababa', '1000', 9.0227, 38.7469, false),
    
    -- Beza's addresses
    ('1ee6fa70-9c81-4b2e-a16a-550f0fb9850a', 'Home', 'Kazanchis', 'Near UNECA', 'Addis Ababa', 'Addis Ababa', '1000', 9.0227, 38.7469, true),
    
    -- Partner1's address (Pickup Point)
    ('4a958d9e-836f-41d9-8195-fb0f579c16d8', 'Main Office', 'Bole Medhanealem', 'Near Friendship Mall', 'Addis Ababa', 'Addis Ababa', '1000', 8.9806, 38.7578, true),
    
    -- Partner2's address (Dropoff Point)
    ('c6985013-0602-4a6e-a9c8-f56b12ac5c45', 'Branch Office', 'Megenagna', 'Near Zefmesh Building', 'Addis Ababa', 'Addis Ababa', '1000', 9.0227, 38.7469, true);

-- Insert sample parcels with different statuses
INSERT INTO public.parcels (tracking_id, sender_id, receiver_id, pickup_point_id, dropoff_point_id, courier_id, status, description, weight, dimensions, special_instructions, pickup_code, delivery_code) VALUES
    -- Pending parcel (just created)
    ('MBET-001', 'de9af1c4-f908-406a-9abc-4d3200f47925', '1ee6fa70-9c81-4b2e-a16a-550f0fb9850a', '4a958d9e-836f-41d9-8195-fb0f579c16d8', 'c6985013-0602-4a6e-a9c8-f56b12ac5c45', NULL, 'pending', 'Documents', 0.5, '30x20x5', 'Handle with care', 'ABC123', 'XYZ789'),
    
    -- Accepted parcel (ready for pickup)
    ('MBET-002', 'de9af1c4-f908-406a-9abc-4d3200f47925', '1ee6fa70-9c81-4b2e-a16a-550f0fb9850a', '4a958d9e-836f-41d9-8195-fb0f579c16d8', 'c6985013-0602-4a6e-a9c8-f56b12ac5c45', 'c44de80e-d4bc-4f0c-b686-5fc81d6d8bed', 'accepted', 'Electronics', 2.0, '40x30x20', 'Fragile', 'DEF456', 'UVW123'),
    
    -- In transit parcel
    ('MBET-003', 'de9af1c4-f908-406a-9abc-4d3200f47925', '1ee6fa70-9c81-4b2e-a16a-550f0fb9850a', '4a958d9e-836f-41d9-8195-fb0f579c16d8', 'c6985013-0602-4a6e-a9c8-f56b12ac5c45', 'c44de80e-d4bc-4f0c-b686-5fc81d6d8bed', 'in_transit', 'Clothing', 1.5, '35x25x15', 'Standard delivery', 'GHI789', 'RST456'),
    
    -- Delivered parcel
    ('MBET-004', 'de9af1c4-f908-406a-9abc-4d3200f47925', '1ee6fa70-9c81-4b2e-a16a-550f0fb9850a', '4a958d9e-836f-41d9-8195-fb0f579c16d8', 'c6985013-0602-4a6e-a9c8-f56b12ac5c45', 'c44de80e-d4bc-4f0c-b686-5fc81d6d8bed', 'delivered', 'Books', 3.0, '45x35x25', 'No special handling', 'JKL012', 'OPQ789');

-- Insert sample transactions
INSERT INTO public.transactions (user_id, parcel_id, amount, type, status, payment_method) VALUES
    -- Payment for MBET-001
    ('de9af1c4-f908-406a-9abc-4d3200f47925', (SELECT id FROM public.parcels WHERE tracking_id = 'MBET-001'), 150.00, 'payment', 'completed', 'wallet'),
    
    -- Payment for MBET-002
    ('de9af1c4-f908-406a-9abc-4d3200f47925', (SELECT id FROM public.parcels WHERE tracking_id = 'MBET-002'), 250.00, 'payment', 'completed', 'yenepay'),
    
    -- Payment for MBET-003
    ('de9af1c4-f908-406a-9abc-4d3200f47925', (SELECT id FROM public.parcels WHERE tracking_id = 'MBET-003'), 180.00, 'payment', 'completed', 'telebirr'),
    
    -- Payment for MBET-004
    ('de9af1c4-f908-406a-9abc-4d3200f47925', (SELECT id FROM public.parcels WHERE tracking_id = 'MBET-004'), 200.00, 'payment', 'completed', 'cash'),
    
    -- Commission for Partner1
    ('4a958d9e-836f-41d9-8195-fb0f579c16d8', (SELECT id FROM public.parcels WHERE tracking_id = 'MBET-001'), 15.00, 'commission', 'completed', 'wallet'),
    
    -- Commission for Partner2
    ('c6985013-0602-4a6e-a9c8-f56b12ac5c45', (SELECT id FROM public.parcels WHERE tracking_id = 'MBET-001'), 15.00, 'commission', 'completed', 'wallet'); 