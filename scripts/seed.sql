-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS parcels CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS partners CASCADE;

-- Create partners table
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create addresses table
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address_line TEXT,
    city TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parcels table
CREATE TABLE parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    pickup_address_id UUID REFERENCES addresses(id),
    dropoff_address_id UUID REFERENCES addresses(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample partners
INSERT INTO partners (id, business_name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Addis Ababa Main Post Office'),
    ('22222222-2222-2222-2222-222222222222', 'Bole Branch'),
    ('33333333-3333-3333-3333-333333333333', 'Megenagna Branch');

-- Insert sample addresses
INSERT INTO addresses (partner_id, latitude, longitude, address_line, city) VALUES
    ('11111111-1111-1111-1111-111111111111', 9.0222, 38.7468, 'Churchill Ave', 'Addis Ababa'),
    ('22222222-2222-2222-2222-222222222222', 8.9962, 38.7896, 'Bole Road', 'Addis Ababa'),
    ('33333333-3333-3333-3333-333333333333', 9.0123, 38.7654, 'Megenagna Square', 'Addis Ababa');

-- Insert sample parcels
INSERT INTO parcels (id, tracking_code, status, pickup_address_id, dropoff_address_id) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MBET123456', 'pending', 
        (SELECT id FROM addresses WHERE partner_id = '11111111-1111-1111-1111-111111111111'),
        (SELECT id FROM addresses WHERE partner_id = '22222222-2222-2222-2222-222222222222')
    ),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'MBET789012', 'in_transit',
        (SELECT id FROM addresses WHERE partner_id = '22222222-2222-2222-2222-222222222222'),
        (SELECT id FROM addresses WHERE partner_id = '33333333-3333-3333-3333-333333333333')
    );

-- Insert sample transactions
INSERT INTO transactions (parcel_id, amount, status) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 150.00, 'completed'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 200.00, 'pending'); 