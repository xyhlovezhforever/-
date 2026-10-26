import type { AppData, Equipment, SessionUser, WorkOrder } from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
    throw new Error(payload.error || `请求失败：${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) => request<{ user: SessionUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: SessionUser | null }>("/api/auth/me"),
  demoAccounts: () => request<Array<SessionUser & { password: string }>>("/api/auth/demo-accounts"),
  getData: () => request<AppData>("/api/data"),
  saveData: (data: AppData) => request<{ ok: true; savedAt: string }>("/api/data", { method: "PUT", body: JSON.stringify(data) }),
  createEquipment: (equipment: Equipment) => request<Equipment>("/api/equipment", { method: "POST", body: JSON.stringify(equipment) }),
  patchEquipment: (id: string, patch: Partial<Equipment>) => request<Equipment>(`/api/equipment/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  createWorkOrder: (order: WorkOrder) => request<WorkOrder>("/api/work-orders", { method: "POST", body: JSON.stringify(order) }),
  patchWorkOrder: (id: string, patch: Partial<WorkOrder>) => request<WorkOrder>(`/api/work-orders/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteWorkOrder: (id: string) => request<void>(`/api/work-orders/${encodeURIComponent(id)}`, { method: "DELETE" }),
  resetData: () => request<AppData>("/api/reset", { method: "POST" }),
  health: () => request<{ status: string }>("/api/health"),
};
