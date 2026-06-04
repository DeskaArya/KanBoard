# KanBoard

KanBoard is a visual project management application based on the Kanban board layout, built using SvelteKit and Supabase. This application allows users to create boards, columns, and task cards to visualize workflows efficiently, complete with support for priority levels, due dates, and notes integration.

## Key Features

- Kanban Board Management: Create and manage multiple project boards with dynamic gradient backgrounds.
- Custom Columns and Cards: Add workflow columns (such as Todo, In Progress, Done) and place task cards inside them.
- Advanced Task Details: Set priority levels (low, medium, high), add descriptions, include reference links, and set due dates.
- Integrated Notes System: Create Markdown-based notes and mark favorite notes for quick access.
- Authentication and Profile Management: Secure user registration and login managed via Supabase Auth, along with user role management (user/admin).

## Tech Stack

- Frontend Framework: SvelteKit (Svelte 5)
- Styling: Tailwind CSS
- Database & Auth: Supabase
- Icons: Lucide Svelte
- Markdown Parser: Marked

## Prerequisites

- Node.js version 18 or later
- Supabase account (for database and authentication)

## Setup Guide

### 1. Clone the Repository

```sh
git clone https://github.com/DeskaArya/KanBoard.git
cd KanBoard
```

### 2. Install Dependencies

```sh
npm install
```

### 3. Configure Environment Variables

Create a file named `.env` in the root directory of the project and add your Supabase credentials:

```env
PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

### 4. Database Schema (Supabase SQL)

Run the following SQL commands in your Supabase SQL Editor to create the necessary tables:

```sql
-- User Profiles Table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  role text check (role in ('user', 'admin')) default 'user' not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Boards Table
create table boards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  background_gradient text default 'from-blue-500 to-indigo-600' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Columns Table
create table columns (
  id uuid default gen_random_uuid() primary key,
  board_id uuid references boards(id) on delete cascade not null,
  title text not null,
  position integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cards Table
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

-- Notes Table
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

Make sure to enable Row Level Security (RLS) on Supabase or set appropriate access policies according to your application requirements to keep user data secure.

## Running the Project

### Development Mode

To run the local development server:

```sh
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

### Build for Production

To create a production build of the application:

```sh
npm run build
```

You can test the production build locally with the following command:

```sh
npm run preview
```
