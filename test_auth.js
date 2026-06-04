import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hhcxktotyvvdhriiguhe.supabase.co';
const supabaseKey = 'sb_publishable_fuIMCWMFRkS78Q9RZyeiuw_Fzw-o15J';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing Supabase login...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'akuadmin123@gmail.com',
    password: 'password123'
  });
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
