<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { session } from '$lib/stores/appStore';

  onMount(() => {
    const unsub = session.subscribe((s) => {
      if (s) goto('/dashboard');
      else goto('/login');
    });
    return unsub;
  });
</script>

<div class="flex items-center justify-center h-screen">
  <div class="anim-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
</div>
