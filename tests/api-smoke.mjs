const api = "http://127.0.0.1:8787/api";
let cookie = "";

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
  });
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  if (response.status === 204) return undefined;
  return response.json();
}

async function login(username, password) {
  const response = await fetch(`${api}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  if (!response.ok) throw new Error(`login failed for ${username}`);
  cookie = response.headers.get("set-cookie")?.split(";")[0] || "";
  return response.json();
}

await login("admin", "admin123");
await request("/reset", { method: "POST" });
const health = await request("/health");
if (health.status !== "ok" || health.storage !== "server-file") throw new Error("health check did not report server storage");

const initial = await request("/data");
const equipment = {
  id: "EQ-API-TEST",
  clientId: initial.clients[0].id,
  site: "API 测试点位",
  category: "测试设备",
  brand: "XuHeng",
  model: "T1",
  serial: "API-001",
  installedAt: "2026-10-26",
  nextMaintenance: "2026-11-26",
  status: "运行中",
};
await request("/equipment", { method: "POST", body: JSON.stringify(equipment) });
const patchedEquipment = await request(`/equipment/${equipment.id}`, { method: "PATCH", body: JSON.stringify({ status: "需关注" }) });
if (patchedEquipment.status !== "需关注") throw new Error("equipment patch was not persisted");

const order = {
  id: "WO-API-TEST",
  equipmentId: equipment.id,
  title: "API 持久化测试",
  description: "验证完整后端 CRUD",
  priority: "普通",
  status: "待派工",
  assignee: "测试员",
  createdAt: "2026-10-26",
  scheduledAt: "2026-10-27",
  diagnosis: "",
  solution: "",
  laborHours: 0,
  parts: [],
  beforePhotos: [],
  afterPhotos: [],
};
await request("/work-orders", { method: "POST", body: JSON.stringify(order) });
const patchedOrder = await request(`/work-orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status: "处理中", diagnosis: "接口写入成功" }) });
if (patchedOrder.status !== "处理中" || patchedOrder.diagnosis !== "接口写入成功") throw new Error("work order patch was not persisted");

const persisted = await request("/data");
if (!persisted.equipment.some((item) => item.id === equipment.id && item.status === "需关注")) throw new Error("equipment missing after database reload");
if (!persisted.workOrders.some((item) => item.id === order.id && item.status === "处理中")) throw new Error("work order missing after database reload");

await request(`/work-orders/${order.id}`, { method: "DELETE" });
const afterDelete = await request("/data");
if (afterDelete.workOrders.some((item) => item.id === order.id)) throw new Error("work order delete failed");

await login("customer", "customer123");
const customerData = await request("/data");
if (customerData.clients.length !== 1 || customerData.clients[0].id !== "c-01") throw new Error("customer data was not tenant filtered");
if (customerData.equipment.some((item) => item.clientId !== "c-01")) throw new Error("customer received another client's equipment");
const forbidden = await fetch(`${api}/reset`, { method: "POST", headers: { Cookie: cookie } });
if (forbidden.status !== 403) throw new Error(`customer reset should be forbidden, got ${forbidden.status}`);

await login("technician", "tech123");
const technicianData = await request("/data");
if (technicianData.workOrders.some((item) => item.assignee !== "陈昊" && item.assignee !== "未指派")) throw new Error("technician received another technician's work order");

await login("admin", "admin123");
await request("/reset", { method: "POST" });
console.log("API smoke test passed: auth, RBAC filtering, health, CRUD, atomic persistence and reset.");
