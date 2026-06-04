<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/supabaseClient';
  import { session, profile } from '$lib/stores/appStore';

  onMount(() => {
    // Hydrate session on first load
    supabase.auth.getSession().then(({ data }) => {
      session.set(data.session);
    });

    // Listen for auth state changes - only update stores, not navigation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      session.set(s);

      if (s?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', s.user.id)
          .single();
        profile.set(prof);
      } else {
        profile.set(null);
      }
    });

    return () => subscription.unsubscribe();
  });
</script>

<slot />
