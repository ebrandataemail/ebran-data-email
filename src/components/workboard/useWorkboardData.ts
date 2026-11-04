import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkboardClient = {
  id: string;
  name: string;
  legal_name: string | null;
  description: string | null;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  industry: string | null;
  client_status: string;
  company_profile: string | null;
  scope_of_work: string | null;
  created_at: string;
};
export type WorkboardProject = {
  id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};
export type WorkboardTask = {
  id: string;
  client_id: string;
  title: string;
  task_type?: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee: string | null;
  created_at: string;
  updated_at: string;
  sort_order: number;
};
export type WorkboardDocument = {
  id: string;
  client_id: string;
  title: string;
  document_type: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  document_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
};
export type WorkboardDesignVersion = {
  id: string;
  client_id: string;
  task_id: string | null;
  title: string;
  version_label: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  status: "pending" | "approved" | "revision";
  created_at: string;
  reviewed_at: string | null;
};
export type WorkboardDesignComment = {
  id: string;
  client_id: string;
  version_id: string;
  comment: string;
  x: number | null;
  y: number | null;
  created_at: string;
};
export type WorkboardDesignReview = {
  id: string;
  client_id: string;
  version_id: string;
  decision: "approved" | "revision";
  note: string | null;
  created_at: string;
};
export type WorkboardActivity = {
  id: string;
  client_id: string;
  event_type: string;
  title: string;
  description: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

export function useWorkboardData() {
  const [clients, setClients] = useState<WorkboardClient[]>([]);
  const [projects, setProjects] = useState<WorkboardProject[]>([]);
  const [tasks, setTasks] = useState<WorkboardTask[]>([]);
  const [documents, setDocuments] = useState<WorkboardDocument[]>([]);
  const [activities, setActivities] = useState<WorkboardActivity[]>([]);
  const [designVersions, setDesignVersions] = useState<WorkboardDesignVersion[]>([]);
  const [designComments, setDesignComments] = useState<WorkboardDesignComment[]>([]);
  const [designReviews, setDesignReviews] = useState<WorkboardDesignReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const results = await Promise.all([
      (supabase.from("clients" as any) as any)
        .select(
          "id,name,legal_name,description,website,contact_name,contact_email,contact_phone,industry,client_status,company_profile,scope_of_work,created_at",
        )
        .order("name"),
      (supabase.from("projects" as any) as any)
        .select("id,client_id,name,description,status,created_at,updated_at")
        .order("updated_at", { ascending: false }),
      (supabase.from("client_tasks" as any) as any)
        .select(
          "id,client_id,title,task_type,description,status,priority,due_date,assignee,created_at,updated_at,sort_order",
        )
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("sort_order"),
      (supabase.from("client_documents" as any) as any)
        .select(
          "id,client_id,title,document_type,file_path,file_name,mime_type,file_size,document_date,expiry_date,notes,created_at",
        )
        .order("created_at", { ascending: false }),
      (supabase.from("client_timeline_events" as any) as any)
        .select("id,client_id,event_type,title,description,occurred_at,metadata")
        .order("occurred_at", { ascending: false })
        .limit(100),
      (supabase.from("client_design_versions" as any) as any)
        .select(
          "id,client_id,task_id,title,version_label,file_path,file_name,mime_type,status,created_at,reviewed_at",
        )
        .order("created_at", { ascending: false }),
      (supabase.from("client_design_comments" as any) as any)
        .select("id,client_id,version_id,comment,x,y,created_at")
        .order("created_at", { ascending: true }),
      (supabase.from("client_design_reviews" as any) as any)
        .select("id,client_id,version_id,decision,note,created_at")
        .order("created_at", { ascending: false }),
    ]);
    const failed = results.find((r: any) => r.error);
    if (failed?.error) throw failed.error;
    setClients((results[0].data ?? []) as WorkboardClient[]);
    setProjects((results[1].data ?? []) as WorkboardProject[]);
    setTasks((results[2].data ?? []) as WorkboardTask[]);
    setDocuments((results[3].data ?? []) as WorkboardDocument[]);
    setActivities((results[4].data ?? []) as WorkboardActivity[]);
    setDesignVersions((results[5].data ?? []) as WorkboardDesignVersion[]);
    setDesignComments((results[6].data ?? []) as WorkboardDesignComment[]);
    setDesignReviews((results[7].data ?? []) as WorkboardDesignReview[]);
  }, []);

  const createTask = useCallback(
    async (input: {
      client_id: string;
      title: string;
      task_type?: string;
      description?: string;
      status: string;
      priority: string;
      due_date: string | null;
      assignee: string | null;
    }) => {
      const { data, error } = await (supabase.from("client_tasks" as any) as any)
        .insert(input)
        .select("id")
        .single();
      if (error) throw error;
      await refresh();
      return data;
    },
    [refresh],
  );

  const updateTask = useCallback(
    async (
      id: string,
      patch: Partial<{
        client_id: string;
        title: string;
        task_type?: string;
        description: string | null;
        status: string;
        priority: string;
        due_date: string | null;
        assignee: string | null;
      }>,
    ) => {
      const { data, error } = await (supabase.from("client_tasks" as any) as any)
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        throw new Error("Task tidak ditemukan atau akses ditolak oleh kebijakan keamanan.");
      await refresh();
      return data;
    },
    [refresh],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const { data, error } = await (supabase.from("client_tasks" as any) as any)
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        throw new Error("Task tidak ditemukan atau akses hapus ditolak oleh kebijakan keamanan.");
      await refresh();
    },
    [refresh],
  );

  const duplicateTask = useCallback(
    async (task: WorkboardTask) => {
      return createTask({
        client_id: task.client_id,
        title: task.title.slice(0, 145) + " (Salinan)",
        task_type: task.task_type ?? "general",
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        assignee: task.assignee,
      });
    },
    [createTask],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void refresh()
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Gagal memuat data Workboard");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    const channel = supabase
      .channel("workboard-live-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        if (alive) void refresh().catch((e) => setError(e.message));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        if (alive) void refresh().catch((e) => setError(e.message));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "client_tasks" }, () => {
        if (alive) void refresh().catch((e) => setError(e.message));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "client_documents" }, () => {
        if (alive) void refresh().catch((e) => setError(e.message));
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_timeline_events" },
        () => {
          if (alive) void refresh().catch((e) => setError(e.message));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_design_versions" },
        () => {
          if (alive) void refresh().catch((e) => setError(e.message));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_design_comments" },
        () => {
          if (alive) void refresh().catch((e) => setError(e.message));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_design_reviews" },
        () => {
          if (alive) void refresh().catch((e) => setError(e.message));
        },
      )
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return {
    clients,
    projects,
    tasks,
    documents,
    activities,
    designVersions,
    designComments,
    designReviews,
    loading,
    error,
    refresh,
    createTask,
    updateTask,
    deleteTask,
    duplicateTask,
  };
}
