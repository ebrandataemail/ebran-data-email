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
import { AdsAsset, AdsAssetType } from "@/lib/ads/ads.server";
import { workspaceList } from "@/lib/projects/projects.functions";
import { errorMessage } from "../use-ai";
import { ADS_ASSETS_KEY } from "./use-ads-assets";

const PLATFORM_TYPES: { value: AdsAssetType; label: string }[] = [
  { value: "meta", label: "Meta Ads" },
  { value: "google", label: "Google Ads" },
  { value: "tiktok", label: "TikTok Ads" },
  { value: "youtube", label: "Youtube Ads" },
  { value: "other", label: "Lainnya" },
];

export function AdsAssetDialog({
  asset,
  open,
  onOpenChange,
}: {
  asset: AdsAsset | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const saveFn = useServerFn(adsSaveAsset);
  const queryClient = useQueryClient();
  const workspaceFn = useServerFn(workspaceList);
  const workspace = useQuery({
    queryKey: ["workspace", "projects-clients"],
    queryFn: () => workspaceFn(),
    staleTime: 30_000,
  });

  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<AdsAssetType>("meta");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(asset?.name ?? "");
    setPlatform(asset?.platform ?? "meta");
    setValue("");
    setDescription(asset?.description ?? "");
    setProjectId(asset?.projectId ?? "none");
  }, [open, asset]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveFn({
        data: {
          id: asset?.id ?? null,
          name,
          platform,
          value,
          description,
          projectId: projectId === "none" ? null : projectId,
          metadata: asset?.metadata ?? {},
        },
      });
      await queryClient.invalidateQueries({ queryKey: ADS_ASSETS_KEY });
      toast.success(asset ? "Aset diperbarui" : "Aset ditambahkan");
      onOpenChange(false);
    } catch (err) {
      toast.error("Gagal menyimpan", { description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit aset iklan" : "Tambah aset iklan"}</DialogTitle>
          <DialogDescription>Data sensitif disimpan dengan enkripsi AES-256.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Platform Iklan</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as AdsAssetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ads-name">Nama Label</Label>
              <Input
                id="ads-name"
                placeholder="mis. Akun Meta Budi"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ads-value">
              {asset ? "Nilai Baru (kosongkan jika tidak diganti)" : "Nilai Kredensial"}
            </Label>
            <Textarea
              id="ads-value"
              required={!asset}
              className="font-mono text-xs"
              placeholder="Masukkan API key, akses token, atau URL..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Hubungkan Proyek</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih proyek" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa Proyek</SelectItem>
                {workspace.data?.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ads-desc">Deskripsi / Catatan (opsional)</Label>
            <Input
              id="ads-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
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
