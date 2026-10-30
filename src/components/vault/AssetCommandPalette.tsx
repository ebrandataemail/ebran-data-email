import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  AtSign,
  CodeXml,
  Copy,
  ExternalLink,
  Folder,
  Instagram,
  KeyRound,
  Layers,
  Lock,
  Mail,
  Paperclip,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { asset, categories, tags } from "@/data/asset";
import { OPEN_ASSET_COMMAND_EVENT } from "@/lib/vault/palette-trigger";
import { useAccounts } from "./accounts/use-accounts";
import { useDevAssets } from "./developer/use-dev-assets";
import { workspaceList } from "@/lib/projects/projects.functions";

export function AssetCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: accounts } = useAccounts();
  const { data: developerAssets = [] } = useDevAssets();
  const workspaceFn = useServerFn(workspaceList);
  const { data: workspace } = useQuery({
    queryKey: ["workspace", "projects-clients"],
    queryFn: () => workspaceFn(),
    staleTime: 30_000,
  });

  // Listen for Cmd+K and Ctrl+K keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const onCustomTrigger = () => setOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_ASSET_COMMAND_EVENT, onCustomTrigger);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_ASSET_COMMAND_EVENT, onCustomTrigger);
    };
  }, []);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(`${label} berhasil disalin ke clipboard!`);
        setOpen(false);
      })
      .catch(() => {
        toast.error(`Gagal menyalin ${label}`);
      });
  }, []);

  const handleNavigate = useCallback(
    (to: string) => {
      setOpen(false);
      navigate({ to });
    },
    [navigate],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Cari email, aset developer, proyek, client... (Cmd+K)" />
      <CommandList className="max-h-[380px]">
        <CommandEmpty>
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <Search className="mb-2 size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">Tidak ada aset yang cocok</p>
            <p className="mt-1 text-xs">Coba cari dengan nama akun, username, email, atau tag.</p>
          </div>
        </CommandEmpty>

        {/* Primary Digital Assets */}
        <CommandGroup heading="Aset Digital">
          <CommandItem
            value={`${asset.title} ${asset.username} ${asset.category} ${asset.project} instagram`}
            onSelect={() => handleNavigate("/vault")}
            className="flex items-center gap-3 py-2.5"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-instagram text-white shadow-soft">
              <Instagram className="size-4" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{asset.title}</span>
                <Badge variant="success" className="text-[10px]">
                  {asset.status}
                </Badge>
              </div>
              <span className="truncate text-xs text-muted-foreground">
                @{asset.username} · {asset.category} · {asset.project}
              </span>
            </div>
            <CommandShortcut>Buka</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Credential Actions */}
        <CommandGroup heading="Kredensial & Akses Cepat">
          <CommandItem
            value={`Username @${asset.username} salin`}
            onSelect={() => handleCopy(asset.username, "Username")}
          >
            <UserRound className="size-4 text-primary" />
            <span>Salin Username:</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              @{asset.username}
            </span>
            <CommandShortcut>
              <Copy className="size-3.5" />
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Password Sandi Akun Utama salin"
            onSelect={() => handleCopy(asset.password, "Password")}
          >
            <KeyRound className="size-4 text-warning" />
            <span>Salin Password:</span>
            <span className="font-mono text-xs text-muted-foreground">••••••••••••</span>
            <CommandShortcut>
              <Copy className="size-3.5" />
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            value={`Link Login Instagram Akun ${asset.loginUrl}`}
            onSelect={() => {
              setOpen(false);
              window.open(asset.loginUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="size-4 text-muted-foreground" />
            <span>Buka Halaman Login Instagram</span>
            <CommandShortcut>Buka Tab</CommandShortcut>
          </CommandItem>

          <CommandItem
            value={`Public URL ${asset.publicUrl} Instagram profil`}
            onSelect={() => {
              setOpen(false);
              window.open(`https://${asset.publicUrl}`, "_blank", "noopener,noreferrer");
            }}
          >
            <AtSign className="size-4 text-muted-foreground" />
            <span>Buka URL Publik: {asset.publicUrl}</span>
            <CommandShortcut>Buka Tab</CommandShortcut>
          </CommandItem>

          <CommandItem
            value={`API Public Key Developer ${asset.api.publicKey}`}
            onSelect={() => handleCopy(asset.api.publicKey, "API Public Key")}
          >
            <CodeXml className="size-4 text-muted-foreground" />
            <span>Salin API Public Key:</span>
            <span className="truncate font-mono text-xs text-muted-foreground">
              {asset.api.publicKey.slice(0, 16)}...
            </span>
            <CommandShortcut>
              <Copy className="size-3.5" />
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            value={`TOTP 2FA Authenticator ${asset.security.totpSecret}`}
            onSelect={() => handleCopy(asset.security.totpSecret, "2FA TOTP Secret")}
          >
            <Lock className="size-4 text-muted-foreground" />
            <span>Salin Kunci 2FA TOTP:</span>
            <span className="font-mono text-xs text-muted-foreground">
              {asset.security.totpSecret}
            </span>
            <CommandShortcut>
              <Copy className="size-3.5" />
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Email Accounts from database */}
        {accounts && accounts.length > 0 && (
          <>
            <CommandGroup heading={`Akun Email Vault (${accounts.length})`}>
              {accounts.slice(0, 6).map((acc) => (
                <CommandItem
                  key={acc.id}
                  value={`${acc.email} ${acc.project_name ?? ""} ${acc.recovery_email ?? ""} ${acc.tag ?? ""}`}
                  onSelect={() => handleNavigate("/accounts")}
                  className="flex items-center gap-3"
                >
                  <Mail className="size-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{acc.email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {acc.project_name ?? "Tanpa Proyek"}
                        {acc.recovery_email ? ` · Recovery: ${acc.recovery_email}` : ""}
                      </p>
                    </div>
                    {acc.tag && (
                      <Badge variant="outline" className="text-[10px]">
                        {acc.tag}
                      </Badge>
                    )}
                  </div>
                  <CommandShortcut>Lihat</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {developerAssets.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Developer Tools (${developerAssets.length})`}>
              {developerAssets.slice(0, 10).map((item) => (
                <CommandItem
                  key={item.id}
                  value={`Developer ${item.name} ${item.type} ${item.provider ?? ""} ${item.username ?? ""} ${item.projectName ?? ""} ${item.clientName ?? ""} ${item.status}`}
                  onSelect={() => handleNavigate("/developer-tools")}
                  className="flex items-center gap-3"
                >
                  <CodeXml className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.provider || item.type} · {item.projectName || "Tanpa proyek"}
                      {item.clientName ? ` · ${item.clientName}` : ""}
                    </p>
                  </div>
                  <Badge variant={item.status === "active" ? "default" : "muted"}>{item.status}</Badge>
                </CommandItem>
              ))}
              {developerAssets.slice(0, 6).map((item) => (
                <CommandItem
                  key={`ai-${item.id}`}
                  value={`Tanya AI analisis ${item.name} ${item.provider ?? ""}`}
                  onSelect={() => handleNavigate(`/ai?assetId=${item.id}`)}
                >
                  <Sparkles className="size-4 text-ai" />
                  <span className="flex-1 truncate">Tanya AI · {item.name}</span>
                  <CommandShortcut>AI</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Tab & Section Navigation */}
        <CommandGroup heading="Navigasi Bagian Vault">
          <CommandItem
            value="Profil Info Akun Biodata Kontak"
            onSelect={() => handleNavigate("/vault")}
          >
            <UserRound className="size-4 text-muted-foreground" />
            <span>Tab Info Profil & Kontak</span>
            <CommandShortcut>→</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Keamanan Recovery 2FA Authenticator Password Audit"
            onSelect={() => handleNavigate("/vault")}
          >
            <ShieldCheck className="size-4 text-muted-foreground" />
            <span>Tab Keamanan & Recovery (2FA)</span>
            <CommandShortcut>→</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="API Developer Webhook Token SocioAPI"
            onSelect={() => handleNavigate("/vault")}
          >
            <CodeXml className="size-4 text-muted-foreground" />
            <span>Tab API & Developer</span>
            <CommandShortcut>→</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Ops Status Proxy Billing IP Server"
            onSelect={() => handleNavigate("/vault")}
          >
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <span>Tab Ops, Proxy & Status</span>
            <CommandShortcut>→</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Attachments Lampiran File PDF KTP Dokumen"
            onSelect={() => handleNavigate("/vault")}
          >
            <Paperclip className="size-4 text-muted-foreground" />
            <span>Tab Lampiran & Dokumen</span>
            <CommandShortcut>→</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Tanya AI Asisten Assistant Chat Analisis"
            onSelect={() => handleNavigate("/ai")}
          >
            <Sparkles className="size-4 text-ai" />
            <span className="text-foreground">Buka Halaman Tanya AI</span>
            <CommandShortcut>→</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Projects & Categories */}
        <CommandGroup heading="Proyek & Kategori">
          {workspace?.projects.map((project) => (
            <CommandItem
              key={project.id}
              value={`Proyek ${project.name} ${project.clientName ?? ""}`}
              onSelect={() => handleNavigate("/projects")}
            >
              <Folder className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{project.name}</span>
              <span className="text-xs text-muted-foreground">
                {project.emailCount + project.developerAssetCount} aset
              </span>
            </CommandItem>
          ))}
          {workspace?.clients.map((client) => (
            <CommandItem
              key={client.id}
              value={`Client ${client.name} ${client.website ?? ""}`}
              onSelect={() => handleNavigate("/clients")}
            >
              <Folder className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{client.name}</span>
              <span className="text-xs text-muted-foreground">{client.projectCount} proyek</span>
            </CommandItem>
          ))}
          {categories.map((c) => (
            <CommandItem
              key={c.name}
              value={`Kategori ${c.name}`}
              onSelect={() => handleNavigate(c.key === "email" ? "/accounts" : c.key === "dev" ? "/developer-tools" : "/vault")}
            >
              <Layers className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{c.name}</span>
              <ArrowRight className="size-3.5 text-muted-foreground" />
            </CommandItem>
          ))}
          {tags.map((t) => (
            <CommandItem
              key={t.label}
              value={`Tag Label ${t.label}`}
              onSelect={() => handleNavigate("/vault")}
            >
              <Tag className="size-4 text-muted-foreground" />
              <span>Filter Tag:</span>
              <Badge variant={t.tone} className="text-[11px]">
                {t.label}
              </Badge>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      {/* Footer shortcut helper */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground bg-subtle">
        <div className="flex items-center gap-3">
          <span>
            <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>{" "}
            navigasi
          </span>
          <span>
            <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">↵</kbd>{" "}
            pilih
          </span>
          <span>
            <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">
              esc
            </kbd>{" "}
            tutup
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <span>Tekan</span>
          <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
          <span>kapan saja</span>
        </div>
      </div>
    </CommandDialog>
  );
}
