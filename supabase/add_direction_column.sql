-- =============================================
-- JALANKAN SQL INI DI SUPABASE SQL EDITOR
-- untuk menambahkan kolom direction ke tabel relays yang sudah ada
-- =============================================

-- Tambah kolom direction ke tabel relays (jika belum ada)
ALTER TABLE public.relays 
ADD COLUMN IF NOT EXISTS direction text DEFAULT 'FORWARD';

-- Update default relays dengan direction
UPDATE public.relays SET direction = 'FORWARD' WHERE direction IS NULL;
