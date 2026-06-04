import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://hhcxktotyvvdhriiguhe.supabase.co', 'sb_publishable_fuIMCWMFRkS78Q9RZyeiuw_Fzw-o15J');

async function run() {
  const email = 'test_hang_123@gmail.com';
  const password = 'password123';
  
  console.log('1. Signing up...');
  const { data: signupData, error: signupErr } = await supabase.auth.signUp({ email, password });
  if (signupErr) console.log('Signup err:', signupErr.message);
  else console.log('Signup OK:', signupData.user?.id);

  console.log('2. Waiting 2s...');
  await new Promise(r => setTimeout(r, 2000));

  console.log('3. Signing in...');
  console.time('SignIn');
  const { data: signinData, error: signinErr } = await supabase.auth.signInWithPassword({ email, password });
  console.timeEnd('SignIn');
  
  if (signinErr) {
    console.error('SignIn err:', signinErr);
  } else {
    console.log('SignIn OK. Session:', !!signinData.session);
  }
}

run();
