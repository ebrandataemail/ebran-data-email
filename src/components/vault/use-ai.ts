import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { asset } from "@/data/asset";
import { aiSecurityAudit } from "@/lib/assistant/assistant.functions";

export type SecurityAudit = Awaited<ReturnType<typeof aiSecurityAudit>>;

export function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "AI gagal merespons. Coba lagi.";
}

/** Shared AI security audit: the Security tab and the AI Insight rail read the same result. */
export function useAiAudit() {
  const auditFn = useServerFn(aiSecurityAudit);
  const query = useQuery({
    queryKey: ["ai", "audit", asset.id],
    queryFn: () => auditFn(),
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const run = async () => {
    const res = await query.refetch();
    if (res.error) {
      toast.error("Audit gagal", { description: errorMessage(res.error) });
      return undefined;
    }
    if (res.data) {
      toast.success(`Audit selesai — skor keamanan ${res.data.score}/100`, {
        description: res.data.headline,
      });
    }
    return res.data;
  };

  return { audit: query.data, running: query.isFetching, run };
}
