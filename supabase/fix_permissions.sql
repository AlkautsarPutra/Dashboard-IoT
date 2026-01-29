-- RUN THIS IN SUPABASE SQL EDITOR TO FIX PERMISSIONS

-- 1. Enable RLS on tables (good practice, but we need policies)
alter table public.relays enable row level security;
alter table public.readings enable row level security;
alter table public.logs enable row level security;

-- 2. Create Policies for Anonymous Access (For Prototype Only)
-- Allow anyone to READ relays
create policy "Allow Anon Read Relays" on public.relays for select using (true);

-- Allow anyone to UPDATE relays (Controls)
create policy "Allow Anon Update Relays" on public.relays for update using (true);

-- Allow anyone to INSERT readings (ESP32)
create policy "Allow Anon Insert Readings" on public.readings for insert with check (true);
create policy "Allow Anon Read Readings" on public.readings for select using (true);

-- Allow anyone to INSERT/READ logs
create policy "Allow Anon Insert Logs" on public.logs for insert with check (true);
create policy "Allow Anon Read Logs" on public.logs for select using (true);

-- 3. Ensure Rows Exist
insert into public.relays (name, type, device_id)
select 'Auger Feeder', 'FEEDER', 'esp32_01'
where not exists (select 1 from public.relays where type = 'FEEDER');

insert into public.relays (name, type, device_id)
select 'Waste Conveyor', 'CLEANER', 'esp32_01'
where not exists (select 1 from public.relays where type = 'CLEANER');
