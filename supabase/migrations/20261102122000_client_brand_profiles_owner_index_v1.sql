create index if not exists client_brand_profiles_client_owner_idx
  on public.client_brand_profiles(client_id,user_id);