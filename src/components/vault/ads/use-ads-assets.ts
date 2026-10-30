import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adsListAssets } from "@/lib/ads/ads.functions";

export const ADS_ASSETS_KEY = ["ads", "assets"] as const;

export function useAdsAssets() {
  const listFn = useServerFn(adsListAssets);
  return useQuery({
    queryKey: ADS_ASSETS_KEY,
    queryFn: () => listFn(),
    staleTime: 60 * 1000,
  });
}
