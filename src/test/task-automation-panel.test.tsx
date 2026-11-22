import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskAutomationPanel } from "@/components/workboard/TaskAutomationPanel";

const mocks = vi.hoisted(() => ({
  rules: vi.fn(), reviews: vi.fn(), approve: vi.fn(), order: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ order: mocks.order }) }) },
}));
vi.mock("@/lib/workboard/task-automation.functions", () => ({
  refreshTaskCopilotSuggestions: vi.fn().mockResolvedValue({}),
  listTaskCopilotSuggestions: vi.fn().mockResolvedValue([]),
  listPendingTaskIntakes: vi.fn().mockResolvedValue([]),
  listGmailTaskAutomationRules: mocks.rules,
  listPendingGmailTaskDraftReviews: mocks.reviews,
  createTaskWebhookEndpoint: vi.fn(), createGmailTaskAutomationRule: vi.fn(),
  dismissTaskCopilotSuggestion: vi.fn(), setGmailTaskAutomationRuleEnabled: vi.fn(),
}));
vi.mock("@/lib/workboard/task-generator.functions", () => ({
  approveTaskDraftItems: mocks.approve, generateTasksFromSource: vi.fn(), rejectTaskDraft: vi.fn(),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("task automation response mapping", () => {
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
});