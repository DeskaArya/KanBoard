<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabase/supabaseClient';
  import { session } from '$lib/stores/appStore';
  import type { Board, Column, Card } from '$lib/supabase/supabaseClient';
  import { Plus, Pencil, Trash2, GripVertical, X, Check, AlertCircle, Clock, ArrowRight, Link, Calendar } from '@lucide/svelte';

  // ─── State ───────────────────────────────────────────────────────────────────
  let board: Board | null     = null;
  let columns: Column[]       = [];
  let loading                 = true;
  let error                   = '';

  // Column editing
  let addingColumn            = false;
  let newColTitle             = '';
  let editingColId: string | null = null;
  let editingColTitle         = '';

  // Card state
  let addingCardColId: string | null = null;
  let newCardTitle            = '';
  let selectedCard: Card | null = null;
  let editCardTitle           = '';
  let editCardDesc            = '';
  let editCardPriority: 'low' | 'medium' | 'high' = 'medium';
  let editCardDue             = '';
  let editCardLink            = '';

  // DnD
  let draggingCard: Card | null     = null;
  let draggingOverColId: string | null = null;

  const boardId = $page.params.id;

  // ─── Data Loading ─────────────────────────────────────────────────────────────
  onMount(async () => {
    await loadBoard();
    setupRealtime();
  });

  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
  onDestroy(() => { realtimeChannel?.unsubscribe(); });

  async function loadBoard() {
    loading = true; error = '';
    const [{ data: b }, { data: cols }, { data: cards }] = await Promise.all([
      supabase.from('boards').select('*').eq('id', boardId).single(),
      supabase.from('columns').select('*').eq('board_id', boardId).order('position'),
      supabase.from('cards').select('*').eq('board_id', boardId).order('position'),
    ]);

    if (!b) { error = 'Board tidak ditemukan.'; loading = false; return; }
    board = b;

    columns = (cols ?? []).map((col) => ({
      ...col,
      cards: (cards ?? []).filter((c) => c.column_id === col.id),
    }));
    loading = false;
  }

  function setupRealtime() {
    realtimeChannel = supabase.channel(`board-${boardId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` }, loadBoard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns', filter: `board_id=eq.${boardId}` }, loadBoard)
      .subscribe();
  }

  // ─── Column CRUD ──────────────────────────────────────────────────────────────
  async function addColumn() {
    if (!newColTitle.trim()) return;
    const position = columns.length;
    const { data } = await supabase.from('columns').insert({ board_id: boardId, title: newColTitle.trim(), position }).select().single();
    if (data) { columns = [...columns, { ...data, cards: [] }]; }
    newColTitle = ''; addingColumn = false;
  }

  async function saveColTitle(col: Column) {
    if (!editingColTitle.trim()) return;
    await supabase.from('columns').update({ title: editingColTitle.trim() }).eq('id', col.id);
    columns = columns.map((c) => c.id === col.id ? { ...c, title: editingColTitle.trim() } : c);
    editingColId = null;
  }

  async function deleteColumn(col: Column) {
    if (!confirm(`Hapus kolom "${col.title}"? Semua kartu di dalamnya akan ikut terhapus.`)) return;
    await supabase.from('columns').delete().eq('id', col.id);
    columns = columns.filter((c) => c.id !== col.id);
  }

  // ─── Card CRUD ────────────────────────────────────────────────────────────────
  async function addCard(colId: string) {
    if (!newCardTitle.trim()) return;
    const col = columns.find((c) => c.id === colId);
    const position = col?.cards?.length ?? 0;
    const { data } = await supabase.from('cards').insert({
      column_id: colId, board_id: boardId,
      title: newCardTitle.trim(), position, priority: 'medium'
    }).select().single();
    if (data) {
      columns = columns.map((c) => c.id === colId ? { ...c, cards: [...(c.cards ?? []), data] } : c);
    }
    newCardTitle = ''; addingCardColId = null;
  }

  async function saveCard() {
    if (!selectedCard) return;
    const updates = { title: editCardTitle, description: editCardDesc || null, priority: editCardPriority, due_date: editCardDue || null, link: editCardLink || null };
    await supabase.from('cards').update(updates).eq('id', selectedCard.id);
    columns = columns.map((col) => ({
      ...col,
      cards: (col.cards ?? []).map((c) => c.id === selectedCard!.id ? { ...c, ...updates } : c),
    }));
    selectedCard = null;
  }

  async function deleteCard(card: Card) {
    await supabase.from('cards').delete().eq('id', card.id);
    columns = columns.map((col) => ({
      ...col,
      cards: (col.cards ?? []).filter((c) => c.id !== card.id),
    }));
    selectedCard = null;
  }

  function openCard(card: Card) {
    selectedCard = card;
    editCardTitle    = card.title;
    editCardDesc     = card.description ?? '';
    editCardPriority = card.priority;
    editCardDue      = card.due_date ?? '';
    editCardLink     = card.link ?? '';
  }

  // ─── Drag & Drop ─────────────────────────────────────────────────────────────
  function onDragStart(card: Card) { draggingCard = card; }
  function onDragOver(e: DragEvent, colId: string) { e.preventDefault(); draggingOverColId = colId; }
  function onDragLeave() { draggingOverColId = null; }

  async function onDrop(targetColId: string) {
    if (!draggingCard || draggingCard.column_id === targetColId) { draggingOverColId = null; return; }
    const targetCol   = columns.find((c) => c.id === targetColId);
    const newPosition = targetCol?.cards?.length ?? 0;

    // Optimistic update
    columns = columns.map((col) => {
      if (col.id === draggingCard!.column_id) return { ...col, cards: (col.cards ?? []).filter((c) => c.id !== draggingCard!.id) };
      if (col.id === targetColId)            return { ...col, cards: [...(col.cards ?? []), { ...draggingCard!, column_id: targetColId, position: newPosition }] };
      return col;
    });

    await supabase.from('cards').update({ column_id: targetColId, position: newPosition }).eq('id', draggingCard!.id);
    draggingCard = null; draggingOverColId = null;
  }

  async function onDropCard(e: DragEvent, targetCard: Card) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingCard || draggingCard.id === targetCard.id) { draggingOverColId = null; return; }
    
    const sourceCol = columns.find((c) => c.id === draggingCard!.column_id);
    const targetCol = columns.find((c) => c.id === targetCard.column_id);
    if (!sourceCol || !targetCol) return;

    let newSourceCards = [...(sourceCol.cards ?? [])];
    let newTargetCards = sourceCol.id === targetCol.id ? newSourceCards : [...(targetCol.cards ?? [])];
    
    const dragIdx = newSourceCards.findIndex((c) => c.id === draggingCard!.id);
    newSourceCards.splice(dragIdx, 1);
    
    const targetIdx = newTargetCards.findIndex((c) => c.id === targetCard.id);
    const insertIdx = targetIdx;
    
    const movedCard = { ...draggingCard!, column_id: targetCol.id };
    newTargetCards.splice(insertIdx, 0, movedCard);
    
    newTargetCards.forEach((c, i) => c.position = i);
    
    columns = columns.map((col) => {
      if (col.id === sourceCol.id) return { ...col, cards: newSourceCards };
      if (col.id === targetCol.id) return { ...col, cards: newTargetCards };
      return col;
    });

    const updates = newTargetCards.map((c) => supabase.from('cards').update({ column_id: c.column_id, position: c.position }).eq('id', c.id));
    await Promise.all(updates);

    draggingCard = null; draggingOverColId = null;
  }

  async function advanceCard(card: Card) {
    const colIndex = columns.findIndex((c) => c.id === card.column_id);
    if (colIndex === -1 || colIndex === columns.length - 1) return;
    
    const targetCol = columns[colIndex + 1];
    const newPosition = targetCol?.cards?.length ?? 0;

    // Optimistic update
    columns = columns.map((col) => {
      if (col.id === card.column_id) return { ...col, cards: (col.cards ?? []).filter((c) => c.id !== card.id) };
      if (col.id === targetCol.id) return { ...col, cards: [...(col.cards ?? []), { ...card, column_id: targetCol.id, position: newPosition }] };
      return col;
    });

    await supabase.from('cards').update({ column_id: targetCol.id, position: newPosition }).eq('id', card.id);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function formatDate(d: string | null) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  function isDueOverdue(d: string | null) {
    if (!d) return false;
    return new Date(d) < new Date();
  }
</script>

<svelte:head><title>KanBoard — {board?.title ?? 'Board'}</title></svelte:head>

{#if loading}
  <div class="flex items-center justify-center h-full">
    <div class="anim-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
  </div>
{:else if error}
  <div class="flex items-center justify-center h-full">
    <div class="text-center">
      <AlertCircle size={40} class="text-destructive mx-auto mb-3" />
      <p class="text-sm text-muted-foreground">{error}</p>
    </div>
  </div>
{:else}
  <!-- Board Header -->
  <div class="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur">
    <div>
      <h1 class="font-bold text-lg">{board?.title}</h1>
      {#if board?.description}<p class="text-xs mt-0.5 text-muted-foreground">{board.description}</p>{/if}
    </div>
    <button id="btn-add-column" class="btn btn-secondary btn-sm" onclick={() => addingColumn = true}>
      <Plus size={13} /> Kolom
    </button>
  </div>

  <!-- Kanban Columns -->
  <div class="flex gap-4 p-6 overflow-x-auto h-[calc(100vh-73px)] items-start">
    {#each columns as col (col.id)}
      <div
        class="flex-shrink-0 w-72 rounded-xl flex flex-col bg-muted/50 border border-border h-fit max-h-full"
        class:drag-over={draggingOverColId === col.id}
        ondragover={(e) => onDragOver(e, col.id)}
        ondragleave={onDragLeave}
        ondrop={() => onDrop(col.id)}
        role="region"
        aria-label="Kolom {col.title}"
      >
        <!-- Column Header -->
        <div class="flex items-center justify-between px-3 py-2.5">
          {#if editingColId === col.id}
            <!-- svelte-ignore a11y_autofocus -->
            <input
              bind:value={editingColTitle}
              class="input py-1 text-sm flex-1 mr-2"
              autofocus
              onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && saveColTitle(col)}
            />
            <button class="btn btn-icon btn-ghost" onclick={() => saveColTitle(col)}><Check size={13} /></button>
            <button class="btn btn-icon btn-ghost" onclick={() => editingColId = null}><X size={13} /></button>
          {:else}
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="font-semibold text-sm truncate">{col.title}</span>
              <span class="text-xs rounded-full px-1.5 py-0.5 font-medium bg-secondary text-muted-foreground">
                {col.cards?.length ?? 0}
              </span>
            </div>
            <div class="flex items-center gap-0.5">
              <button id="btn-edit-col-{col.id}" class="btn btn-icon btn-ghost" onclick={() => { editingColId = col.id; editingColTitle = col.title; }} title="Ubah nama"><Pencil size={12} /></button>
              <button id="btn-delete-col-{col.id}" class="btn btn-icon btn-ghost" onclick={() => deleteColumn(col)} title="Hapus kolom"><Trash2 size={12} class="text-destructive" /></button>
            </div>
          {/if}
        </div>

        <!-- Cards -->
        <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
          {#each col.cards ?? [] as card (card.id)}
            <div
              class="card p-3 cursor-pointer hover:border-primary transition-colors"
              draggable="true"
              ondragstart={() => onDragStart(card)}
              ondragover={(e) => { e.preventDefault(); e.stopPropagation(); }}
              ondrop={(e) => onDropCard(e, card)}
              onclick={() => openCard(card)}
              role="button"
              tabindex="0"
              aria-label="Kartu: {card.title}"
              onkeydown={(e) => e.key === 'Enter' && openCard(card)}
            >
              <p class="text-sm font-medium leading-snug mb-2">{card.title}</p>
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2">
                  <span class="badge badge-secondary">{card.priority}</span>
                  {#if card.due_date}
                    <span class="text-xs flex items-center gap-1 {isDueOverdue(card.due_date) ? 'text-destructive' : 'text-muted-foreground'}">
                      <Clock size={10} />{formatDate(card.due_date)}
                    </span>
                  {/if}
                  {#if card.link}
                    <a href={card.link} target="_blank" rel="noopener noreferrer" class="text-xs flex items-center gap-1 text-primary hover:underline" onclick={(e) => e.stopPropagation()} title="Buka tautan">
                      <Link size={10} />
                    </a>
                  {/if}
                </div>
                {#if columns.findIndex((c) => c.id === col.id) < columns.length - 1}
                  <button
                    class="btn btn-icon btn-ghost btn-sm text-primary hover:bg-primary/10 ml-auto"
                    onclick={(e) => { e.stopPropagation(); advanceCard(card); }}
                    title="Pindah ke tahap selanjutnya"
                  >
                    <ArrowRight size={14} />
                  </button>
                {/if}
              </div>
            </div>
          {/each}

          <!-- Add Card inline -->
          {#if addingCardColId === col.id}
            <div class="card p-2 shadow-none border-dashed border-2">
              <!-- svelte-ignore a11y_autofocus -->
              <input
                bind:value={newCardTitle}
                class="input py-1.5 text-sm mb-2"
                placeholder="Judul kartu..."
                autofocus
                onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && addCard(col.id)}
              />
              <div class="flex gap-1.5">
                <button id="btn-save-card-{col.id}" class="btn btn-primary btn-sm flex-1" onclick={() => addCard(col.id)}>Tambah</button>
                <button class="btn btn-ghost btn-sm" onclick={() => { addingCardColId = null; newCardTitle = ''; }}><X size={13} /></button>
              </div>
            </div>
          {/if}
        </div>

        <div class="px-2 pb-2">
          <button
            id="btn-add-card-{col.id}"
            class="btn btn-ghost btn-sm w-full justify-start gap-2 text-muted-foreground"
            onclick={() => { addingCardColId = col.id; newCardTitle = ''; }}
          >
            <Plus size={13} /> Tambah kartu
          </button>
        </div>
      </div>
    {/each}

    <!-- Add Column inline -->
    {#if addingColumn}
      <div class="flex-shrink-0 w-72 rounded-xl p-3 bg-muted border border-border">
        <!-- svelte-ignore a11y_autofocus -->
        <input
          bind:value={newColTitle}
          class="input py-2 text-sm mb-2"
          placeholder="Nama kolom..."
          autofocus
          onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && addColumn()}
        />
        <div class="flex gap-2">
          <button id="btn-confirm-col" class="btn btn-primary btn-sm flex-1" onclick={addColumn}>Tambah</button>
          <button class="btn btn-ghost btn-sm" onclick={() => { addingColumn = false; newColTitle = ''; }}><X size={13} /></button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<!-- ── Card Detail Modal ── -->
{#if selectedCard}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onclick={(e) => { if (e.target === e.currentTarget) selectedCard = null; }} role="dialog" aria-modal="true" tabindex="-1">
    <div class="card w-full max-w-lg p-6 shadow-lg border">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-bold text-base">Detail Kartu</h2>
        <button class="btn btn-icon btn-ghost" onclick={() => selectedCard = null}><X size={16} /></button>
      </div>

      <div class="space-y-4">
        <div>
          <label for="input-card-title" class="block text-xs font-medium mb-1.5 text-muted-foreground">Judul</label>
          <input id="input-card-title" bind:value={editCardTitle} class="input" />
        </div>
        <div>
          <label for="input-card-desc" class="block text-xs font-medium mb-1.5 text-muted-foreground">Deskripsi</label>
          <textarea id="input-card-desc" bind:value={editCardDesc} class="input" rows={4} placeholder="Tulis deskripsi..."></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="select-card-priority" class="block text-xs font-medium mb-1.5 text-muted-foreground">Prioritas</label>
            <select id="select-card-priority" bind:value={editCardPriority} class="input">
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
            </select>
          </div>
          <div>
            <label for="input-card-due" class="block text-xs font-medium mb-1.5 text-muted-foreground">Tenggat Waktu</label>
            <div class="relative flex items-center">
              <button 
                class="absolute left-2.5 text-muted-foreground hover:text-foreground z-10 p-1"
                onclick={(e) => { e.preventDefault(); e.stopPropagation(); (document.getElementById('input-card-due') as HTMLInputElement)?.showPicker(); }}
                title="Buka Kalender"
                type="button"
              >
                <Calendar size={14} />
              </button>
              <input id="input-card-due" bind:value={editCardDue} type="date" class="input pl-9 w-full" onclick={(e) => e.stopPropagation()} />
            </div>
          </div>
        </div>
        <div>
          <label for="input-card-link" class="block text-xs font-medium mb-1.5 text-muted-foreground">Tautan Eksternal (opsional)</label>
          <input id="input-card-link" bind:value={editCardLink} type="url" class="input" placeholder="https://..." />
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button id="btn-delete-card" class="btn text-destructive hover:bg-destructive/10 btn-sm" onclick={() => deleteCard(selectedCard!)}>
          <Trash2 size={13} class="mr-1" /> Hapus
        </button>
        <div class="flex-1"></div>
        <button id="btn-cancel-card" class="btn btn-secondary" onclick={() => selectedCard = null}>Batal</button>
        <button id="btn-save-card" class="btn btn-primary" onclick={saveCard}>Simpan</button>
      </div>
    </div>
  </div>
{/if}
