-- Day roster function: Returns first names only per slot for a given date
-- This is SECURITY DEFINER to bypass RLS but only exposes first names (no IDs/phones)
create or replace function public.day_roster(d date)
returns table(slot text, first_name text)
language sql
security definer
set search_path = public
as $$
  select s.slot,
         nullif(split_part(coalesce(p.name, ''), ' ', 1), '') as first_name
  from public.shift_assignments sa
  join public.shifts s on s.id = sa.shift_id
  join public.profiles p on p.id = sa.user_id
  where s.shift_date = d
  order by s.slot, first_name nulls last;
$$;

grant execute on function public.day_roster(date) to anon, authenticated;

-- Seed shifts range function: Admin-only function to seed shifts for a date range
create or replace function public.seed_shifts_range(start_date date, end_date date, cap int default 2)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- admin gate
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admins can seed shifts.';
  end if;

  insert into public.shifts (shift_date, slot, start_time, end_time, capacity)
  select d::date, s.slot, s.start_t, s.end_t, cap
  from generate_series(start_date, end_date, interval '1 day') as g(d),
       (values
         ('AM'::text, time '09:00', time '12:00'),
         ('MID',      time '12:00', time '15:00'),
         ('PM',       time '15:00', time '17:00')
       ) as s(slot, start_t, end_t)
  on conflict (shift_date, slot) do nothing;
end;
$$;

revoke all on function public.seed_shifts_range(date, date, int) from anon;
grant execute on function public.seed_shifts_range(date, date, int) to authenticated;
