-- Keep Ads & Marketing updated_at consistent with other vault asset tables.
CREATE TRIGGER ads_assets_set_updated_at
BEFORE UPDATE ON public.ads_assets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
