<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabase/supabaseClient";
  import {
    session,
    profile,
    sidebarOpen,
    boards,
    notes,
  } from "$lib/stores/appStore";
  import { onMount } from "svelte";
  import {
    LayoutDashboard,
    Columns,
    StickyNote,
    Star,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Plus,
    Shield,
    Sun,
    Moon,
  } from "@lucide/svelte";

  // ── guard: wait for session hydration then redirect if not logged in ──
  onMount(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      goto("/login");
      return;
    }

    // ── fetch boards & notes on mount ──
    const { data } = await supabase
      .from("boards")
      .select("*")
      .order("created_at", { ascending: false });
    boards.set(data ?? []);

    const { data: noteData } = await supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false });
    notes.set(noteData ?? []);
  });

  async function signOut() {
    try {
      // Tunggu maksimal 1 detik untuk network request
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
    } finally {
      // Pastikan token dihapus secara paksa dari browser agar tidak nyangkut (mantul)
      localStorage.removeItem("sb-hhcxktotyvvdhriiguhe-auth-token");
      window.location.href = "/login";
    }
  }

  function toggleTheme() {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  }

  $: currentPath = $page.url.pathname;
  $: favoriteNotes = $notes.filter((n) => n.is_favorite);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/notes", label: "Catatan", icon: StickyNote },
  ];

  function isActive(href: string) {
    if (href === "/dashboard") {
      // Tetap aktif jika di halaman dashboard utama atau sedang membuka detail board
      return currentPath === "/dashboard" || currentPath.startsWith("/dashboard/board");
    }
    return currentPath.startsWith(href);
  }

  function removeFocus() {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }
</script>

<div class="flex h-screen overflow-hidden bg-background">
  <!-- ── Sidebar ── -->
  <aside
    class="flex flex-col transition-all duration-300 flex-shrink-0 h-full border-r border-border bg-card"
    style="width: {$sidebarOpen ? '240px' : '56px'};"
  >
    <!-- Logo -->
    <div
      class="flex items-center gap-3 px-3 py-4 border-b border-border"
      style="min-height: 57px;"
    >
      <div
        class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground font-bold text-sm flex-shrink-0"
      >
        K
      </div>
      {#if $sidebarOpen}
        <span class="font-bold text-base gradient-text whitespace-nowrap"
          >KanBoard</span
        >
      {/if}
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-1">
      {#each navItems as item}
        <a
          href={item.href}
          id="nav-{item.label.toLowerCase()}"
          onclick={removeFocus}
          class="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group {isActive(
            item.href,
          )
            ? 'bg-secondary text-secondary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
          title={!$sidebarOpen ? item.label : ""}
        >
          {#if item.href === "/dashboard"}
            <LayoutDashboard size={16} class="flex-shrink-0" />
          {:else}
            <StickyNote size={16} class="flex-shrink-0" />
          {/if}
          {#if $sidebarOpen}<span class="text-sm font-medium whitespace-nowrap"
              >{item.label}</span
            >{/if}
        </a>
      {/each}

      {#if $profile?.role === "admin"}
        <a
          href="/dashboard/admin"
          id="nav-admin"
          onclick={removeFocus}
          class="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group mt-2 border border-dashed {isActive(
            '/dashboard/admin',
          )
            ? 'bg-secondary text-secondary-foreground border-transparent'
            : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}"
          title={!$sidebarOpen ? "Admin Panel" : ""}
        >
          <Shield size={16} class="flex-shrink-0" />
          {#if $sidebarOpen}<span class="text-sm font-medium whitespace-nowrap"
              >Admin Panel</span
            >{/if}
        </a>
      {/if}

      <!-- Boards section -->
      {#if $sidebarOpen}
        <div class="pt-3">
          <div class="flex items-center justify-between px-3 mb-1">
            <span
              class="text-xs font-semibold uppercase tracking-widest"
              style="color: var(--text-muted);">Boards</span
            >
            <a
              href="/dashboard"
              id="btn-new-board-sidebar"
              class="btn btn-icon btn-ghost p-1"
              title="Board baru"
            >
              <Plus size={13} />
            </a>
          </div>
          {#each $boards.slice(0, 6) as board}
            <a
              href="/dashboard/board/{board.id}"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all {currentPath ===
              `/dashboard/board/${board.id}`
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
            >
              <Columns size={13} class="flex-shrink-0" />
              <span class="truncate">{board.title}</span>
            </a>
          {/each}
        </div>

        <!-- Favorites -->
        {#if favoriteNotes.length > 0}
          <div class="pt-3">
            <div class="px-3 mb-1">
              <span
                class="text-xs font-semibold uppercase tracking-widest"
                style="color: var(--text-muted);">Favorit</span
              >
            </div>
            {#each favoriteNotes.slice(0, 4) as note}
              <a
                href="/dashboard/notes"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Star size={12} class="flex-shrink-0" />
                <span class="truncate">{note.title}</span>
              </a>
            {/each}
          </div>
        {/if}
      {/if}
    </nav>

    <!-- Bottom: profile + collapse -->
    <div class="border-t border-border px-2 py-3 space-y-1">
      {#if $sidebarOpen && $profile}
        <div class="flex items-center gap-2 px-3 py-2">
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground"
          >
            {($profile.full_name ?? $profile.username)?.[0]?.toUpperCase() ??
              "U"}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium truncate">
              {$profile.full_name ?? $profile.username}
            </p>
            <p class="text-xs truncate text-muted-foreground">
              {$profile.username}
            </p>
          </div>
        </div>
      {/if}

      <button
        id="btn-signout"
        onclick={signOut}
        class="btn btn-ghost btn-sm w-full {$sidebarOpen
          ? 'justify-start'
          : 'justify-center'} gap-2"
        title="Keluar"
      >
        <LogOut size={14} />
        {#if $sidebarOpen}<span>Keluar</span>{/if}
      </button>

      <div class="flex gap-1">
        <button
          onclick={toggleTheme}
          class="btn btn-ghost btn-sm w-full flex-1 justify-center"
          title="Ubah Tema"
        >
          <Sun size={14} class="dark:hidden" />
          <Moon size={14} class="hidden dark:block" />
        </button>
        <button
          id="btn-toggle-sidebar"
          onclick={() => sidebarOpen.update((v) => !v)}
          class="btn btn-ghost btn-sm w-full flex-1 justify-center"
          title="Toggle sidebar"
        >
          {#if $sidebarOpen}<ChevronLeft size={14} />{:else}<ChevronRight
              size={14}
            />{/if}
        </button>
      </div>
    </div>
  </aside>

  <!-- ── Main Content ── -->
  <main class="flex-1 overflow-y-auto">
    <slot />
  </main>
</div>
