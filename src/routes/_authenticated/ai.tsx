import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { AppSidebar } from "@/components/vault/AppSidebar";
import { AiChatPageContent } from "@/components/vault/AiChat";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({ meta: [{ title: "Tanya AI · Ebran Aset Digital" }] }),
  component: AiPage,
});

function AiPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="min-h-screen lg:pl-64">
        <header className="border-b border-border bg-background/90 px-4 py-6 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-[1100px] items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-ai shadow-ai">
              <Sparkles className="size-5 text-ai-contrast" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Tanya AI</h1>
              <p className="text-sm text-muted-foreground">Asisten cerdas untuk memahami dan mengelola aset digitalmu.</p>
            </div>
          </div>
        </header>
        <section className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 py-6 sm:px-8">
          <div>
            <p className="text-sm font-medium text-foreground">Percakapan tentang aset aktif</p>
            <p className="mt-1 text-xs text-muted-foreground">Riwayat tersimpan aman di akunmu. AI hanya menerima konteks aset yang sudah disaring dari password dan secret.</p>
          </div>
          <AiChatPageContent />
        </section>
      </main>
    </div>
  );
}
