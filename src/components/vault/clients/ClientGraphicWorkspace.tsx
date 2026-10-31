import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Download, ExternalLink, FileText, ImagePlus, Mail, MessageCircle, MessageSquare, Send, ShieldCheck, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ClientData } from "./ClientDialog";

type Item = Record<string, any>;

export function ClientGraphicWorkspace({ client }: { client: ClientData & { id: string } }) {
  const qc = useQueryClient();
  const key = ["client-graphic-workspace", client.id];
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [pin, setPin] = useState<{x:number;y:number}|null>(null);
  const [versionId, setVersionId] = useState<string|null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const query = useQuery({queryKey:key, queryFn:async()=>{
    const {data:versions,error:vError}=await (supabase.from("client_design_versions" as any) as any).select("*").eq("client_id",client.id).order("created_at",{ascending:false});
    if(vError) throw vError;
    const versionRows=(versions??[]) as Item[];
    const ids=versionRows.map(v=>v.id);
    let comments:Item[]=[];
    if(ids.length){
      const {data,error}=await (supabase.from("client_design_comments" as any) as any).select("*").in("version_id",ids).order("created_at",{ascending:true});
      if(error) throw error;
      comments=(data??[]) as Item[];
    }
    const {data:docs,error:dError}=await (supabase.from("client_documents" as any) as any).select("id,title,file_name,file_path,document_type").eq("client_id",client.id).order("created_at",{ascending:false}).limit(3);
    if(dError) throw dError;
    const {data:assets,error:aError}=await (supabase.from("client_digital_assets" as any) as any).select("id,asset_name,asset_url").eq("client_id",client.id).order("created_at",{ascending:false}).limit(3);
    if(aError) throw aError;
    const {data:userData,error:uError}=await supabase.auth.getUser();
    if(uError) throw uError;
    return {versions:versionRows,comments,docs:docs??[],assets:assets??[],userId:userData.user?.id??""};
  }});
  const data=query.data;
  const versions=data?.versions??[];
  const active=versions.find(v=>v.id===versionId)??versions[0];
  const comments=(data?.comments??[]).filter(c=>c.version_id===active?.id);
  const refresh=()=>qc.invalidateQueries({queryKey:key});
  const run=async(fn:()=>Promise<void>)=>{
    setBusy(true);
    try{await fn();await refresh();}
    catch(e){toast.error(e instanceof Error?e.message:"Operasi gagal");}
    finally{setBusy(false);}
  };
  const upload=async(file:File)=>{
    if(!data?.userId) throw new Error("Sesi login tidak ditemukan.");
    if(file.size>20*1024*1024) throw new Error("Ukuran file maksimal 20 MB.");
    const safe=file.name.replace(/[^\w.-]/g,"-");
    const path=data.userId+"/"+client.id+"/designs/"+crypto.randomUUID()+"-"+safe;
    const {error}=await supabase.storage.from("client-files").upload(path,file,{contentType:file.type});
    if(error) throw error;
    return path;
  };
  const openFile=async(path:string,download=false)=>{
    const {data:signed,error}=await supabase.storage.from("client-files").createSignedUrl(path,300,download?{download:true}:{});
    if(error||!signed?.signedUrl) throw error??new Error("File tidak dapat dibuka.");
    window.open(signed.signedUrl,"_blank","noopener,noreferrer");
  };
  const phone=(client.contactPhone??"").replace(/[^0-9]/g,"");
  const email=client.contactEmail??"";
  const share="https://wa.me/"+phone+"?text="+encodeURIComponent("Preview desain "+client.name+": "+(active?.title??"Client workspace"));
  const send=()=>void run(async()=>{
    if(!active||!message.trim()) return;
    const {error}=await (supabase.from("client_design_comments" as any) as any).insert({
      user_id:data?.userId,client_id:client.id,version_id:active.id,comment:message.trim(),x:pin?.x??null,y:pin?.y??null
    });
    if(error) throw error;
    setMessage("");setPin(null);toast.success("Komentar tersimpan");
  });

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
    <header className="flex items-center justify-between border-b bg-white px-4 py-3">
      <div className="flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-bold text-white">GW</span><h2 className="text-sm font-bold text-slate-900">Graphic Workspace</h2></div>
      <div className="relative"><Button size="icon" variant="ghost" className="size-8" onClick={()=>setNoticeOpen(v=>!v)} aria-label="Notifikasi"><Bell className="size-4"/></Button>
        {noticeOpen&&<div className="absolute right-0 top-9 z-30 w-64 rounded-lg border bg-white p-3 text-xs shadow-xl"><b>Notifikasi review</b><p className="mt-2 text-slate-500">{comments.length} komentar pada versi aktif · {versions.filter(v=>v.status==="pending").length} desain menunggu review.</p></div>}
      </div>
    </header>
    {query.isPending?<div className="p-12 text-center text-xs text-slate-400">Memuat Graphic Workspace…</div>:
    query.isError?<div className="p-5 text-xs text-red-600">Gagal memuat workspace desain: {(query.error as Error).message}</div>:
    <div className="grid gap-3 p-3 xl:grid-cols-[minmax(190px,0.9fr)_minmax(360px,1.8fr)_minmax(240px,1fr)]">
      <div className="space-y-3">
        <Card className="rounded-lg shadow-none"><CardContent className="space-y-2 p-3">
          <h3 className="text-xs font-bold">Project & Account Overview</h3>
          <Info label="Client" value={client.name}/><Info label="PIC" value={client.contactName}/><Info label="Status" value={client.clientStatus??"active"}/><Info label="Priority" value="—"/><Info label="Tags" value={client.industry??"Client"}/><Info label="Assignees" value="Belum ditentukan"/>
        </CardContent></Card>
        <Card className="rounded-lg shadow-none"><CardHeader className="p-3 pb-1"><CardTitle className="text-xs">Client Brief</CardTitle></CardHeader><CardContent className="p-3 pt-1"><p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">{client.companyProfile||client.description||client.scopeOfWork||"Brief client belum diisi. Tambahkan melalui Edit Profil."}</p></CardContent></Card>
        <Card className="rounded-lg shadow-none"><CardHeader className="p-3 pb-1"><CardTitle className="text-xs">Asset Uploader & Links</CardTitle></CardHeader><CardContent className="space-y-2 p-3 pt-1">
          {(data?.docs??[]).map(doc=><button key={doc.id} onClick={()=>void openFile(doc.file_path)} className="flex w-full items-center justify-between rounded border bg-white p-2 text-left text-[10px] hover:bg-slate-50"><span className="min-w-0 truncate"><FileText className="mr-1 inline size-3 text-rose-500"/>{doc.file_name}</span><ExternalLink className="size-3"/></button>)}
          {(data?.assets??[]).map(asset=><a key={asset.id} href={asset.asset_url||"#"} target="_blank" rel="noreferrer" className="block truncate rounded border bg-white p-2 text-[10px] text-blue-700"><ExternalLink className="mr-1 inline size-3"/>{asset.asset_name}</a>)}
          {!data?.docs.length&&!data?.assets.length&&<p className="text-[10px] text-slate-400">Belum ada file atau link.</p>}
        </CardContent></Card>
      </div>
      <Card className="min-w-0 rounded-lg shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2"><CardTitle className="text-xs">Design Preview</CardTitle><div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5">{versions.slice(0,4).reverse().map(v=><button key={v.id} onClick={()=>setVersionId(v.id)} className={"rounded px-2 py-1 text-[9px] "+(active?.id===v.id?"bg-white font-bold shadow":"text-slate-500")}>{v.version_label}</button>)}{!versions.length&&<span className="px-2 text-[9px] text-slate-400">Belum ada versi</span>}</div></CardHeader>
        <CardContent className="space-y-2 p-3 pt-0">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-slate-500">Klik gambar untuk menambahkan pinpoint revisi.</p><label className="flex cursor-pointer items-center rounded-md border bg-white px-2 py-1 text-[10px] hover:bg-slate-50"><Upload className="mr-1 size-3"/>Upload versi<input type="file" accept="image/*,.pdf" className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(file)void run(async()=>{if(!title.trim())throw new Error("Isi judul desain terlebih dahulu.");const path=await upload(file);const {error}=await (supabase.from("client_design_versions" as any) as any).insert({user_id:data?.userId,client_id:client.id,title:title.trim(),version_label:"V"+(versions.length+1),file_path:path,file_name:file.name,mime_type:file.type});if(error)throw error;setTitle("");toast.success("Desain diunggah");});e.currentTarget.value="";}}/></label></div>
          <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Judul desain baru (wajib sebelum upload)" className="h-8 text-xs"/>
          {active?<div className={"relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-md border bg-slate-100 "+(active.status==="approved"?"cursor-default":"cursor-crosshair")} onClick={e=>{if(active.status==="approved")return;const r=e.currentTarget.getBoundingClientRect();setPin({x:Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))});}}>
            {active.mime_type?.startsWith("image/")?<Preview path={active.file_path}/>:<div className="p-8 text-center text-xs text-slate-500"><FileText className="mx-auto mb-2 size-8"/>{active.file_name}<Button size="sm" variant="link" onClick={e=>{e.stopPropagation();void openFile(active.file_path);}}>Buka file</Button></div>}
            {comments.filter(c=>c.x!=null).map((c,i)=><span key={c.id} style={{left:Number(c.x)+"%",top:Number(c.y)+"%"}} className="absolute z-10 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-blue-600 text-[9px] font-bold text-white shadow">{i+1}</span>)}
            {pin&&<span style={{left:pin.x+"%",top:pin.y+"%"}} className="absolute z-20 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-[9px] text-white">+</span>}
          </div>:<div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed bg-white p-8 text-center text-xs text-slate-400"><div><ImagePlus className="mx-auto mb-2 size-8"/><p>Belum ada desain yang diunggah.</p><p className="mt-1">Tambahkan judul lalu upload file desain.</p></div></div>}
          <div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="outline" className={active?.status==="approved"?"border-emerald-200 bg-emerald-50 text-emerald-700":active?.status==="revision"?"border-orange-200 bg-orange-50 text-orange-700":"border-blue-200 bg-blue-50 text-blue-700"}>{active?.status==="approved"?"Disetujui":active?.status==="revision"?"Perlu revisi":active?"Menunggu review":"Belum ada status"}</Badge><span className="text-[9px] text-slate-400">{active?.file_name??""}</span></div>
        </CardContent>
      </Card>
      <div className="flex min-w-0 flex-col gap-3">
        <Card className="rounded-lg shadow-none"><CardHeader className="p-3 pb-2"><CardTitle className="text-xs">Gatekeepers (Action)</CardTitle></CardHeader><CardContent className="space-y-2 p-3 pt-0">
          {active?.status==="approved"?<div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-center"><ShieldCheck className="mx-auto mb-1 size-6 text-emerald-600"/><p className="text-[11px] font-semibold text-emerald-800">Design Approved & Locked</p><Button size="sm" variant="outline" className="mt-2 w-full bg-white" onClick={()=>void openFile(active.file_path,true)}><Download className="mr-1 size-3"/>Download File Siap Cetak</Button></div>:
          <div className="grid grid-cols-2 gap-2"><Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={!active||busy} onClick={()=>void run(async()=>{const {error}=await (supabase.from("client_design_versions" as any) as any).update({status:"approved",reviewed_at:new Date().toISOString()}).eq("id",active.id);if(error)throw error;toast.success("Desain disetujui");})}><Check className="mr-1 size-3.5"/>Approve Desain</Button><Button size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" disabled={!active||busy} onClick={()=>void run(async()=>{const {error}=await (supabase.from("client_design_versions" as any) as any).update({status:"revision",reviewed_at:new Date().toISOString()}).eq("id",active.id);if(error)throw error;toast.success("Revisi diminta");})}>Ajukan Revisi</Button></div>}
          <p className="text-[9px] text-slate-400">Status approval tersimpan di Supabase.</p>
        </CardContent></Card>
        <Card className="rounded-lg shadow-none"><CardHeader className="p-3 pb-2"><CardTitle className="text-xs">Omnichannel & Automations</CardTitle></CardHeader><CardContent className="space-y-1.5 p-3 pt-0">
          <Button variant="outline" size="sm" className="h-8 w-full justify-start text-[10px]" disabled={!phone} onClick={()=>window.open("https://wa.me/"+phone+"?text="+encodeURIComponent("Halo "+client.name+", ada pembaruan pada workspace desain Anda."),"_blank","noopener,noreferrer")}><MessageCircle className="mr-2 size-3.5 text-emerald-600"/>Kirim Notifikasi WA</Button>
          <Button variant="outline" size="sm" className="h-8 w-full justify-start text-[10px]" disabled={!email} onClick={()=>window.location.href="mailto:"+email+"?subject="+encodeURIComponent("Pembaruan proyek "+client.name)}><Mail className="mr-2 size-3.5 text-blue-600"/>Kirim Email Detail & Invoice</Button>
          <Button variant="outline" size="sm" className="h-8 w-full justify-start text-[10px]" disabled={!phone||!active} onClick={()=>window.open(share,"_blank","noopener,noreferrer")}><MessageSquare className="mr-2 size-3.5"/>Bagikan Preview via WA</Button>
          <Button variant="outline" size="sm" className="h-8 w-full justify-start text-[10px]" disabled><ExternalLink className="mr-2 size-3.5"/>Posting ke IG/FB (belum terhubung)</Button>
        </CardContent></Card>
        <Card className="flex min-h-[300px] flex-1 flex-col rounded-lg shadow-none"><CardHeader className="border-b bg-slate-50 p-3"><CardTitle className="text-xs">Sistem Komunikasi Interaktif</CardTitle></CardHeader><CardContent className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <div className="max-h-[230px] flex-1 space-y-3 overflow-y-auto">{comments.map((c,i)=><div key={c.id} className={"flex gap-2 "+(c.x!=null?"flex-row-reverse":"")}><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[9px] text-white">{c.x!=null?"CL":"DS"}</span><div className={"min-w-0 max-w-[90%] "+(c.x!=null?"text-right":"")}><p className="text-[9px] text-slate-500">{c.x!=null?"Client · Pinpoint":"Designer · Komentar"} · {new Date(c.created_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</p><div className={"mt-1 rounded-lg border p-2 text-[10px] leading-relaxed "+(c.x!=null?"border-blue-200 bg-blue-50":"bg-white")}>{c.x!=null&&<p className="mb-1 font-semibold text-blue-700">Pin #{i+1} · {Math.round(Number(c.x))}%, {Math.round(Number(c.y))}%</p>}{c.comment}</div></div></div>)}{!comments.length&&<p className="py-6 text-center text-[10px] text-slate-400">Belum ada komentar pada versi ini.</p>}</div>
          {pin&&<div className="flex items-center justify-between rounded bg-blue-50 px-2 py-1 text-[9px] text-blue-700">Pinpoint dipilih ({Math.round(pin.x)}%, {Math.round(pin.y)}%)<button onClick={()=>setPin(null)}><X className="size-3"/></button></div>}
          <div className="mt-auto space-y-2 border-t pt-2"><Textarea rows={2} value={message} onChange={e=>setMessage(e.target.value)} placeholder={pin?"Tulis catatan revisi untuk titik ini…":"Kirim komentar umum (non-pin)…"} className="resize-none text-[10px]"/><Button size="sm" className="h-8 w-full" onClick={send} disabled={!active||!message.trim()||busy||active.status==="approved"}><Send className="mr-1 size-3"/>Kirim Komentar</Button></div>
        </CardContent></Card>
      </div>
    </div>}
  </section>;
}

function Info({label,value}:{label:string;value?:string|null}) {
  return <div className="flex items-start justify-between gap-3 text-[10px]"><span className="text-slate-400">{label}</span><span className="text-right font-medium text-slate-700">{value||"—"}</span></div>;
}

function Preview({path}:{path:string}) {
  const [url,setUrl]=useState("");
  useEffect(()=>{let alive=true;void supabase.storage.from("client-files").createSignedUrl(path,300).then(({data,error})=>{if(alive)setUrl(error?"":data?.signedUrl??"");});return()=>{alive=false;};},[path]);
  return url?<img src={url} alt="Preview desain client" className="max-h-[620px] w-full object-contain"/>:<div className="p-12 text-center text-xs text-slate-400">Memuat preview…</div>;
}
