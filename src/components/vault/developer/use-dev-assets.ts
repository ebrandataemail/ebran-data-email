import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { devListAssets } from "@/lib/developer/developer.functions";

export const DEV_ASSETS_KEY = ["developer", "assets"] as const;

export function useDevAssets() {
  const listFn = useServerFn(devListAssets);
  return useQuery({
    queryKey: DEV_ASSETS_KEY,
    queryFn: () => listFn(),
    staleTime: 60 * 1000,
  });
}
