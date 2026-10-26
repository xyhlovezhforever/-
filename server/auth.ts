import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { SessionUser, UserRole } from "../src/types.js";

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

interface DemoAccount extends SessionUser {
  password: string;
}

const accounts: DemoAccount[] = [
  { id: "u-admin", username: "admin", password: "admin123", name: "林管理员", role: "admin" },
  { id: "u-dispatch", username: "dispatcher", password: "dispatch123", name: "周调度", role: "dispatcher" },
  { id: "u-tech", username: "technician", password: "tech123", name: "陈昊", role: "technician", technicianName: "陈昊" },
  { id: "u-customer", username: "customer", password: "customer123", name: "林店长", role: "customer", clientId: "c-01" },
];

const secret = process.env.SESSION_SECRET || "xuheng-development-secret-change-in-production";
const cookieName = "xuheng_session";

function signature(payload: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createToken(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Date.now() + 12 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function readCookie(request: Request, name: string) {
  const raw = request.headers.cookie || "";
  return raw.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}

function verifyToken(token: string): SessionUser | undefined {
  const [payload, provided] = token.split(".");
  if (!payload || !provided) return undefined;
  const expected = signature(payload);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return undefined;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    if (!decoded.sub || !decoded.exp || decoded.exp < Date.now()) return undefined;
    const account = accounts.find((item) => item.id === decoded.sub);
    if (!account) return undefined;
    const { password: _password, ...user } = account;
    return user;
  } catch {
    return undefined;
  }
}

export function login(username: string, password: string): SessionUser | undefined {
  const account = accounts.find((item) => item.username === username && item.password === password);
  if (!account) return undefined;
  const { password: _password, ...user } = account;
  return user;
}

export function setSession(response: Response, user: SessionUser) {
  response.setHeader("Set-Cookie", `${cookieName}=${createToken(user)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`);
}

export function clearSession(response: Response) {
  response.setHeader("Set-Cookie", `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

export function authenticate(request: Request, response: Response, next: NextFunction) {
  const user = getSessionUser(request);
  if (!user) return response.status(401).json({ error: "请先登录" });
  request.user = user;
  next();
}

export function getSessionUser(request: Request) {
  const token = readCookie(request, cookieName);
  return token ? verifyToken(token) : undefined;
}

export function allowRoles(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user || !roles.includes(request.user.role)) return response.status(403).json({ error: "当前角色无权执行此操作" });
    next();
  };
}

export const demoAccounts = accounts.map(({ password, ...user }) => ({ ...user, password }));
