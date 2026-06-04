<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/supabaseClient';
  import { notes, activeNoteId, activeNote, session } from '$lib/stores/appStore';
  import type { Note } from '$lib/supabase/supabaseClient';
  import { Plus, Star, StarOff, Trash2, Search, FileText, Save, Clock, Edit3, Eye } from '@lucide/svelte';
  import { marked } from 'marked';

  let loading     = true;
  let saving      = false;
  let searchQuery = '';
  let saveTimer: ReturnType<typeof setTimeout>;

  let editMode    = true;
  let localTitle  = '';
  let localContent= '';
  let currentNoteId: string | null = null;

  // Sync local state when active note changes
  $: {
    if ($activeNote && $activeNote.id !== currentNoteId) {
      currentNoteId = $activeNote.id;
      localTitle = $activeNote.title;
      localContent = $activeNote.content ?? '';
    }
  }

  // ─── Load notes ──
  onMount(async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });
    notes.set(data ?? []);
    if (data && data.length > 0) activeNoteId.set(data[0].id);
    loading = false;
  });

  // ─── Filtered list ──
  $: filteredNotes = $notes.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.content ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Create note ──
  async function createNote() {
    if (!$session) return;
    const { data } = await supabase.from('notes').insert({
      user_id: $session.user.id,
      title: 'Catatan Baru',
      content: '',
    }).select().single();
    if (data) {
      notes.update((n) => [data, ...n]);
      activeNoteId.set(data.id);
    }
  }

  function onContentChange(content: string) {
    localContent = content;
    if (!currentNoteId) return;
    const noteId = currentNoteId;
    notes.update((ns) => ns.map((n) => n.id === noteId ? { ...n, content } : n));
    clearTimeout(saveTimer);
    saving = true;
    saveTimer = setTimeout(async () => {
      await supabase.from('notes').update({ content, updated_at: new Date().toISOString() }).eq('id', noteId);
      saving = false;
    }, 1000);
  }

  function onTitleChange(title: string) {
    localTitle = title;
    if (!currentNoteId) return;
    const noteId = currentNoteId;
    notes.update((ns) => ns.map((n) => n.id === noteId ? { ...n, title } : n));
    clearTimeout(saveTimer);
    saving = true;
    saveTimer = setTimeout(async () => {
      await supabase.from('notes').update({ title, updated_at: new Date().toISOString() }).eq('id', noteId);
      saving = false;
    }, 1000);
  }

  async function manualSave() {
    if (!currentNoteId) return;
    clearTimeout(saveTimer);
    saving = true;
    await supabase.from('notes').update({ 
      title: localTitle, 
      content: localContent, 
      updated_at: new Date().toISOString() 
    }).eq('id', currentNoteId);
    saving = false;
  }

  async function toggleFavorite(note: Note) {
    const is_favorite = !note.is_favorite;
    await supabase.from('notes').update({ is_favorite }).eq('id', note.id);
    notes.update((ns) => ns.map((n) => n.id === note.id ? { ...n, is_favorite } : n));
  }

  async function deleteNote(note: Note) {
    if (!confirm(`Hapus catatan "${note.title}"?`)) return;
    await supabase.from('notes').delete().eq('id', note.id);
    notes.update((ns) => ns.filter((n) => n.id !== note.id));
    if ($activeNoteId === note.id) {
      const remaining = $notes.filter((n) => n.id !== note.id);
      activeNoteId.set(remaining[0]?.id ?? null);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
</script>

<svelte:head><title>KanBoard — Catatan</title></svelte:head>

<div class="flex h-[calc(100vh-0px)] overflow-hidden">
  <!-- ── Notes Sidebar ── -->
  <div class="w-64 flex-shrink-0 flex flex-col border-r border-border bg-card">
    <!-- Header -->
    <div class="px-3 py-4 border-b border-border">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold text-sm flex items-center gap-1.5">
          <FileText size={15} class="text-foreground" /> Catatan
        </h2>
        <button id="btn-new-note" class="btn btn-icon btn-ghost" on:click={createNote} title="Catatan baru">
          <Plus size={15} />
        </button>
      </div>
      <!-- Search -->
      <div class="relative">
        <Search size={13} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          id="input-search-notes"
          bind:value={searchQuery}
          class="input pl-8 py-1.5 text-xs"
          placeholder="Cari catatan..."
        />
      </div>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto py-1">
      {#if loading}
        <div class="flex items-center justify-center py-8">
          <div class="anim-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      {:else if filteredNotes.length === 0}
        <div class="text-center py-8 px-4">
          <p class="text-xs text-muted-foreground">
            {searchQuery ? 'Tidak ada catatan cocok.' : 'Belum ada catatan.'}
          </p>
        </div>
      {:else}
        {#each filteredNotes as note (note.id)}
          <button
            id="btn-note-{note.id}"
            class="w-full text-left px-3 py-2.5 transition-all border-l-2 { $activeNoteId === note.id ? 'border-primary bg-muted/50' : 'border-transparent hover:bg-muted/30' }"
            on:click={() => activeNoteId.set(note.id)}
          >
            <div class="flex items-center justify-between gap-1 mb-0.5">
              <p class="text-sm font-medium truncate leading-tight">{note.title}</p>
              {#if note.is_favorite}
                <Star size={11} class="text-amber-400 flex-shrink-0" />
              {/if}
            </div>
            <p class="text-xs truncate text-muted-foreground">
              {note.content ? note.content.replace(/<[^>]+>/g, '').slice(0, 40) : 'Kosong'}
            </p>
            <p class="text-xs mt-1 text-muted-foreground opacity-60">{formatDate(note.updated_at)}</p>
          </button>
        {/each}
      {/if}
    </div>
  </div>

  <!-- ── Editor ── -->
  <div class="flex-1 flex flex-col overflow-hidden">
    {#if !$activeNote}
      <div class="flex items-center justify-center h-full flex-col gap-4">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center bg-secondary text-secondary-foreground">
          <FileText size={28} />
        </div>
        <div class="text-center">
          <h3 class="font-semibold mb-1">Pilih atau buat catatan</h3>
          <p class="text-sm text-muted-foreground">Catatan Anda tersimpan otomatis</p>
        </div>
        <button id="btn-new-note-empty" class="btn btn-primary" on:click={createNote}>
          <Plus size={15} /> Catatan Baru
        </button>
      </div>
    {:else}
      {@const note = $activeNote}
      <!-- Toolbar -->
      <div class="px-6 py-3 border-b border-border flex items-center justify-between bg-card">
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock size={12} />
          Tersimpan: {formatDate(note.updated_at)}
          {#if saving}<span class="text-primary ml-1">● Menyimpan...</span>{/if}
        </div>
        <div class="flex items-center gap-1">
          <button
            id="btn-favorite-{note.id}"
            class="btn btn-icon btn-ghost"
            on:click={() => toggleFavorite(note)}
            title={note.is_favorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
          >
            {#if note.is_favorite}
              <Star size={15} class="text-amber-400" />
            {:else}
              <StarOff size={15} />
            {/if}
          </button>
          <button
            id="btn-delete-note-{note.id}"
            class="btn btn-icon btn-ghost"
            on:click={() => deleteNote(note)}
            title="Hapus catatan"
          >
            <Trash2 size={15} class="text-destructive" />
          </button>
          <div class="w-px h-4 bg-border mx-1"></div>
          <button class="btn btn-sm btn-primary gap-1" on:click={manualSave} disabled={saving}>
            <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      <!-- Title & Toggle -->
      <div class="px-8 pt-6 pb-2">
        <div class="flex items-center justify-between gap-4 mb-4">
          <input
            id="input-note-title"
            class="flex-1 bg-transparent text-2xl font-bold outline-none placeholder:text-muted-foreground"
            placeholder="Judul catatan..."
            value={localTitle}
            on:input={(e) => onTitleChange((e.target as HTMLInputElement).value)}
          />
          <div class="flex bg-muted/50 p-1 rounded-lg">
            <button 
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors {editMode ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
              on:click={() => editMode = true}
            >
              <Edit3 size={13} /> Tulis
            </button>
            <button 
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors {!editMode ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
              on:click={() => editMode = false}
            >
              <Eye size={13} /> Pratinjau
            </button>
          </div>
        </div>
        <div class="h-px bg-border"></div>
      </div>

      <div class="flex-1 overflow-y-auto px-8 pb-8 pt-4">
        {#if editMode}
          <textarea
            id="textarea-note-content"
            class="w-full h-full bg-transparent outline-none resize-none text-sm leading-7 placeholder:text-muted-foreground text-foreground font-mono"
            placeholder="Tulis catatan di sini... Gunakan Markdown untuk memformat teks.

# Heading 1
## Heading 2

**Teks tebal**, *teks miring*, `kode`

- Item daftar 1
- Item daftar 2

> Kutipan teks"
            value={localContent}
            on:input={(e) => onContentChange((e.target as HTMLTextAreaElement).value)}
          ></textarea>
        {:else}
          <div class="prose prose-sm dark:prose-invert max-w-none">
            {@html localContent ? marked.parse(localContent) : '<p class="text-muted-foreground italic">Catatan kosong.</p>'}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
