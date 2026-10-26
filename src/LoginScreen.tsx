import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList, Headphones, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { api } from "./api";
import type { SessionUser, UserRole } from "./types";

const roleMeta: Record<UserRole, { label: string; description: string; icon: typeof ShieldCheck }> = {
  admin: { label: "管理员", description: "全局数据、权限与备份", icon: ShieldCheck },
  dispatcher: { label: "调度客服", description: "接单、派工与进度协调", icon: Headphones },
  technician: { label: "服务人员", description: "移动工单与现场记录", icon: Wrench },
  customer: { label: "客户", description: "报修、进度与验收确认", icon: UserRound },
};

export default function LoginScreen({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [accounts, setAccounts] = useState<Array<SessionUser & { password: string }>>([]);
  const [busy, setBusy] = useState<UserRole | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.demoAccounts().then(setAccounts).catch(() => setError("无法连接后端服务"));
  }, []);

  const login = async (account: SessionUser & { password: string }) => {
    setBusy(account.role);
    setError("");
    try {
      const result = await api.login(account.username, account.password);
      onLogin(result.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell">
        <header className="login-brand">
          <span><Wrench size={22} /></span>
          <div><strong>续衡</strong><small>多角色服务协作平台</small></div>
        </header>
        <div className="login-intro">
          <span className="login-kicker"><ClipboardList size={15} />角色化工作入口</span>
          <h1>选择身份进入工作区</h1>
          <p>同一张服务单，在客户、调度、服务人员和管理员之间流转。演示账号仅用于本地验证。</p>
        </div>
        <div className="role-login-list">
          {(Object.keys(roleMeta) as UserRole[]).map((role) => {
            const account = accounts.find((item) => item.role === role);
            const meta = roleMeta[role];
            const Icon = meta.icon;
            return (
              <button type="button" key={role} disabled={!account || busy !== null} onClick={() => account && login(account)}>
                <span className={`role-icon role-${role}`}><Icon size={20} /></span>
                <span><b>{meta.label}</b><small>{meta.description}</small></span>
                <em>{busy === role ? "登录中" : account?.name || "加载中"}</em>
                <ArrowRight size={18} />
              </button>
            );
          })}
        </div>
        {error && <div className="login-error">{error}</div>}
        <footer>本地演示环境 · 会话由后端 HttpOnly Cookie 管理</footer>
      </section>
    </main>
  );
}
