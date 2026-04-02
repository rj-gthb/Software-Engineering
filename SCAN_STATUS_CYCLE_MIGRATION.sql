alter table public.parcels drop constraint if exists parcels_status_check;

alter table public.parcels
add constraint parcels_status_check
check (status in ('Pending', 'Outbound', 'Cancelled', 'Returned', 'Double Waybill'));
