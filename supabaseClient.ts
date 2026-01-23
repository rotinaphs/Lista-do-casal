
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rujmhqrxmvaodxichoqu.supabase.co';
const supabaseKey = 'sb_publishable_OVhAcson_qfWP0Rqt2T_Jw_xlRVNzb3';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * SQL PARA ADEQUAÇÃO DO BANCO NO SUPABASE
 * Execute o código abaixo no Editor SQL do seu painel Supabase:
 *
 * -- 1. Tabela de Perfis
 * create table if not exists public.profiles (
 *   id uuid references auth.users on delete cascade primary key,
 *   email text,
 *   theme jsonb default '{}'::jsonb,
 *   budget_levels jsonb default '[]'::jsonb,
 *   initial_savings numeric default 0
 * );
 *
 * -- 2. Tabela de Itens do Checklist
 * create table if not exists public.checklist_items (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references auth.users on delete cascade not null,
 *   title text not null,
 *   price numeric default 0,
 *   link text,
 *   status text default 'PENDING',
 *   progress numeric default 0,
 *   created_at bigint not null,
 *   image text,
 *   image_fit text default 'cover',
 *   image_scale numeric default 1,
 *   image_position_x numeric default 50,
 *   image_position_y numeric default 50
 * );
 *
 * -- 3. Bucket de Storage
 * insert into storage.buckets (id, name, public)
 * values ('couple_assets', 'couple_assets', true)
 * on conflict (id) do nothing;
 *
 * -- 4. Políticas RLS (Exemplo simplificado para Profiles)
 * alter table public.profiles enable row level security;
 * create policy "Perfis: Tudo por Usuário" on public.profiles for all using (auth.uid() = id);
 *
 * -- DICA: Se o erro "schema cache" persistir após rodar o SQL, 
 * -- reinicie o projeto no painel do Supabase ou aguarde alguns minutos.
 */
