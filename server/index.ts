import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getData, resetData, saveData } from "./store.js";
import type { AppData, Client, Equipment, WorkOrder } from "../src/types.js";
import { allowRoles, authenticate, clearSession, demoAccounts, getSessionUser, login, setSession } from "./auth.js";

const app = express();
const port = Number(process.env.PORT || 8787);

app.disable("x-powered-by");
app.use(express.json({ limit: "18mb" }));

app.get("/api/health", async (_request, response, next) => {
  try {
    const data = await getData();
    response.json({
      status: "ok",
      storage: "server-file",
      counts: { clients: data.clients.length, equipment: data.equipment.length, workOrders: data.workOrders.length },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", (request, response) => {
  const user = login(String(request.body?.username || ""), String(request.body?.password || ""));
  if (!user) return response.status(401).json({ error: "账号或密码错误" });
  setSession(response, user);
  response.json({ user });
});

app.post("/api/auth/logout", (_request, response) => {
  clearSession(response);
  response.status(204).end();
});

app.get("/api/auth/demo-accounts", (_request, response) => {
  response.json(demoAccounts);
});

app.get("/api/auth/me", (request, response) => {
  response.json({ user: getSessionUser(request) || null });
});

app.use("/api", authenticate);

app.get("/api/data", async (_request, response, next) => {
  try {
    const request = _request;
    const data = await getData();
    if (request.user?.role === "customer") {
      const equipment = data.equipment.filter((item) => item.clientId === request.user?.clientId);
      const equipmentIds = new Set(equipment.map((item) => item.id));
      return response.json({ ...data, clients: data.clients.filter((item) => item.id === request.user?.clientId), equipment, workOrders: data.workOrders.filter((item) => equipmentIds.has(item.equipmentId)) });
    }
    if (request.user?.role === "technician") {
      const workOrders = data.workOrders.filter((item) => item.assignee === request.user?.technicianName || item.assignee === "未指派");
      const equipmentIds = new Set(workOrders.map((item) => item.equipmentId));
      const equipment = data.equipment.filter((item) => equipmentIds.has(item.id));
      const clientIds = new Set(equipment.map((item) => item.clientId));
      return response.json({ ...data, clients: data.clients.filter((item) => clientIds.has(item.id)), equipment, workOrders });
    }
    response.json(data);
  } catch (error) {
    next(error);
  }
});

app.put("/api/data", allowRoles("admin"), async (request, response, next) => {
  try {
    const data = request.body as AppData;
    await saveData(data);
    response.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/clients", allowRoles("admin", "dispatcher"), async (request, response, next) => {
  try {
    const item = request.body as Client;
    const data = await getData();
    if (!item.id || !item.name) return response.status(400).json({ error: "客户编号与名称不能为空" });
    if (data.clients.some((client) => client.id === item.id)) return response.status(409).json({ error: "客户编号已存在" });
    data.clients.unshift(item);
    await saveData(data);
    response.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.post("/api/equipment", allowRoles("admin", "dispatcher"), async (request, response, next) => {
  try {
    const item = request.body as Equipment;
    const data = await getData();
    if (!item.id || !item.clientId || !item.category) return response.status(400).json({ error: "设备核心字段不完整" });
    if (!data.clients.some((client) => client.id === item.clientId)) return response.status(400).json({ error: "关联客户不存在" });
    if (data.equipment.some((equipment) => equipment.id === item.id)) return response.status(409).json({ error: "设备编号已存在" });
    data.equipment.unshift(item);
    await saveData(data);
    response.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/equipment/:id", allowRoles("admin", "dispatcher", "technician"), async (request, response, next) => {
  try {
    const data = await getData();
    const index = data.equipment.findIndex((item) => item.id === request.params.id);
    if (index < 0) return response.status(404).json({ error: "设备不存在" });
    data.equipment[index] = { ...data.equipment[index], ...request.body, id: data.equipment[index].id };
    await saveData(data);
    response.json(data.equipment[index]);
  } catch (error) {
    next(error);
  }
});

app.post("/api/work-orders", allowRoles("admin", "dispatcher", "customer"), async (request, response, next) => {
  try {
    const item = request.body as WorkOrder;
    const data = await getData();
    if (!item.id || !item.equipmentId || !item.title) return response.status(400).json({ error: "工单核心字段不完整" });
    if (!data.equipment.some((equipment) => equipment.id === item.equipmentId)) return response.status(400).json({ error: "关联设备不存在" });
    if (request.user?.role === "customer") {
      const equipment = data.equipment.find((candidate) => candidate.id === item.equipmentId);
      if (equipment?.clientId !== request.user.clientId) return response.status(403).json({ error: "不能为其他客户的设备报修" });
      item.assignee = "未指派";
      item.status = "待派工";
    }
    if (data.workOrders.some((order) => order.id === item.id)) return response.status(409).json({ error: "工单编号已存在" });
    data.workOrders.unshift(item);
    await saveData(data);
    response.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/work-orders/:id", allowRoles("admin", "dispatcher", "technician", "customer"), async (request, response, next) => {
  try {
    const data = await getData();
    const index = data.workOrders.findIndex((item) => item.id === request.params.id);
    if (index < 0) return response.status(404).json({ error: "工单不存在" });
    const existing = data.workOrders[index];
    if (request.user?.role === "technician" && existing.assignee !== request.user.technicianName && existing.assignee !== "未指派") return response.status(403).json({ error: "只能修改分配给自己的工单" });
    if (request.user?.role === "customer") {
      const equipment = data.equipment.find((item) => item.id === existing.equipmentId);
      if (equipment?.clientId !== request.user.clientId) return response.status(403).json({ error: "不能修改其他客户的工单" });
      const allowed = ["customerName", "customerSignature", "signedAt", "status", "completedAt"];
      const patch = Object.fromEntries(Object.entries(request.body as Record<string, unknown>).filter(([key]) => allowed.includes(key)));
      data.workOrders[index] = { ...existing, ...patch, id: existing.id };
    } else {
      data.workOrders[index] = { ...existing, ...request.body, id: existing.id };
    }
    await saveData(data);
    response.json(data.workOrders[index]);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/work-orders/:id", allowRoles("admin"), async (request, response, next) => {
  try {
    const data = await getData();
    const nextOrders = data.workOrders.filter((item) => item.id !== request.params.id);
    if (nextOrders.length === data.workOrders.length) return response.status(404).json({ error: "工单不存在" });
    data.workOrders = nextOrders;
    await saveData(data);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/reset", allowRoles("admin"), async (_request, response, next) => {
  try {
    response.json(await resetData());
  } catch (error) {
    next(error);
  }
});

const dist = resolve(process.cwd(), "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (request, response, next) => {
    if (request.path.startsWith("/api/")) return next();
    response.sendFile(resolve(dist, "index.html"));
  });
}

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "服务器发生未知错误";
  console.error(error);
  response.status(500).json({ error: message });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`XuHeng API and web server: http://localhost:${port}`);
});
