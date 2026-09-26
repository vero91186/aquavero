-- AquaTrack AI — niveau de peuplement détaillé (zones de nage, espèces solitaires)

alter table public.livestock
  add column if not exists swim_zone text not null default 'mid'
    check (swim_zone in ('top', 'mid', 'bottom'));

alter table public.livestock
  add column if not exists solitary boolean not null default false;

comment on column public.livestock.swim_zone is
  'Zone de nage principale de l''espèce : top (surface), mid (pleine eau) ou bottom (fond).';
comment on column public.livestock.solitary is
  'Vrai si l''espèce doit être maintenue seule (conflits entre individus de la même espèce).';
