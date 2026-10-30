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
import { vaultSaveAccount } from "@/lib/vault/vault.functions";
import { workspaceList } from "@/lib/projects/projects.functions";
import { errorMessage } from "../use-ai";
import { ACCOUNTS_KEY, STATUS_LABEL, type VaultAccount } from "./use-accounts";

export function AccountDialog({
  account,
  open,
  onOpenChange,
}: {
  account: VaultAccount | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const saveFn = useServerFn(vaultSaveAccount);
  const queryClient = useQueryClient();
  const workspaceFn = useServerFn(workspaceList);
  const workspace = useQuery({
    queryKey: ["workspace", "projects-clients"],
    queryFn: () => workspaceFn(),
    staleTime: 30_000,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<VaultAccount["lovableStatus"]>("unknown");
  const [usageTag, setUsageTag] = useState("");
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail(account?.email ?? "");
    setPassword("");
    setStatus(account?.lovableStatus ?? "unknown");
    setUsageTag(account?.usageTag ?? "");
    setNote(account?.note ?? "");
    setProjectId(account?.projectId ?? "none");
  }, [open, account]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveFn({
        data: {
          id: account?.id ?? null,
          email,
          password: password || null,
          lovableStatus: status,
          usageTag,
          note,
          projectId: projectId === "none" ? null : projectId,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      await queryClient.invalidateQueries({ queryKey: ["workspace", "projects-clients"] });
      toast.success(account ? "Akun diperbarui" : "Akun ditambahkan");
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
          <DialogTitle>{account ? "Edit akun email" : "Tambah akun email"}</DialogTitle>
          <DialogDescription>Password disimpan terenkripsi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="acc-email">Email</Label>
            <Input
              id="acc-email"
              type="email"
              required
              disabled={!!account}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-pw">
              {account ? "Password baru (kosongkan jika tidak diganti)" : "Password"}
            </Label>
            <Input
              id="acc-pw"
              type="text"
              autoComplete="off"
              className="font-mono"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status Lovable</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as VaultAccount["lovableStatus"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-tag">Tag pemakaian</Label>
              <Input
                id="acc-tag"
                placeholder="mis. TIKTOK REPOST ARS"
                value={usageTag}
                onChange={(e) => setUsageTag(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Proyek</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih proyek" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Belum ditetapkan</SelectItem>
                {workspace.data?.projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-note">Catatan</Label>
            <Textarea
              id="acc-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
