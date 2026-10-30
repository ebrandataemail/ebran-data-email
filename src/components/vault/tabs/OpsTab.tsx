import { Activity, CalendarDays, CreditCard, Globe, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { asset } from "@/data/asset";
import { StatusDot } from "../primitives";

function OpsCard({
  icon,
  label,
  children,
  footer,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-subtle text-muted-foreground transition-colors group-hover:text-foreground [&_svg]:size-4">
          {icon}
        </span>
      </div>
      <div className="mt-3 text-lg font-semibold tracking-tight text-foreground">{children}</div>
      {footer && <div className="mt-1.5 text-xs text-muted-foreground">{footer}</div>}
    </div>
  );
}

export function OpsTab() {
  const o = asset.ops;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <OpsCard icon={<Activity />} label="Status Akun" footer="Login terakhir 3 jam lalu">
        <Badge variant="success" className="px-3 py-1 text-sm">
          <StatusDot />
          {o.status}
        </Badge>
      </OpsCard>
      <OpsCard
        icon={<Globe />}
        label="IP / Proxy"
        footer={
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {o.proxyRegion}
          </span>
        }
      >
        <span className="font-mono">{o.proxy}</span>
      </OpsCard>
      <OpsCard icon={<CreditCard />} label="Billing Tag" footer="Ditagih bulanan · Meta Ads">
        {o.billing}
      </OpsCard>
      <OpsCard icon={<CalendarDays />} label="Creation Date" footer="Umur akun 2 tahun">
        {o.createdAt}
      </OpsCard>
    </div>
  );
}
