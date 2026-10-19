import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AiTask } from "../types";

interface AiTaskContextType {
  tasks: AiTask[];
  tasksById: Record<string, AiTask>;
  activeTasks: AiTask[];
  hasRunningTask: boolean;
  activeCount: number;
  recentlyCompletedTask: AiTask | null;
  submitTask: (
    conversationId: string,
    model: string,
    systemPrompt: string | null,
    messages: { role: string; content: string }[]
  ) => Promise<AiTask>;
  cancelTask: (taskId: string) => Promise<boolean>;
  clearTasks: () => Promise<void>;
  getTaskForConversation: (conversationId: string) => AiTask | undefined;
  dismissNotification: () => void;
  refreshTasks: () => Promise<void>;
}

const AiTaskContext = createContext<AiTaskContextType | undefined>(undefined);

export const AiTaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [recentlyCompletedTask, setRecentlyCompletedTask] = useState<AiTask | null>(null);
  const prevRunningTaskIdsRef = useRef<Set<string>>(new Set());

  // Normalized O(1) task lookup map
  const tasksById = useMemo(() => {
    const map: Record<string, AiTask> = {};
    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        if (t && t.id) {
          map[t.id] = t;
        }
      }
    }
    return map;
  }, [tasks]);

  // Filter queued or running tasks
  const activeTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter((t) => t && (t.status === "Queued" || t.status === "Running"));
  }, [tasks]);

  const hasRunningTask = activeTasks.length > 0;
  const activeCount = activeTasks.length;

  // Refresh tasks from backend
  const refreshTasks = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const fetched = await invoke<AiTask[]>("get_ai_tasks", { limit: 50 });
      if (Array.isArray(fetched)) {
        setTasks(fetched);
      }
    } catch {
      // In web preview or non-Tauri environment, keep state as is
    }
  }, []);

  // Update a single task in state with O(1) deduplication
  const upsertTask = useCallback((updated: AiTask) => {
    setTasks((prev) => {
      const existingIndex = prev.findIndex((t) => t.id === updated.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = updated;
        return next;
      }
      return [updated, ...prev];
    });

    // Check if task transitioned to Completed to trigger global banner
    if (updated.status === "Completed") {
      setRecentlyCompletedTask(updated);
    }
  }, []);

  // Subscribe to Tauri real-time "ai-task-updated" event
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    if (isTauri()) {
      listen<AiTask>("ai-task-updated", (event) => {
        if (event.payload) {
          upsertTask(event.payload);
        }
      }).then((fn) => {
        unlisten = fn;
      }).catch((e) => {
        console.warn("Could not attach ai-task-updated listener:", e);
      });

      // Initial fetch
      refreshTasks();

      // Fallback liveness polling every 3 seconds
      const interval = setInterval(refreshTasks, 3000);
      return () => {
        if (unlisten) unlisten();
        clearInterval(interval);
      };
    }
  }, [upsertTask, refreshTasks]);

  // Track task completions to trigger notification
  useEffect(() => {
    const currentRunning = new Set(activeTasks.map((t) => t.id));
    for (const id of prevRunningTaskIdsRef.current) {
      if (!currentRunning.has(id)) {
        const completedTask = tasksById[id];
        if (completedTask && completedTask.status === "Completed") {
          setRecentlyCompletedTask(completedTask);
        }
      }
    }
    prevRunningTaskIdsRef.current = currentRunning;
  }, [activeTasks, tasksById]);

  const submitTask = useCallback(
    async (
      conversationId: string,
      model: string,
      systemPrompt: string | null,
      messages: { role: string; content: string }[]
    ): Promise<AiTask> => {
      if (isTauri()) {
        try {
          const task = await invoke<AiTask>("submit_ai_task", {
            conversationId,
            model,
            system: systemPrompt,
            messages,
          });
          upsertTask(task);
          return task;
        } catch (e) {
          throw new Error(String(e));
        }
      } else {
        // Mock fallback for browser dev / vitest environment
        const mockTask: AiTask = {
          id: `mock-task-${Date.now()}`,
          conversation_id: conversationId,
          model,
          prompt_preview: messages[messages.length - 1]?.content.slice(0, 100) || "Test Prompt",
          status: "Running",
          system_prompt: systemPrompt || undefined,
          messages_json: JSON.stringify(messages),
          created_at: new Date().toISOString(),
          duration_ms: 0,
        };
        upsertTask(mockTask);

        setTimeout(() => {
          const completed: AiTask = {
            ...mockTask,
            status: "Completed",
            result: "This is a simulated AI response running in mock environment.",
            completed_at: new Date().toISOString(),
            duration_ms: 1200,
          };
          upsertTask(completed);
        }, 1200);

        return mockTask;
      }
    },
    [upsertTask]
  );

  const cancelTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      if (isTauri()) {
        try {
          const res = await invoke<boolean>("cancel_ai_task", { taskId });
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, status: "Cancelled", error: "Generation cancelled by user" } : t
            )
          );
          return res;
        } catch (e) {
          console.error("Failed to cancel AI task:", e);
          return false;
        }
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: "Cancelled", error: "Generation cancelled by user" } : t
          )
        );
        return true;
      }
    },
    []
  );

  const clearTasks = useCallback(async (): Promise<void> => {
    if (isTauri()) {
      try {
        await invoke("clear_ai_tasks");
      } catch (e) {
        console.error("Failed to clear tasks from database:", e);
      }
    }
    setTasks([]);
    setRecentlyCompletedTask(null);
  }, []);

  const getTaskForConversation = useCallback(
    (conversationId: string): AiTask | undefined => {
      return activeTasks.find((t) => t.conversation_id === conversationId);
    },
    [activeTasks]
  );

  const dismissNotification = useCallback(() => {
    setRecentlyCompletedTask(null);
  }, []);

  const contextValue = useMemo<AiTaskContextType>(
    () => ({
      tasks,
      tasksById,
      activeTasks,
      hasRunningTask,
      activeCount,
      recentlyCompletedTask,
      submitTask,
      cancelTask,
      clearTasks,
      getTaskForConversation,
      dismissNotification,
      refreshTasks,
    }),
    [
      tasks,
      tasksById,
      activeTasks,
      hasRunningTask,
      activeCount,
      recentlyCompletedTask,
      submitTask,
      cancelTask,
      clearTasks,
      getTaskForConversation,
      dismissNotification,
      refreshTasks,
    ]
  );

  return <AiTaskContext.Provider value={contextValue}>{children}</AiTaskContext.Provider>;
};

const defaultFallbackContext: AiTaskContextType = {
  tasks: [],
  tasksById: {},
  activeTasks: [],
  hasRunningTask: false,
  activeCount: 0,
  recentlyCompletedTask: null,
  submitTask: async (convId, model, _sys, msgs) => ({
    id: `task-${Date.now()}`,
    conversation_id: convId,
    model,
    prompt_preview: msgs[msgs.length - 1]?.content.slice(0, 100) || "",
    status: "Completed",
    messages_json: JSON.stringify(msgs),
    created_at: new Date().toISOString(),
    duration_ms: 0,
  }),
  cancelTask: async () => true,
  clearTasks: async () => {},
  getTaskForConversation: () => undefined,
  dismissNotification: () => {},
  refreshTasks: async () => {},
};

export const useAiTaskContext = (): AiTaskContextType => {
  const ctx = useContext(AiTaskContext);
  return ctx || defaultFallbackContext;
};
