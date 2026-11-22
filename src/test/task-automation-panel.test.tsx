import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskAutomationPanel } from "@/components/workboard/TaskAutomationPanel";

const mocks = vi.hoisted(() => ({
  rules: vi.fn(), reviews: vi.fn(), approve: vi.fn(), order: vi.fn(),
  suggestions: vi.fn().mockResolvedValue([]), intakes: vi.fn().mockResolvedValue([]),
  generate: vi.fn(), reject: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ order: mocks.order }) }) },
}));
vi.mock("@/lib/workboard/task-automation.functions", () => ({
  refreshTaskCopilotSuggestions: vi.fn().mockResolvedValue({}),
  listTaskCopilotSuggestions: mocks.suggestions,
  listPendingTaskIntakes: mocks.intakes,
  listGmailTaskAutomationRules: mocks.rules,
  listPendingGmailTaskDraftReviews: mocks.reviews,
  createTaskWebhookEndpoint: vi.fn(), createGmailTaskAutomationRule: vi.fn(),
  dismissTaskCopilotSuggestion: vi.fn(), setGmailTaskAutomationRuleEnabled: vi.fn(),
}));
vi.mock("@/lib/workboard/task-generator.functions", () => ({
  approveTaskDraftItems: mocks.approve, generateTasksFromSource: mocks.generate, rejectTaskDraft: mocks.reject,
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("task automation response mapping", () => {
  it.each([undefined, null])("can refresh after list responses contain %s", async (missing) => {
    mocks.order.mockResolvedValue({ data: null, error: null });
    for (const list of [mocks.rules, mocks.reviews, mocks.suggestions, mocks.intakes]) {
      list.mockResolvedValueOnce(missing).mockResolvedValue([]);
    }
    render(<TaskAutomationPanel clients={[]} projects={[]} tasks={[]} onTaskCreated={vi.fn()} onSelectTask={vi.fn()} />);
    const refresh = screen.getByRole("button", { name: "Refresh saran" });
    await waitFor(() => expect(refresh).not.toBeDisabled());
    fireEvent.click(refresh);
    await waitFor(() => expect(mocks.reviews).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(refresh).not.toBeDisabled());
  });

  it("loads five responses and approves the selected review's task IDs", async () => {
    mocks.order.mockResolvedValue({ data: [], error: null });
    mocks.rules.mockResolvedValue([{ id: "rule-1", name: "Rule", enabled: false, trigger_config: {} }]);
    mocks.reviews.mockResolvedValue([{
      draftId: "draft-1", summary: "Review", questions: [], duplicateWarnings: [],
      items: [{ id: "item-1", title: "Task", description: "", priority: "normal", dueDate: null,
        assignee: null, confidence: 1, missingInformation: [], parentDraftItemId: null }],
    }]);
    mocks.approve.mockResolvedValue({ createdTaskIds: ["task-1"] });
    const onTaskCreated = vi.fn().mockResolvedValue(undefined);
    render(<TaskAutomationPanel clients={[]} projects={[]} tasks={[]} onTaskCreated={onTaskCreated} onSelectTask={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: /Setujui/ }));
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith({ data: { draftId: "draft-1", itemIds: ["item-1"] } }));
    await waitFor(() => expect(onTaskCreated).toHaveBeenCalledOnce());
  });

  it("analyzes the stored Inbox source then creates only approved tasks", async () => {
    mocks.order.mockResolvedValue({ data: [], error: null });
    mocks.rules.mockResolvedValue([]); mocks.reviews.mockResolvedValue([]);
    mocks.intakes.mockResolvedValueOnce([{ id: "source-1", client_id: "client-1", project_id: null,
      source_type: "webhook", source_label: "Brief revisi", extracted_text: "Revisi banner", source_uri: null,
      status: "received", created_at: "2026-11-22T04:22:00Z", metadata: { integration_source: "whatsapp" } }]).mockResolvedValue([]);
    mocks.generate.mockResolvedValue({ draftId: "draft-1", summary: "Revisi banner", questions: ["Ukuran banner?"], duplicateWarnings: [],
      items: [{ id: "item-1", title: "Revisi banner", description: "Ubah judul", priority: "medium", dueDate: null,
        assignee: null, confidence: 0.8, missingInformation: ["Ukuran"], parentDraftItemId: null }] });
    mocks.approve.mockResolvedValue({ createdTaskIds: ["task-1"] });
    const onTaskCreated = vi.fn().mockResolvedValue(undefined);
    render(<TaskAutomationPanel clients={[]} projects={[]} tasks={[]} onTaskCreated={onTaskCreated} onSelectTask={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Analisis AI" }));
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledWith({ data: {
      clientId: "client-1", projectId: null, sourceType: "webhook", sourceLabel: "Brief revisi",
      sourceText: "Revisi banner", sourceUrl: "", intakeSourceId: "source-1",
    } }));
    expect(mocks.approve).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Setujui 1" }));
    await waitFor(() => expect(onTaskCreated).toHaveBeenCalledOnce());
  });

  it("keeps failed analysis retryable without creating tasks", async () => {
    mocks.order.mockResolvedValue({ data: [], error: null }); mocks.rules.mockResolvedValue([]); mocks.reviews.mockResolvedValue([]);
    mocks.intakes.mockResolvedValue([{ id: "source-2", client_id: "client-1", project_id: null,
      source_type: "webhook", source_label: "Revisi", extracted_text: "Revisi banner", source_uri: null,
      status: "failed", created_at: "2026-11-22T04:22:00Z" }]);
    mocks.generate.mockRejectedValue(new Error("AI belum tersedia"));
    render(<TaskAutomationPanel clients={[]} projects={[]} tasks={[]} onTaskCreated={vi.fn()} onSelectTask={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Coba analisis AI lagi" }));
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: "Coba analisis AI lagi" })).not.toBeDisabled());
    expect(mocks.approve).not.toHaveBeenCalled();
  });
});