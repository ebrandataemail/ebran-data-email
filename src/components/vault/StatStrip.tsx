import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Ringkasan angka: SATU card dengan pemisah garis, bukan deretan card identik.
 * Angka hanya diberi warna peringatan bila `attention` dan nilainya > 0.
 * Dipakai bersama oleh halaman Proyek dan Workboard.
 */
export function StatStrip({
  items,
  className,
}: {
  items: { icon: ReactNode; value: number | string; label: string; attention?: boolean }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex divide-x divide-border overflow-x-auto rounded-xl border border-border bg-card shadow-soft",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-[160px] flex-1 items-center gap-3 px-4 py-3.5"
        >
          <span className="text-muted-foreground [&_svg]:size-4">{item.icon}</span>
          <div>
            <p
              className={cn(
                "text-xl font-semibold leading-none tabular-nums text-foreground",
                item.attention &&
                  typeof item.value === "number" &&
                  item.value > 0 &&
                  "text-warning-foreground",
              )}
            >
              {item.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
