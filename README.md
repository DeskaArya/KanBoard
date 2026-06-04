# KanBoard

KanBoard adalah aplikasi manajemen proyek visual berbasis papan Kanban yang dibangun menggunakan SvelteKit dan Supabase. Aplikasi ini memungkinkan pengguna untuk membuat papan, kolom, dan kartu tugas guna memvisualisasikan alur kerja secara teratur, lengkap dengan dukungan prioritas, tanggal jatuh tempo, dan integrasi catatan (notes).

## Fitur Utama

- Manajemen Papan Kanban: Membuat dan mengelola beberapa papan proyek dengan latar belakang gradien yang dinamis.
- Kolom dan Kartu Kustom: Menambahkan kolom alur kerja (seperti Todo, In Progress, Done) dan menaruh kartu tugas di dalamnya.
- Detail Tugas Lanjutan: Mengatur tingkat prioritas (low, medium, high), menambahkan deskripsi, menyertakan tautan referensi, serta menetapkan tanggal jatuh tempo.
- Sistem Catatan Terintegrasi: Membuat catatan berbasis Markdown dan menandai catatan favorit untuk akses cepat.
- Manajemen Autentikasi dan Profil: Pendaftaran dan login pengguna aman yang dikelola melalui Supabase Auth, serta pengaturan peran pengguna (user/admin).

## Teknologi yang Digunakan

- Frontend Framework: SvelteKit (Svelte 5)
- Styling: Tailwind CSS
- Database & Auth: Supabase
- Icons: Lucide Svelte
- Parser Markdown: Marked

## Persyaratan Sistem

- Node.js versi 18 atau lebih baru
- Akun Supabase (untuk database dan autentikasi)

## Langkah Setup

### 1. Klon Repositori

```sh
git clone https://github.com/DeskaArya/KanBoard.git
cd KanBoard
```

### 2. Instal Dependensi

```sh
npm install
```

### 3. Konfigurasi Variabel Lingkungan (Environment Variables)

Buat file bernama `.env` di direktori utama proyek dan tambahkan kredensial Supabase Anda:

```env
PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

### 4. Skema Database (Supabase SQL)

Jalankan perintah SQL berikut di SQL Editor Supabase Anda untuk membuat tabel-tabel yang diperlukan:

```sql
-- Tabel Profil Pengguna
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  role text check (role in ('user', 'admin')) default 'user' not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabel Board
create table boards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  background_gradient text default 'from-blue-500 to-indigo-600' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabel Column
create table columns (
  id uuid default gen_random_uuid() primary key,
  board_id uuid references boards(id) on delete cascade not null,
  title text not null,
  position integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabel Card
create table cards (
  id uuid default gen_random_uuid() primary key,
  column_id uuid references columns(id) on delete cascade not null,
  board_id uuid references boards(id) on delete cascade not null,
  title text not null,
  description text,
  position integer not null,
  priority text check (priority in ('low', 'medium', 'high')) default 'medium' not null,
  due_date timestamp with time zone,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabel Note
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  card_id uuid references cards(id) on delete set null,
  title text not null,
  content text,
  is_favorite boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

Pastikan juga untuk mengaktifkan Row Level Security (RLS) di Supabase atau mengatur kebijakan akses (policies) sesuai kebutuhan aplikasi Anda agar data pengguna aman.

## Menjalankan Proyek

### Mode Pengembangan (Development)

Untuk menjalankan server pengembangan lokal:

```sh
npm run dev
```

Buka browser Anda dan akses `http://localhost:5173`.

### Membangun untuk Produksi (Production Build)

Untuk membuat build produksi aplikasi:

```sh
npm run build
```

Anda dapat menguji hasil build produksi secara lokal dengan perintah:

```sh
npm run preview
```
