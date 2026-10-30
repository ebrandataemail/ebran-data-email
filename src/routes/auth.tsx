import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoaderCircle, MailCheck } from "lucide-react";
import { toast } from "sonner";

import appMark from "@/assets/app-mark.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

function safeRedirect(value: unknown): string {
  if (typeof value !== "string") return "/vault";
  try {
    const url = new URL(value, "http://local");
    if (url.origin !== "http://local") return "/vault";
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("/auth") || path === "/" ? "/vault" : path;
  } catch {
    return "/vault";
  }
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safeRedirect(search["redirect"]),
  }),
  head: () => ({
    meta: [
      { title: "Masuk · Ebran Aset Digital" },
      {
        name: "description",
        content: "Masuk ke Ebran Aset Digital untuk mengelola akun dan aset digital kamu.",
      },
      { property: "og:title", content: "Masuk · Ebran Aset Digital" },
      {
        property: "og:description",
        content: "Masuk untuk membuka vault aset digital bertenaga AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  // Already signed in → go straight to the vault.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: redirect, replace: true });
    });
  }, [navigate, redirect]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: redirect, replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/vault` },
        });
        if (error) throw error;
        if (data.session) navigate({ to: redirect, replace: true });
        else setCheckEmail(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(mode === "signin" ? "Gagal masuk" : "Gagal mendaftar", { description: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-subtle px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={appMark} alt="Ebran Aset Digital" width={56} height={56} className="size-14" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
            Ebran Aset Digital
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Arsip Data Pribadi Aman</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          {checkEmail ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success-foreground">
                <MailCheck className="size-5" />
              </span>
              <p className="text-sm font-semibold text-foreground">Cek email kamu</p>
              <p className="text-sm text-muted-foreground">
                Kami mengirim link konfirmasi ke{" "}
                <span className="font-medium text-foreground">{email}</span>. Klik link itu, lalu
                masuk di sini.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signin");
                }}
              >
                Kembali ke halaman masuk
              </Button>
            </div>
          ) : (
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Masuk</TabsTrigger>
                <TabsTrigger value="signup">Daftar</TabsTrigger>
              </TabsList>
              <TabsContent value={mode} className="mt-5">
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      minLength={6}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <LoaderCircle className="animate-spin" />}
                    {mode === "signin" ? "Masuk" : "Buat akun"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
