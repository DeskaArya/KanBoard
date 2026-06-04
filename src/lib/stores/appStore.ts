import { writable, derived } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, Board, Note } from '$lib/supabase/supabaseClient';

// ─── Auth State ───────────────────────────────────────────────────────────────
export const session = writable<Session | null>(null);
export const user    = derived(session, ($s) => $s?.user ?? null) as import('svelte/store').Readable<User | null>;
export const profile = writable<Profile | null>(null);

// ─── UI State ─────────────────────────────────────────────────────────────────
export const sidebarOpen   = writable<boolean>(true);
export const loadingGlobal = writable<boolean>(false);

// ─── Boards Cache ─────────────────────────────────────────────────────────────
export const boards = writable<Board[]>([]);

// ─── Notes Cache ──────────────────────────────────────────────────────────────
export const notes          = writable<Note[]>([]);
export const activeNoteId   = writable<string | null>(null);
export const activeNote     = derived(
	[notes, activeNoteId],
	([$notes, $id]) => $notes.find((n) => n.id === $id) ?? null
);
