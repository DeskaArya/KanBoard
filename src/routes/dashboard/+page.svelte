<script lang="ts">
  import { supabase } from "$lib/supabase/supabaseClient";
  import { boards, session, profile, notes } from "$lib/stores/appStore";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import {
    Plus,
    LayoutDashboard,
    Columns,
    Trash2,
    Calendar,
    StickyNote,
    AlertCircle,
    ArrowRight,
    Clock,
  } from "@lucide/svelte";
  import type { Board } from "$lib/supabase/supabaseClient";

  let showNewBoardModal = false;
  let newBoardTitle = "";
  let newBoardDesc = "";
  let newBoardGradient = "gradient-0";
  let creating = false;

  const gradients = [
    {
      id: "gradient-0",
      label: "Indigo",
      style: "linear-gradient(135deg, hsl(238,60%,25%), hsl(222,47%,10%))",
    },
    {
      id: "gradient-1",
      label: "Violet",
      style: "linear-gradient(135deg, hsl(270,60%,25%), hsl(238,47%,10%))",
    },
    {
      id: "gradient-2",
      label: "Teal",
      style: "linear-gradient(135deg, hsl(175,60%,20%), hsl(215,47%,10%))",
    },
    {
      id: "gradient-3",
      label: "Rose",
      style: "linear-gradient(135deg, hsl(340,60%,22%), hsl(222,47%,10%))",
    },
    {
      id: "gradient-4",
      label: "Amber",
      style: "linear-gradient(135deg, hsl(35,60%,22%), hsl(222,47%,10%))",
    },
  ];

  const gradientStyleMap: Record<string, string> = Object.fromEntries(
    gradients.map((g) => [g.id, g.style]),
  );

  let dueCards: any[] = [];

  async function fetchDueCards() {
    if (!$session) return;
    const boardIds = $boards.map((b) => b.id);
    if (boardIds.length === 0) {
      dueCards = [];
      return;
    }

    const { data: cardsData } = await supabase
      .from("cards")
      .select("*, columns!inner(title), boards!inner(title)")
      .in("board_id", boardIds)
      .not("due_date", "is", null);

    if (cardsData) {
      const today = new Date();
      // Set to end of day to include tasks due today
      today.setHours(23, 59, 59, 999);
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);

      dueCards = cardsData
        .filter((card) => {
          if (card.columns.title.toLowerCase() === "done") return false;
          const dueDate = new Date(card.due_date);
          return dueDate <= threeDaysFromNow;
        })
        .sort(
          (a, b) =>
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
        );
    }
  }

  $: if ($boards) {
    fetchDueCards();
  }

  async function createBoard() {
    if (!newBoardTitle.trim() || !$session) return;
    creating = true;
    const { data, error } = await supabase
      .from("boards")
      .insert({
        title: newBoardTitle.trim(),
        description: newBoardDesc.trim() || null,
        background_gradient: newBoardGradient,
        user_id: $session.user.id,
      })
      .select()
      .single();

    if (error) {
      alert("Error inserting board: " + error.message);
      console.error(error);
      creating = false;
      return;
    }

    if (data) {
      // Insert default columns
      const { error: colError } = await supabase.from("columns").insert([
        { board_id: data.id, title: "To-Do", position: 0 },
        { board_id: data.id, title: "Work In Progress", position: 1 },
        { board_id: data.id, title: "Review", position: 2 },
        { board_id: data.id, title: "Done", position: 3 },
      ]);

      if (colError) {
        alert("Error inserting columns: " + colError.message);
        console.error(colError);
      }

      boards.update((b) => [data, ...b]);
      showNewBoardModal = false;
      newBoardTitle = "";
      newBoardDesc = "";
      goto(`/dashboard/board/${data.id}`);
    }
    creating = false;
  }

  async function deleteBoard(board: Board) {
    if (
      !confirm(
        `Hapus board "${board.title}"? Semua kolom dan kartu akan ikut terhapus.`,
      )
    )
      return;
    await supabase.from("boards").delete().eq("id", board.id);
    boards.update((b) => b.filter((x) => x.id !== board.id));
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
</script>

<svelte:head><title>KanBoard — Dashboard</title></svelte:head>

<div class="p-6 max-w-7xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <LayoutDashboard size={22} class="text-foreground" />
        Dashboard
      </h1>
      <p class="text-sm mt-1 text-muted-foreground">
        Selamat datang, <span class="text-foreground font-medium"
          >{$profile?.full_name ?? $profile?.username ?? "..."}</span
        >
      </p>
    </div>
    <button
      id="btn-new-board"
      class="btn btn-primary"
      onclick={() => (showNewBoardModal = true)}
    >
      <Plus size={15} /> Board Baru
    </button>
  </div>

  <!-- Stats row -->
  <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
    <div class="card p-4 flex items-center gap-4">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10"
      >
        <Columns size={18} class="text-primary" />
      </div>
      <div>
        <p class="text-xl font-bold">{$boards.length}</p>
        <p class="text-xs text-muted-foreground">Total Boards</p>
      </div>
    </div>
    <div class="card p-4 flex items-center gap-4">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10"
      >
        <StickyNote size={18} class="text-primary" />
      </div>
      <div>
        <p class="text-xl font-bold">{$notes.length}</p>
        <p class="text-xs text-muted-foreground">Catatan</p>
      </div>
    </div>
    <div class="card p-4 flex items-center gap-4">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10"
      >
        <Calendar size={18} class="text-primary" />
      </div>
      <div>
        <p class="text-xl font-bold">{$boards.length}</p>
        <p class="text-xs text-muted-foreground">Aktif Hari Ini</p>
      </div>
    </div>
  </div>

  <!-- Deadline Notifications -->
  {#if dueCards.length > 0}
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-4">
        <AlertCircle size={16} class="text-destructive" />
        <h2 class="font-semibold">Perhatian: Mendekati Tenggat Waktu</h2>
        <span class="badge badge-destructive">{dueCards.length}</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each dueCards as card (card.id)}
          <a
            href="/dashboard/board/{card.board_id}"
            class="card p-4 hover:border-destructive transition-colors relative overflow-hidden group"
          >
            <div class="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-medium text-sm line-clamp-1">{card.title}</h3>
              <span class="badge badge-secondary whitespace-nowrap ml-2">
                {card.columns.title}
              </span>
            </div>
            <p class="text-xs text-muted-foreground mb-3 line-clamp-1">
              Board: {card.boards.title}
            </p>
            <div class="flex items-center justify-between text-xs font-medium text-destructive">
              <span class="flex items-center gap-1">
                <Clock size={12} />
                {formatDate(card.due_date)}
              </span>
              <span class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                Buka <ArrowRight size={12} />
              </span>
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Board Grid -->
  <div class="mb-4 flex items-center gap-2">
    <Columns size={16} class="text-foreground" />
    <h2 class="font-semibold">Boards Saya</h2>
    <span class="badge badge-secondary">{$boards.length}</span>
  </div>

  {#if $boards.length === 0}
    <div
      class="card p-12 text-center border-dashed border-2 bg-transparent shadow-none"
    >
      <div
        class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-secondary"
      >
        <Columns size={28} class="text-secondary-foreground" />
      </div>
      <h3 class="font-semibold mb-2">Belum ada board</h3>
      <p class="text-sm mb-4 text-muted-foreground">
        Buat board pertama Anda untuk mulai mengorganisir proyek.
      </p>
      <button
        id="btn-new-board-empty"
        class="btn btn-primary"
        onclick={() => (showNewBoardModal = true)}
      >
        <Plus size={15} /> Buat Board Baru
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each $boards as board (board.id)}
        <div
          class="card group relative overflow-hidden cursor-pointer hover:border-primary transition-colors"
          style="min-height: 140px;"
        >
          <div class="relative p-5 flex flex-col h-full">
            <div class="flex items-start justify-between mb-3">
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary text-secondary-foreground"
              >
                <Columns size={14} />
              </div>
              <button
                id="btn-delete-board-{board.id}"
                class="btn btn-icon btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
                onclick={(e) => { e.stopPropagation(); deleteBoard(board); }}
                title="Hapus board"
              >
                <Trash2 size={13} class="text-destructive" />
              </button>
            </div>
            <a href="/dashboard/board/{board.id}" class="flex-1 block">
              <h3 class="font-semibold text-base mb-1">{board.title}</h3>
              {#if board.description}
                <p class="text-xs line-clamp-2 text-muted-foreground">
                  {board.description}
                </p>
              {/if}
            </a>
            <p class="text-xs mt-3 text-muted-foreground">
              <Calendar size={11} class="inline mr-1" />{formatDate(
                board.created_at,
              )}
            </p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- ── New Board Modal ── -->
{#if showNewBoardModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
    onclick={(e) => { if (e.target === e.currentTarget) showNewBoardModal = false; }}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="card w-full max-w-md p-6 shadow-lg border">
      <h2 class="text-lg font-bold mb-5">Board Baru</h2>

      <form onsubmit={(e) => { e.preventDefault(); createBoard(); }} class="space-y-4">
        <div>
          <label for="input-board-title" class="block text-xs font-medium mb-1.5 text-muted-foreground"
            >Nama Board *</label
          >
          <!-- svelte-ignore a11y_autofocus -->
          <input
            id="input-board-title"
            bind:value={newBoardTitle}
            class="input"
            placeholder="Contoh: Website Redesign 2026"
            required
            autofocus
          />
        </div>

        <div>
          <label for="input-board-desc" class="block text-xs font-medium mb-1.5 text-muted-foreground"
            >Deskripsi</label
          >
          <textarea
            id="input-board-desc"
            bind:value={newBoardDesc}
            class="input"
            placeholder="Deskripsi singkat proyek..."
            rows={3}
          ></textarea>
        </div>

        <div class="flex gap-3 pt-2">
          <button
            id="btn-cancel-board"
            type="button"
            class="btn btn-secondary flex-1"
            onclick={() => (showNewBoardModal = false)}>Batal</button
          >
          <button
            id="btn-create-board"
            type="submit"
            class="btn btn-primary flex-1"
            disabled={creating}
          >
            {#if creating}<span
                class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block"
              ></span>{/if}
            Buat Board
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
