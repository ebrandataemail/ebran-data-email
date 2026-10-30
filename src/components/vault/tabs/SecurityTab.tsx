import { useEffect, useState } from "react";
import { CircleCheck, KeyRound, LoaderCircle, Mail, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { asset } from "@/data/asset";
import { cn } from "@/lib/utils";
import { CopyButton, FieldRow, Panel, SecretValue } from "../primitives";
import { useAiAudit } from "../use-ai";

const PERIOD = 30;

function randomCode() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

function CountdownRing({ remaining }: { remaining: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const urgent = remaining <= 5;
  return (
    <div className="relative flex size-11 items-center justify-center">
      <svg viewBox="0 0 36 36" className="size-11 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" className="stroke-border" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - remaining / PERIOD)}
          className={cn(
            "transition-[stroke-dashoffset] duration-1000 ease-linear",
            urgent ? "stroke-destructive" : "stroke-success",
          )}
        />
      </svg>
      <span
        className={cn(
          "absolute text-[11px] font-semibold tabular-nums",
          urgent ? "text-destructive" : "text-foreground",
        )}
      >
        {remaining}
      </span>
    </div>
  );
}

function LiveTotp() {
  const [code, setCode] = useState("452891");
  const [remaining, setRemaining] = useState(PERIOD);

  // Synced to the wall clock like a real authenticator, so switching tabs doesn't reset it.
  useEffect(() => {
    const tick = () => {
      const left = PERIOD - (Math.floor(Date.now() / 1000) % PERIOD);
      setRemaining((prev) => {
        if (left > prev) setCode(randomCode());
        return left;
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const formatted = `${code.slice(0, 3)} ${code.slice(3)}`;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-subtle px-4 py-3">
      <div className="flex flex-col">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-success-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-success" />
          Live
        </span>
        <span
          key={code}
          className={cn(
            "animate-in fade-in slide-in-from-bottom-1 font-mono text-3xl font-semibold tracking-[0.12em] tabular-nums duration-300",
            remaining <= 5 ? "text-destructive" : "text-foreground",
          )}
        >
          {formatted}
        </span>
      </div>
      <CountdownRing remaining={remaining} />
      <CopyButton value={code} label="Kode 2FA" />
    </div>
  );
}

export function SecurityTab() {
  const s = asset.security;
  const { audit: result, running: auditing, run: audit } = useAiAudit();

  return (
    <div className="space-y-6">
      <Panel title="Keamanan & Recovery" description="Two-factor authentication dan jalur pemulihan akun.">
        <div className="divide-y divide-border">
          <FieldRow icon={<Mail />} label="Email Pemulihan">
            <span>{s.recoveryEmail}</span>
            <CopyButton value={s.recoveryEmail} label="Email pemulihan" />
          </FieldRow>
          <FieldRow icon={<Smartphone />} label="App Authenticator">
            <span>{s.authenticator}</span>
          </FieldRow>
          <FieldRow icon={<ShieldCheck />} label="Live 2FA Code" hint="TOTP · 30 detik">
            <LiveTotp />
          </FieldRow>
          <FieldRow icon={<KeyRound />} label="TOTP Secret Key">
            <SecretValue value={s.totpSecret} label="TOTP secret" mask="*************" />
          </FieldRow>
        </div>
      </Panel>

      <Panel
        title="Backup Codes"
        description="Setiap kode hanya bisa dipakai sekali."
        action={
          <Button variant="outline" size="xs" onClick={() => navigator.clipboard?.writeText(s.backupCodes.join("\n")).then(() => toast.success("Backup codes disalin"))}>
            Salin semua
          </Button>
        }
      >
        <div className="p-5">
          <pre className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-border bg-muted px-5 py-4 font-mono text-sm text-foreground sm:grid-cols-4">
            {s.backupCodes.map((code, i) => (
              <code key={code} className="flex gap-3">
                <span className="select-none text-muted-foreground/70">{String(i + 1).padStart(2, "0")}</span>
                {code}
              </code>
            ))}
          </pre>
          <div className="mt-5 flex justify-end">
            <Button variant="ai-outline" onClick={audit} disabled={auditing}>
              {auditing ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
              {auditing ? "Menganalisis…" : "Run AI Security Audit"}
              {!auditing && <Sparkles className="text-ai" />}
            </Button>
          </div>
        </div>
      </Panel>

      {result && (
        <Panel
          title={`Hasil Audit AI · ${result.score}/100`}
          description={result.headline}
          className="border-ai/30"
        >
          <ul className="space-y-3 p-5">
            {result.recommendations.map((r) => (
              <li key={r} className="flex gap-3 text-sm text-foreground">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-ai" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
