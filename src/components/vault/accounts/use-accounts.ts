import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { vaultListAccounts } from "@/lib/vault/vault.functions";

export const ACCOUNTS_KEY = ["vault", "accounts"] as const;

export type VaultAccount = Awaited<ReturnType<typeof vaultListAccounts>>[number];

export function useAccounts() {
  const listFn = useServerFn(vaultListAccounts);
  return useQuery({ queryKey: ACCOUNTS_KEY, queryFn: () => listFn(), staleTime: 60_000 });
}

export const STATUS_LABEL: Record<VaultAccount["lovableStatus"], string> = {
  has_project: "Ada proyek",
  empty: "Lovable kosong",
  not_registered: "Belum regis",
  unknown: "Belum dicek",
};

export const STATUS_VARIANT = {
  has_project: "success",
  empty: "warning",
  not_registered: "danger",
  unknown: "muted",
} as const;
