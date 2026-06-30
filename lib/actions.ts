import { apiJson } from "@/lib/api";
import type { InvoiceStatus, ProjectStatus, TaskPriority, TaskStatus } from "@prisma/client";

type ActionResult<T = unknown> = { success: boolean; data?: T; error?: string };

async function mutate<T>(path: string, method: string, data?: unknown): Promise<ActionResult<T>> {
  try {
    return await apiJson<ActionResult<T>>(path, {
      method,
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Request failed" };
  }
}

export const createClient = (data: unknown) => mutate("/clients", "POST", data);
export const updateClient = (id: string, data: unknown) => mutate(`/clients/${id}`, "PATCH", data);
export const deleteClient = (id: string) => mutate(`/clients/${id}`, "DELETE");

export const createProject = (data: unknown) => mutate("/projects", "POST", data);
export const updateProject = (id: string, data: { status?: ProjectStatus } & Record<string, unknown>) =>
  mutate(`/projects/${id}`, "PATCH", data);
export const deleteProject = (id: string) => mutate(`/projects/${id}`, "DELETE");

export const createTask = (data: { priority?: TaskPriority } & Record<string, unknown>) =>
  mutate("/tasks", "POST", data);
export const updateTask = (id: string, data: { priority?: TaskPriority; status?: TaskStatus } & Record<string, unknown>) =>
  mutate(`/tasks/${id}`, "PATCH", data);
export const updateTaskStatus = (id: string, status: TaskStatus, order: number) =>
  mutate(`/tasks/${id}/status`, "PATCH", { status, order });
export const deleteTask = (id: string) => mutate(`/tasks/${id}`, "DELETE");

export const createInvoice = (data: unknown) => mutate("/invoices", "POST", data);
export const updateInvoice = (id: string, data: { status?: InvoiceStatus } & Record<string, unknown>) =>
  mutate(`/invoices/${id}`, "PATCH", data);
export const updateInvoiceStatus = (id: string, status: InvoiceStatus) =>
  mutate(`/invoices/${id}/status`, "PATCH", { status });
export const deleteInvoice = (id: string) => mutate(`/invoices/${id}`, "DELETE");
