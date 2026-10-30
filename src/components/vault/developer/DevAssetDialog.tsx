import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { devSaveAsset } from "@/lib/developer/developer.functions";
import { workspaceList } from "@/lib/projects/projects.functions";
import { errorMessage } from "../use-ai";
import { DEV_ASSETS_KEY } from "./use-dev-assets";
import type { DevAsset } from "@/lib/developer/developer.server";
import {
  DEV_ASSET_TYPES,
  type DevAssetEnvironment,
  type DevAssetStatus,
  type DevAssetType,
} from "@/lib/developer/developer.types";

const TYPE_LABELS: Record<DevAssetType, string> = {
  api_key: "API Key / Token",
  webhook: "Webhook",
  env_var: "Environment Variable",
  ssh_key: "SSH Key",
  db_connection: "Database Connection",
  app_account: "Akun Aplikasi",
  website: "Website",
  domain: "Domain",
  hosting: "Hosting / Server",
  repository: "Repository / Git",
  package: "Package / Library",
  oauth_app: "OAuth App",
  cloud_service: "Cloud Service",
  ai_model: "AI Model / Provider",
  ai_agent: "AI Agent",
  robot: "Bot / Robot / RPA",
  automation: "Automation",
  other: "Lainnya",
};
const ENVIRONMENTS: { value: DevAssetEnvironment; label: string }[] = [
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "local", label: "Local" },
  { value: "other", label: "Lainnya" },
];
const STATUSES: { value: DevAssetStatus; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak Aktif" },
  { value: "expired", label: "Kedaluwarsa" },
  { value: "revoked", label: "Dicabut" },
  { value: "maintenance", label: "Maintenance" },
  { value: "draft", label: "Draft" },
];

export function DevAssetDialog({
  asset, open, onOpenChange,
}: {
  asset: DevAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const saveFn = useServerFn(devSaveAsset);
  const queryClient = useQueryClient();
  const workspaceFn = useServerFn(workspaceList);
  const workspace = useQuery({
    queryKey: ["workspace", "projects-clients"],
    queryFn: () => workspaceFn(),
    staleTime: 30_000,
    enabled: open,
  });

  const [name, setName] = useState("");
  const [type, setType] = useState<DevAssetType>("api_key");
  const [value, setValue] = useState("");
  const [provider, setProvider] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [environment, setEnvironment] = useState<DevAssetEnvironment>("production");
  const [status, setStatus] = useState<DevAssetStatus>("active");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(asset?.name ?? "");
    setType(asset?.type ?? "api_key");
    setValue("");
    setProvider(asset?.provider ?? "");
    setWebsiteUrl(asset?.websiteUrl ?? "");
    setUsername(asset?.username ?? "");
    setEnvironment(asset?.environment ?? "production");
    setStatus(asset?.status ?? "active");
    setExpiresAt(asset?.expiresAt ?? "");
    setDescription(asset?.description ?? "");
    setProjectId(asset?.projectId ?? "none");
  }, [open, asset]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await saveFn({
        data: {
          id: asset?.id ?? null,
          name, type, value: value || null, provider, websiteUrl, username,
          environment, status, expiresAt: expiresAt || null, description,
          projectId: projectId === "none" ? null : projectId,
          metadata: asset?.metadata ?? {},
        },
      });
      await queryClient.invalidateQueries({ queryKey: DEV_ASSETS_KEY });
      toast.success(asset ? "Aset diperbarui" : "Aset ditambahkan");
      onOpenChange(false);
    } catch (error) {
      toast.error("Gagal menyimpan aset", { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Aset Developer" : "Tambah Aset Developer"}</DialogTitle>
          <DialogDescription>
            Kredensial dienkripsi sebelum disimpan. Nilai rahasia tidak ditampilkan saat mengedit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dev-type">Kategori Aset</Label>
              <Select value={type} onValueChange={(next) => setType(next as DevAssetType)}>
                <SelectTrigger id="dev-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEV_ASSET_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>{TYPE_LABELS[item]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-name">Nama Aset</Label>
              <Input id="dev-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: GitHub Production Token" maxLength={120} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-provider">Provider / Platform</Label>
              <Input id="dev-provider" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="GitHub, Vercel, OpenRouter, n8n…" maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-username">Username / Account ID</Label>
              <Input id="dev-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Email, username, project ID…" maxLength={200} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dev-website">URL Dashboard / Website</Label>
              <Input id="dev-website" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dev-value">{asset ? "Secret / Credential Baru (opsional)" : "Secret / Credential"}</Label>
            <Textarea id="dev-value" value={value} onChange={(e) => setValue(e.target.value)} required={!asset} rows={3} className="font-mono text-xs" autoComplete="off" placeholder={asset ? "Kosongkan jika tidak ingin mengganti secret tersimpan…" : "Masukkan API key, token, password, connection string, atau secret…"} />
            <p className="text-xs text-muted-foreground">Contoh: API key, access token, password, private key, webhook secret, atau database URL.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Select value={environment} onValueChange={(next) => setEnvironment(next as DevAssetEnvironment)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENVIRONMENTS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(next) => setStatus(next as DevAssetStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-expiry">Tanggal Kedaluwarsa</Label>
              <Input id="dev-expiry" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Hubungkan ke Proyek</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Pilih proyek" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Belum ditetapkan</SelectItem>
                {workspace.data?.projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}{project.clientName ? ` · ${project.clientName}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Client mengikuti relasi proyek yang dipilih.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dev-description">Deskripsi / Catatan Teknis</Label>
            <Textarea id="dev-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="Fungsi aset, scope akses, dokumentasi, cara rotasi, catatan penggunaan…" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Batal</Button>
            <Button type="submit" disabled={busy}>
              {busy && <LoaderCircle className="mr-2 size-4 animate-spin" />}
              {asset ? "Simpan Perubahan" : "Tambah Aset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
