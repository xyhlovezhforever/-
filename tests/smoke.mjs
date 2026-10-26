import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseURL = "http://127.0.0.1:5173";
const output = resolve("test-results");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});

const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

await page.goto(baseURL, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "选择身份进入工作区" }).waitFor();
await page.screenshot({ path: resolve(output, "desktop-role-login.png"), fullPage: true });
await page.getByRole("button", { name: /管理员/ }).click();
await page.getByRole("heading", { name: "今日工作台" }).waitFor();
await page.evaluate(async () => { await fetch("/api/reset", { method: "POST" }); });
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("heading", { name: "今日工作台" }).waitFor();
await page.screenshot({ path: resolve(output, "desktop-dashboard.png"), fullPage: true });

await page.getByRole("button", { name: /设备档案/ }).click();
await page.getByRole("heading", { name: "设备档案" }).waitFor();
if ((await page.locator(".equipment-table tbody tr").count()) < 6) throw new Error("equipment seed data did not render");
await page.locator(".equipment-table tbody tr").first().click();
await page.locator(".drawer").waitFor();
await page.locator(".qr-block img").waitFor();
await page.screenshot({ path: resolve(output, "desktop-equipment-detail.png"), fullPage: true });
await page.getByRole("button", { name: "关闭" }).last().click();

await page.getByRole("button", { name: /服务工单/ }).click();
await page.locator(".order-card").first().click();
await page.locator(".drawer-wide").waitFor();
await page.locator(".order-detail-body").evaluate((element) => { element.scrollTop = element.scrollHeight; });
const signButton = page.getByRole("button", { name: "现场签字" });
if (await signButton.isVisible()) {
  await signButton.click();
  await page.getByPlaceholder("请输入签字人姓名").fill("测试客户");
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("signature canvas is not visible");
  await page.mouse.move(box.x + 35, box.y + 75);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 35, { steps: 5 });
  await page.mouse.move(box.x + 145, box.y + 100, { steps: 5 });
  await page.mouse.up();
  await page.getByRole("button", { name: "确认签字" }).click();
  await page.getByText("已确认").waitFor();
  await page.getByText("服务器已保存").waitFor({ timeout: 5000 });
  const persisted = await page.evaluate(async () => (await fetch("/api/data")).json());
  if (!persisted.workOrders.some((item) => item.customerName === "测试客户" && item.status === "已完成")) {
    throw new Error("browser changes were not persisted by the backend");
  }
}
await page.getByRole("button", { name: "查看服务报告" }).click();
await page.getByRole("heading", { name: "设备服务报告" }).waitFor();
await page.waitForTimeout(2800);
await page.screenshot({ path: resolve(output, "desktop-service-report.png"), fullPage: true });

const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (desktopOverflow > 1) throw new Error(`desktop horizontal overflow: ${desktopOverflow}px`);
await context.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobile = await mobileContext.newPage();
mobile.on("console", (message) => {
  if (message.type() === "error") errors.push(`mobile console: ${message.text()}`);
});
mobile.on("pageerror", (error) => errors.push(`mobile page: ${error.message}`));
await mobile.goto(baseURL, { waitUntil: "networkidle" });
await mobile.getByRole("button", { name: /管理员/ }).click();
await mobile.getByRole("heading", { name: "今日工作台" }).waitFor();
await mobile.screenshot({ path: resolve(output, "mobile-dashboard.png"), fullPage: true });
await mobile.getByRole("button", { name: "打开导航" }).click();
await mobile.getByRole("button", { name: /设备档案/ }).click();
await mobile.getByRole("heading", { name: "设备档案" }).waitFor();
await mobile.waitForTimeout(300);
await mobile.screenshot({ path: resolve(output, "mobile-equipment.png"), fullPage: true });
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (mobileOverflow > 1) throw new Error(`mobile horizontal overflow: ${mobileOverflow}px`);
await mobile.evaluate(async () => { await fetch("/api/reset", { method: "POST" }); });
await mobileContext.close();

const customerContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const customer = await customerContext.newPage();
await customer.goto(baseURL, { waitUntil: "networkidle" });
await customer.getByRole("button", { name: /客户/ }).click();
await customer.getByRole("heading", { name: /你好/ }).waitFor();
if ((await customer.locator(".customer-equipment-grid article").count()) !== 2) throw new Error("customer portal did not filter equipment");
await customer.screenshot({ path: resolve(output, "desktop-customer-portal.png"), fullPage: true });
await customerContext.close();

const technicianContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const technician = await technicianContext.newPage();
await technician.goto(baseURL, { waitUntil: "networkidle" });
await technician.getByRole("button", { name: /服务人员/ }).click();
await technician.getByRole("heading", { name: "我的工作台" }).waitFor();
if (await technician.getByRole("button", { name: /保养提醒/ }).count()) throw new Error("technician should not see reminder management navigation");
await technician.screenshot({ path: resolve(output, "desktop-technician-workspace.png"), fullPage: true });
await technicianContext.close();

await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
console.log("Smoke test passed: role login, admin workflow, customer portal, technician permissions, service report and responsive layouts.");
