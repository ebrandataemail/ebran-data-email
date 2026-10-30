import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Sparkles } from "lucide-react";
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
import { devSaveAsset } from "@/lib/developer/developer.functions";
import { workspaceList } from "@/lib/projects/projects.functions";
import { errorMessage } from "../use-ai";
import { DEV_ASSETS_KEY } from "./use-dev-assets";
import { DevAsset, DevAssetType } from "@/lib/developer/developer.server";

const ASSET_TYPES: { value: DevAssetType; label: string }[] = [
  { value: "api_key", label: "API Key / Token" },
  { value: "webhook", label: "Webhook URL" },
  { value: "env_var", label: "Environment Variable" },
  { value: "ssh_key", label: "SSH Key" },
  { value: "db_connection", label: "Database Connection" },
  { value: "other", label: "Lainnya" },
];

export function DevAssetDialog({
  asset,
  open,
  onOpenChange,
}: {
  asset: DevAsset | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const saveFn = useServerFn(devSaveAsset);
  const queryClient = useQueryClient();
  const workspaceFn = useServerFn(workspaceList);
  const workspace = useQuery({
    queryKey: ["workspace", "projects-clients"],
    queryFn: () => workspaceFn(),
    staleTime: 30_000,
  });

  const [name, setName] = useState("");
  const [type, setType] = useState<DevAssetType>("api_key");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(asset?.name ?? "");
    setType((asset?.type as DevAssetType) ?? "api_key");
    setValue(""); // Always clear sensitive value for security in edit mode
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
          type,
          value,
          description,
          projectId: projectId === "none" ? null : projectId,
          metadata: asset?.metadata ?? {},
        },
      });
      await queryClient.invalidateQueries({ queryKey: DEV_ASSETS_KEY });
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
          <DialogTitle>{asset ? "Edit aset developer" : "Tambah aset developer"}</DialogTitle>
          <DialogDescription>Data sensitif disimpan dengan enkripsi AES-256.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipe Aset</Label>
              <Select value={type} onValueChange={(v) => setType(v as DevAssetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-name">Nama Label</Label>
              <Input
                id="dev-name"
                placeholder="mis. Stripe Secret Key"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dev-value">
              {asset ? "Nilai Baru (kosongkan jika tidak diganti)" : "Nilai Kredensial"}
            </Label>
            <Textarea
              id="dev-value"
              required={!asset}
              className="font-mono text-xs"
              placeholder="Masukkan API key, token, atau URL di sini..."
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
                {workspace.data?.projects.map((p: { id: string; name: string }) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dev-desc">Deskripsi / Catatan (opsional)</Label>
            <Input
              id="dev-desc"
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
