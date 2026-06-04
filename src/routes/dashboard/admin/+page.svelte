<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/supabaseClient';
  import { profile } from '$lib/stores/appStore';
  import { goto } from '$app/navigation';
  import { Shield, Users, Columns, StickyNote, AlertCircle } from '@lucide/svelte';
  import type { Profile, Board, Note } from '$lib/supabase/supabaseClient';

  let allUsers: Profile[] = [];
  let allBoards: Board[] = [];
  let allNotes: Note[] = [];
  let loading = true;
  let error = '';

  $: if ($profile && $profile.role !== 'admin') {
    goto('/dashboard');
  }

  onMount(async () => {
    if ($profile?.role !== 'admin') return;
    
    loading = true;
    try {
      const [usersRes, boardsRes, notesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('updated_at', { ascending: false }),
        supabase.from('boards').select('*').order('created_at', { ascending: false }),
        supabase.from('notes').select('*').order('created_at', { ascending: false })
      ]);

      if (usersRes.error) throw usersRes.error;
      if (boardsRes.error) throw boardsRes.error;
      if (notesRes.error) throw notesRes.error;

      allUsers = usersRes.data ?? [];
      allBoards = boardsRes.data ?? [];
      allNotes = notesRes.data ?? [];
    } catch (err: any) {
      error = err.message || 'Gagal memuat data admin.';
    } finally {
      loading = false;
    }
  });

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function toggleAdminRole(user: Profile) {
    if (!confirm(`Ubah role pengguna ${user.username}?`)) return;
    
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id);
      
    if (!error) {
      allUsers = allUsers.map(u => u.id === user.id ? { ...u, role: newRole } : u);
    } else {
      alert('Gagal merubah role. Pastikan Anda punya izin.');
    }
  }
</script>

<svelte:head><title>KanBoard — Admin Panel</title></svelte:head>

<div class="p-6 max-w-7xl mx-auto">
  <div class="flex items-center gap-3 mb-8 pb-4 border-b border-border">
    <div class="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary text-secondary-foreground">
      <Shield size={24} />
    </div>
    <div>
      <h1 class="text-2xl font-bold">Admin Panel</h1>
      <p class="text-sm text-muted-foreground">Pemantauan Global Sistem KanBoard</p>
    </div>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <div class="anim-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"></div>
    </div>
  {:else if error}
    <div class="card p-6 rounded-xl text-center border-destructive">
      <AlertCircle size={32} class="text-destructive mx-auto mb-3" />
      <p class="font-semibold">{error}</p>
      <p class="text-sm mt-2 text-muted-foreground">Pastikan skema RLS Supabase sudah di-update untuk akses admin.</p>
    </div>
  {:else}
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div class="card p-5 flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users size={20} class="text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold">{allUsers.length}</p>
          <p class="text-sm text-muted-foreground">Total Pengguna</p>
        </div>
      </div>
      
      <div class="card p-5 flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Columns size={20} class="text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold">{allBoards.length}</p>
          <p class="text-sm text-muted-foreground">Total Boards</p>
        </div>
      </div>
      
      <div class="card p-5 flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <StickyNote size={20} class="text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold">{allNotes.length}</p>
          <p class="text-sm text-muted-foreground">Total Catatan</p>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="card overflow-hidden mb-8">
      <div class="px-5 py-4 border-b border-border bg-muted/50">
        <h2 class="font-semibold flex items-center gap-2">
          <Users size={16} /> Daftar Pengguna
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="text-muted-foreground bg-muted/20">
              <th class="px-5 py-3 font-medium">Username / Email</th>
              <th class="px-5 py-3 font-medium">Nama Lengkap</th>
              <th class="px-5 py-3 font-medium">Tgl Daftar</th>
              <th class="px-5 py-3 font-medium">Role</th>
              <th class="px-5 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each allUsers as user}
              <tr class="hover:bg-muted/50 transition-colors">
                <td class="px-5 py-3 font-medium">{user.username}</td>
                <td class="px-5 py-3 text-muted-foreground">{user.full_name || '-'}</td>
                <td class="px-5 py-3 text-muted-foreground">{formatDate(user.updated_at)}</td>
                <td class="px-5 py-3">
                  <span class="badge {user.role === 'admin' ? 'badge-default' : 'badge-secondary'}">
                    {user.role}
                  </span>
                </td>
                <td class="px-5 py-3 text-right">
                  <button 
                    class="btn btn-sm btn-ghost text-xs" 
                    on:click={() => toggleAdminRole(user)}
                    disabled={user.id === $profile?.id}
                  >
                    Jadikan {user.role === 'admin' ? 'User' : 'Admin'}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
