import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  console.error('Required environment variables:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL');
  console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

async function setupDatabase() {
  try {
    // Create profiles table if it doesn't exist
    const { error: createTableError } = await supabase.rpc('setup_auth_schema', {});

    if (createTableError) {
      console.error('Error setting up database:', createTableError.message);
      return false;
    }

    console.log('Database setup completed successfully');
    return true;
  } catch (error) {
    console.error('Error setting up database:', error);
    return false;
  }
}

async function setTestPasswords() {
  const testUsers = [
    { email: 'alex@example.com', password: 'password123', role: 'customer' },
    { email: 'beza@example.com', password: 'password123', role: 'customer' },
    { email: 'courier@example.com', password: 'password123', role: 'courier' },
    { email: 'partner@example.com', password: 'password123', role: 'partner' },
    { email: 'admin@example.com', password: 'password123', role: 'admin' },
  ];

  // First, set up the database
  const isSetup = await setupDatabase();
  if (!isSetup) {
    console.error('Failed to set up database. Exiting...');
    process.exit(1);
  }

  for (const user of testUsers) {
    try {
      // Create or update user using admin API
      const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          role: user.role
        }
      });

      if (signUpError) {
        console.error(`Error creating/updating user ${user.email}:`, signUpError.message);
      } else if (userData.user) {
        console.log(`Successfully created/updated user ${user.email}`);

        // Create or update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userData.user.id,
            email: user.email,
            role: user.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error(`Error creating/updating profile for ${user.email}:`, profileError.message);
        } else {
          console.log(`Successfully created/updated profile for ${user.email}`);
        }
      }
    } catch (error) {
      console.error(`Error with ${user.email}:`, error);
    }
  }
}

setTestPasswords(); 