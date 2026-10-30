import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ClientData = {
  id?: string | null;
  name: string;
  description?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  companyProfile?: string | null;
  scopeOfWork?: string | null;
  status?: string;
};

export function ClientDialog({
  open,
  onOpenChange,
  client,
  onSave,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientData | null;
  onSave: (data: ClientData) => Promise<void>;
  busy: boolean;
}) {
  const [data, setData] = useState<ClientData>(client ?? { name: "" });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{client ? "Edit Client" : "Tambah Client"}</DialogTitle>
          <DialogDescription>
            Lengkapi profil client, dokumen, scope kerja, dan status proyek.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList>
              <TabsTrigger value="info">Informasi</TabsTrigger>
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="scope">Scope & Task</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama Client</Label>
                <Input
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input
                  value={data.website ?? ""}
                  onChange={(e) => setData({ ...data, website: e.target.value })}
                />
              </div>
            </TabsContent>
            <TabsContent value="profile" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <Input
                  value={data.logoUrl ?? ""}
                  onChange={(e) => setData({ ...data, logoUrl: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Company Profile</Label>
                <Textarea
                  value={data.companyProfile ?? ""}
                  onChange={(e) => setData({ ...data, companyProfile: e.target.value })}
                />
              </div>
            </TabsContent>
            <TabsContent value="scope" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Scope of Work</Label>
                <Textarea
                  value={data.scopeOfWork ?? ""}
                  onChange={(e) => setData({ ...data, scopeOfWork: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={data.status ?? "active"}
                  onValueChange={(v) => setData({ ...data, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="things-to-do">Things To Do</SelectItem>
                    <SelectItem value="on-process">On Process</SelectItem>
                    <SelectItem value="queue-on-process">Antrian On Process</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="revision">Revisi / Review</SelectItem>
                    <SelectItem value="done">Selesai</SelectItem>
                    <SelectItem value="cancel">Cancel / STOP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={busy}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
