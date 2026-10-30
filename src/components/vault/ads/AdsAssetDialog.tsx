import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adsSaveAsset } from "@/lib/ads/ads.functions";
import type { AdsAsset, AdsPlatform, AdsEnvironment, AdsStatus } from "@/lib/ads/ads.server";
import { workspaceList } from "@/lib/projects/projects.functions";
import { errorMessage } from "../use-ai";
import { ADS_ASSETS_KEY } from "./use-ads-assets";
const PLATFORMS: { value: AdsPlatform; label: string }[] = [
  { value: "meta", label: "Meta Ads" },
  { value: "google", label: "Google Ads" },
  { value: "tiktok", label: "TikTok Ads" },
  { value: "youtube", label: "YouTube Ads" },
  { value: "other", label: "Lainnya" },
];
const ENVIRONMENTS: { value: AdsEnvironment; label: string }[] = [
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "local", label: "Local" },
  { value: "other", label: "Lainnya" },
];
const STATUSES: { value: AdsStatus; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak aktif" },
  { value: "expired", label: "Kedaluwarsa" },
  { value: "revoked", label: "Dicabut" },
  { value: "maintenance", label: "Maintenance" },
  { value: "draft", label: "Draft" },
];
export function AdsAssetDialog({
  asset,
  open,
  onOpenChange,
}: {
  asset: AdsAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const saveFn = useServerFn(adsSaveAsset);
  const queryClient = useQueryClient();
  const workspaceFn = useServerFn(workspaceList);
  const workspace = useQuery({
    queryKey: ["workspace", "projects-clients"],
    queryFn: () => workspaceFn(),
    staleTime: 30_000,
    enabled: open,
  });
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<AdsPlatform>("meta");
  const [value, setValue] = useState("");
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [environment, setEnvironment] = useState<AdsEnvironment>("production");
  const [status, setStatus] = useState<AdsStatus>("active");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName(asset?.name ?? "");
    setPlatform(asset?.platform ?? "meta");
    setValue("");
    setAccountIdentifier(asset?.accountIdentifier ?? "");
    setWebsiteUrl(asset?.websiteUrl ?? "");
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
          name,
          platform,
          value: value || null,
          accountIdentifier,
          websiteUrl,
          environment,
          status,
          expiresAt: expiresAt || null,
          description,
          projectId: projectId === "none" ? null : projectId,
          metadata: asset?.metadata ?? {},
        },
      });
      await queryClient.invalidateQueries({ queryKey: ADS_ASSETS_KEY });
      await queryClient.invalidateQueries({ queryKey: ["workspace", "projects-clients"] });
      toast.success(asset ? "Aset iklan diperbarui" : "Aset iklan ditambahkan");
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
          <DialogTitle>
            {asset ? "Edit Aset Ads & Marketing" : "Tambah Aset Ads & Marketing"}
          </DialogTitle>
          <DialogDescription>
            Kredensial dienkripsi sebelum disimpan. Nilai rahasia lama tidak pernah dimuat ke form
            edit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ads-platform">Platform</Label>
              <Select value={platform} onValueChange={(next) => setPlatform(next as AdsPlatform)}>
                <SelectTrigger id="ads-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ads-name">Nama Aset / Akun</Label>
              <Input
                id="ads-name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Meta Ads - Brand Utama"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ads-account-id">Account ID / Business ID</Label>
              <Input
                id="ads-account-id"
                value={accountIdentifier}
                onChange={(e) => setAccountIdentifier(e.target.value)}
                placeholder="ID akun iklan atau Business Manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ads-dashboard">URL Dashboard</Label>
              <Input
                id="ads-dashboard"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://business.facebook.com/"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ads-environment">Environment</Label>
              <Select
                value={environment}
                onValueChange={(next) => setEnvironment(next as AdsEnvironment)}
              >
                <SelectTrigger id="ads-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ads-status">Status</Label>
              <Select value={status} onValueChange={(next) => setStatus(next as AdsStatus)}>
                <SelectTrigger id="ads-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ads-expires">Tanggal Kedaluwarsa Token</Label>
              <Input
                id="ads-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ads-project">Hubungkan Proyek</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="ads-project">
                  <SelectValue placeholder="Pilih proyek" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa Proyek</SelectItem>
                  {workspace.data?.projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                      {project.clientName ? ` · ${project.clientName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ads-value">
              {asset ? "Token / API Key Baru (opsional)" : "Token / API Key / Kredensial"}
            </Label>
            <Textarea
              id="ads-value"
              required={!asset}
              maxLength={12000}
              className="min-h-24 font-mono text-xs"
              placeholder={
                asset
                  ? "Kosongkan untuk mempertahankan kredensial yang tersimpan."
                  : "Masukkan access token, API key, atau kredensial akun iklan."
              }
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ads-description">Catatan / Konteks Kampanye</Label>
            <Textarea
              id="ads-description"
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brand, tujuan campaign, pemilik akses, aturan penggunaan, atau catatan penting."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Batal
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy && <LoaderCircle className="mr-2 size-4 animate-spin" />}
              {asset ? "Simpan Perubahan" : "Tambah Aset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
