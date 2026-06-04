import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
	auth: { persistSession: true, autoRefreshToken: true }
});

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type Profile = {
	id: string;
	username: string;
	full_name: string | null;
	avatar_url: string | null;
	role: 'user' | 'admin';
	updated_at: string;
};

export type Board = {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	background_gradient: string;
	created_at: string;
};

export type Column = {
	id: string;
	board_id: string;
	title: string;
	position: number;
	created_at: string;
	cards?: Card[];
};

export type Card = {
	id: string;
	column_id: string;
	board_id: string;
	title: string;
	description: string | null;
	position: number;
	priority: 'low' | 'medium' | 'high';
	due_date: string | null;
	link: string | null;
	created_at: string;
};

export type Note = {
	id: string;
	user_id: string;
	card_id: string | null;
	title: string;
	content: string | null;
	is_favorite: boolean;
	created_at: string;
	updated_at: string;
};
