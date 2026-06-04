<script lang="ts">
  import { supabase } from "$lib/supabase/supabaseClient";
  import { goto } from "$app/navigation";

  let mode: "login" | "register" = $state("login");
  let email = $state("");
  let password = $state("");
  let fullName = $state("");
  let loading = $state(false);
  let errorMsg = $state("");
  let successMsg = $state("");
  let slowWarning = $state(false);
  let showPassword = $state(false);

  import { onMount } from "svelte";
  import { Eye, EyeOff } from "@lucide/svelte";
  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      goto("/dashboard");
    }
  });

  async function handleSubmit() {
    loading = true;
    slowWarning = false;
    errorMsg = "";
    successMsg = "";
    const slowTimer = setTimeout(() => {
      slowWarning = true;
    }, 3000);
    try {
      if (mode === "login") {
        const loginPromise = supabase.auth.signInWithPassword({
          email,
          password,
        });

        // Fallback: Jika promise nyangkut karena deadlock browser, tapi sesi sebenarnya sudah tersimpan,
        // kita paksa pindah halaman setelah mengecek localStorage secara berkala.
        const pollInterval = setInterval(() => {
          // sb-[project-id]-auth-token
          const token = localStorage.getItem(
            "sb-hhcxktotyvvdhriiguhe-auth-token",
          );
          if (token) {
            clearInterval(pollInterval);
            window.location.href = "/dashboard"; // Pindah secara hard-refresh
          }
        }, 1000);

        const { data, error } = await loginPromise;
        clearInterval(pollInterval);

        if (error) throw error;

        if (data?.session) {
          window.location.href = "/dashboard";
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        successMsg =
          "Akun berhasil dibuat! Silakan cek email untuk konfirmasi, lalu login.";
        mode = "login";
      }
    } catch (err: any) {
      errorMsg = err.message ?? "Terjadi kesalahan.";
    } finally {
      clearTimeout(slowTimer);
      loading = false;
      slowWarning = false;
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
</script>

<svelte:head>
  <title>KanBoard — {mode === "login" ? "Masuk" : "Daftar"}</title>
</svelte:head>

<div
  class="min-h-screen flex items-center justify-center p-4 bg-background relative"
>
  <!-- Tombol Tema -->
  <button
    onclick={toggleTheme}
    class="absolute top-4 right-4 p-2 rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    title="Ubah Tema"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="dark:hidden"
      ><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path
        d="M12 20v2"
      /><path d="m4.93 4.93 1.41 1.41" /><path
        d="m17.66 17.66 1.41 1.41"
      /><path d="M2 12h2" /><path d="M20 12h2" /><path
        d="m6.34 17.66-1.41 1.41"
      /><path d="m19.07 4.93-1.41 1.41" /></svg
    >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="hidden dark:block"
      ><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg
    >
  </button>

  <div class="relative w-full max-w-md anim-scale">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center gap-3 mb-4">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-primary-foreground font-bold text-lg"
        >
          K
        </div>
        <span class="text-2xl font-bold">KanBoard</span>
      </div>
      <p class="text-sm text-muted-foreground">
        {mode === "login" ? "Masuk ke akun Anda" : "Buat akun baru"}
      </p>
    </div>

    <!-- Card -->
    <div class="card p-8">
      <!-- Tab switcher -->
      <div
        class="flex gap-1 p-1 rounded-xl mb-6 bg-muted/50 border border-border"
      >
        <!-- svelte-ignore event_directive_deprecated -->
        <button
          id="tab-login"
          class="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 {mode ===
          'login'
            ? 'bg-primary text-primary-foreground shadow'
            : 'text-muted-foreground hover:bg-muted'}"
          onclick={() => {
            mode = "login";
            errorMsg = "";
            successMsg = "";
          }}>Masuk</button
        >
        <button
          id="tab-register"
          class="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 {mode ===
          'register'
            ? 'bg-primary text-primary-foreground shadow'
            : 'text-muted-foreground hover:bg-muted'}"
          onclick={() => {
            mode = "register";
            errorMsg = "";
            successMsg = "";
          }}>Daftar</button
        >
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
        {#if mode === "register"}
          <div>
            <label
              for="input-fullname"
              class="block text-xs font-medium mb-1.5 text-muted-foreground"
              >Nama Lengkap</label
            >
            <input
              id="input-fullname"
              bind:value={fullName}
              type="text"
              placeholder="John Doe"
              class="input"
              required
            />
          </div>
        {/if}

        <div>
          <label 
            for="input-email"
            class="block text-xs font-medium mb-1.5 text-muted-foreground"
            >Email</label
          >
          <input
            id="input-email"
            bind:value={email}
            type="email"
            placeholder="nama@email.com"
            class="input"
            required
          />
        </div>

        <div>
          <label 
            for="input-password"
            class="block text-xs font-medium mb-1.5 text-muted-foreground"
            >Password</label
          >
          <div class="relative">
            <input
              id="input-password"
              bind:value={password}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              class="input pr-10"
              required
              minlength={6}
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onclick={() => (showPassword = !showPassword)}
              title={showPassword ? "Sembunyikan password" : "Lihat password"}
            >
              {#if showPassword}
                <EyeOff size={18} />
              {:else}
                <Eye size={18} />
              {/if}
            </button>
          </div>
        </div>

        {#if errorMsg}
          <div
            class="text-sm rounded-lg px-4 py-3 bg-destructive/10 text-destructive border border-destructive/20"
          >
            {errorMsg}
          </div>
        {/if}

        {#if successMsg}
          <div
            class="text-sm rounded-lg px-4 py-3 bg-primary/10 text-primary border border-primary/20"
          >
            {successMsg}
          </div>
        {/if}

        <button
          id="btn-submit"
          type="submit"
          class="btn btn-primary w-full justify-center py-3 mt-2"
          disabled={loading}
        >
          {#if loading}
            <span
              class="anim-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block"
            ></span>
          {/if}
          {mode === "login" ? "Masuk" : "Buat Akun"}
        </button>
        {#if slowWarning}
          <p
            class="text-xs text-center text-muted-foreground mt-2 animate-pulse"
          >
            ⏳ Koneksi lambat, harap tunggu...
          </p>
        {/if}
      </form>
    </div>

    <p class="text-center text-xs mt-4 text-muted-foreground">
      Manajemen proyek & catatan dalam satu tempat ✨
    </p>
  </div>
</div>
