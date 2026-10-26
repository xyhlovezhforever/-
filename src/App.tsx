import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import {
  AlertTriangle,
  Bell,
  Boxes,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Columns3,
  Database,
  Download,
  FileText,
  LayoutDashboard,
  List,
  LogOut,
  MapPin,
  Menu,
  PackageOpen,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  Timer,
  Upload,
  UserRoundCheck,
  Wrench,
  X,
} from "lucide-react";
import { seedData } from "./data";
import { api } from "./api";
import CustomerPortal from "./CustomerPortal";
import LoginScreen from "./LoginScreen";
import type {
  AppData,
  Equipment,
  EquipmentStatus,
  Priority,
  SessionUser,
  WorkOrder,
  WorkOrderStatus,
} from "./types";

type View = "dashboard" | "equipment" | "workOrders" | "reminders";
type ModalName = "equipment" | "workOrder" | "data" | null;

const workOrderStatuses: WorkOrderStatus[] = ["待派工", "处理中", "待确认", "已完成"];

function dateLabel(value: string) {
  if (!value) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function fullDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(`${value}T12:00:00`));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysFromToday(value: string) {
  const target = new Date(`${value}T12:00:00`).getTime();
  const now = new Date(`${todayIso()}T12:00:00`).getTime();
  return Math.round((target - now) / 86_400_000);
}

function maintenanceLabel(value: string) {
  const days = daysFromToday(value);
  if (days < 0) return `逾期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天到期";
  return `${days} 天后`;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function equipmentName(item: Equipment) {
  return `${item.category} · ${item.brand} ${item.model}`;
}

function priorityClass(priority: Priority) {
  return priority === "紧急" ? "danger" : priority === "普通" ? "warning" : "neutral";
}

function statusIcon(status: WorkOrderStatus) {
  if (status === "已完成") return <CheckCircle2 size={15} />;
  if (status === "处理中") return <Wrench size={15} />;
  if (status === "待确认") return <UserRoundCheck size={15} />;
  return <Clock3 size={15} />;
}

function IconButton({ label, children, onClick, className = "" }: { label: string; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button className={`icon-button ${className}`} type="button" onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function Modal({ title, description, onClose, children, wide = false }: { title: string; description?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton label="关闭" onClick={onClose}><X size={20} /></IconButton>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}

function QRPreview({ equipment }: { equipment: Equipment }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const value = `${window.location.origin}${window.location.pathname}?equipment=${encodeURIComponent(equipment.id)}`;
    QRCode.toDataURL(value, { width: 280, margin: 1, color: { dark: "#173f3a", light: "#ffffff" } }).then(setSrc);
  }, [equipment.id]);
  return (
    <div className="qr-block">
      {src ? <img src={src} alt={`${equipment.id} 设备二维码`} /> : <div className="qr-loading">生成中</div>}
      <strong>{equipment.id}</strong>
      <span>{equipment.category} · {equipment.site}</span>
    </div>
  );
}

function SignaturePad({ onSave, onCancel }: { onSave: (signature: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const context = canvas.getContext("2d");
    context?.scale(ratio, ratio);
    if (context) {
      context.lineWidth = 2.2;
      context.lineCap = "round";
      context.strokeStyle = "#153f3a";
    }
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    const p = point(event);
    context?.beginPath();
    context?.moveTo(p.x, p.y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    const p = point(event);
    context?.lineTo(p.x, p.y);
    context?.stroke();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="signature-editor">
      <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} />
      <div className="modal-actions split-actions">
        <button className="button ghost" type="button" onClick={clear}><RotateCcw size={16} />重签</button>
        <div>
          <button className="button ghost" type="button" onClick={onCancel}>取消</button>
          <button className="button primary" type="button" onClick={() => canvasRef.current && onSave(canvasRef.current.toDataURL("image/png"))}><Check size={16} />确认签字</button>
        </div>
      </div>
    </div>
  );
}

async function resizePhoto(file: File) {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const item = new Image();
    item.onload = () => resolve(item);
    item.onerror = reject;
    item.src = source;
  });
  const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function App() {
  const [data, setData] = useState<AppData>(seedData);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const [view, setView] = useState<View>("dashboard");
  const [modal, setModal] = useState<ModalName>(null);
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [reportOrderId, setReportOrderId] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [toast, setToast] = useState("");
  const [orderLayout, setOrderLayout] = useState<"board" | "list">("board");
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentStatus | "全部">("全部");
  const importRef = useRef<HTMLInputElement>(null);
  const saveTimers = useRef<Record<string, number>>({});
  const pendingOrderPatches = useRef<Record<string, Partial<WorkOrder>>>({});

  const loadWorkspace = async (activeUser: SessionUser) => {
    try {
      setUser(activeUser);
      setSyncStatus("loading");
      const serverData = await api.getData();
      setData(serverData);
      setSyncStatus("saved");
      setAuthReady(true);
    } catch (error) {
      setUser(null);
      setSyncStatus("error");
      setAuthReady(true);
      throw error;
    }
  };

  useEffect(() => {
    let active = true;
    api.me()
      .then(async ({ user: activeUser }) => {
        if (!activeUser) {
          if (active) setAuthReady(true);
          return;
        }
        const serverData = await api.getData();
        if (!active) return;
        setUser(activeUser);
        setData(serverData);
        setSyncStatus("saved");
        setAuthReady(true);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setAuthReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const equipmentId = new URLSearchParams(window.location.search).get("equipment");
    if (equipmentId && data.equipment.some((item) => item.id === equipmentId)) {
      setView("equipment");
      setSelectedEquipmentId(equipmentId);
    }
  }, [data.equipment]);

  const clientsById = useMemo(() => Object.fromEntries(data.clients.map((item) => [item.id, item])), [data.clients]);
  const equipmentById = useMemo(() => Object.fromEntries(data.equipment.map((item) => [item.id, item])), [data.equipment]);
  const selectedEquipment = selectedEquipmentId ? equipmentById[selectedEquipmentId] : undefined;
  const selectedOrder = selectedOrderId ? data.workOrders.find((item) => item.id === selectedOrderId) : undefined;
  const reportOrder = reportOrderId ? data.workOrders.find((item) => item.id === reportOrderId) : undefined;

  const openOrders = data.workOrders.filter((item) => item.status !== "已完成");
  const dueEquipment = data.equipment.filter((item) => daysFromToday(item.nextMaintenance) <= 14).sort((a, b) => a.nextMaintenance.localeCompare(b.nextMaintenance));
  const attentionEquipment = data.equipment.filter((item) => item.status !== "运行中");
  const completionRate = Math.round((data.workOrders.filter((item) => item.status === "已完成").length / data.workOrders.length) * 100);

  const filteredEquipment = data.equipment.filter((item) => {
    const client = clientsById[item.clientId];
    const haystack = `${item.id} ${item.category} ${item.brand} ${item.model} ${item.serial} ${item.site} ${client?.name}`.toLowerCase();
    return (equipmentFilter === "全部" || item.status === equipmentFilter) && haystack.includes(search.toLowerCase());
  });

  const filteredOrders = data.workOrders.filter((item) => {
    const equipment = equipmentById[item.equipmentId];
    const client = equipment ? clientsById[equipment.clientId] : undefined;
    return `${item.id} ${item.title} ${item.assignee} ${equipment?.category} ${client?.name}`.toLowerCase().includes(search.toLowerCase());
  });

  const patchOrder = (id: string, patch: Partial<WorkOrder>) => {
    setData((current) => ({ ...current, workOrders: current.workOrders.map((item) => item.id === id ? { ...item, ...patch } : item) }));
    pendingOrderPatches.current[id] = { ...pendingOrderPatches.current[id], ...patch };
    window.clearTimeout(saveTimers.current[id]);
    setSyncStatus("saving");
    saveTimers.current[id] = window.setTimeout(() => {
      const pending = pendingOrderPatches.current[id];
      delete pendingOrderPatches.current[id];
      api.patchWorkOrder(id, pending)
        .then(() => setSyncStatus("saved"))
        .catch(() => {
          setSyncStatus("error");
          setToast("工单保存失败，请检查权限或连接");
        });
    }, 420);
  };

  const addPhotos = async (event: React.ChangeEvent<HTMLInputElement>, kind: "beforePhotos" | "afterPhotos") => {
    if (!selectedOrder || !event.target.files?.length) return;
    const photos = await Promise.all(Array.from(event.target.files).slice(0, 4).map(resizePhoto));
    patchOrder(selectedOrder.id, { [kind]: [...selectedOrder[kind], ...photos].slice(0, 6) });
    setToast("照片已保存到工单");
    event.target.value = "";
  };

  const addEquipment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const item: Equipment = {
      id: makeId("EQ"),
      clientId: String(form.get("clientId")),
      site: String(form.get("site")),
      category: String(form.get("category")),
      brand: String(form.get("brand")),
      model: String(form.get("model")),
      serial: String(form.get("serial")),
      installedAt: String(form.get("installedAt")),
      nextMaintenance: String(form.get("nextMaintenance")),
      status: "运行中",
    };
    try {
      setSyncStatus("saving");
      await api.createEquipment(item);
      setData((current) => ({ ...current, equipment: [item, ...current.equipment] }));
      setSyncStatus("saved");
      setModal(null);
      setView("equipment");
      setSelectedEquipmentId(item.id);
      setToast("设备档案已建立");
    } catch {
      setSyncStatus("error");
      setToast("设备建档失败，请检查权限或连接");
    }
  };

  const addWorkOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const order: WorkOrder = {
      id: makeId("WO"),
      equipmentId: String(form.get("equipmentId")),
      title: String(form.get("title")),
      description: String(form.get("description")),
      priority: String(form.get("priority")) as Priority,
      status: "待派工",
      assignee: String(form.get("assignee") || "未指派"),
      createdAt: todayIso(),
      scheduledAt: String(form.get("scheduledAt")),
      diagnosis: "",
      solution: "",
      laborHours: 0,
      parts: [],
      beforePhotos: [],
      afterPhotos: [],
    };
    try {
      setSyncStatus("saving");
      await api.createWorkOrder(order);
      setData((current) => ({ ...current, workOrders: [order, ...current.workOrders] }));
      setSyncStatus("saved");
      setModal(null);
      setView("workOrders");
      setSelectedOrderId(order.id);
      setToast("工单已创建");
    } catch {
      setSyncStatus("error");
      setToast("工单创建失败，请检查权限或连接");
    }
  };

  const createCustomerRequest = async (equipmentId: string, title: string, description: string, priority: Priority) => {
    const order: WorkOrder = { id: makeId("WO"), equipmentId, title, description, priority, status: "待派工", assignee: "未指派", createdAt: todayIso(), scheduledAt: todayIso(), diagnosis: "", solution: "", laborHours: 0, parts: [], beforePhotos: [], afterPhotos: [] };
    try {
      setSyncStatus("saving");
      await api.createWorkOrder(order);
      setData((current) => ({ ...current, workOrders: [order, ...current.workOrders] }));
      setSyncStatus("saved");
      setToast("服务请求已提交");
    } catch {
      setSyncStatus("error");
      setToast("服务请求提交失败");
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `续衡数据备份-${todayIso()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setToast("数据备份已下载");
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text()) as AppData;
      if (!Array.isArray(imported.clients) || !Array.isArray(imported.equipment) || !Array.isArray(imported.workOrders)) throw new Error("invalid");
      const restored = { ...imported, version: 1 } as AppData;
      await api.saveData(restored);
      setData(restored);
      setModal(null);
      setToast("数据已恢复");
    } catch {
      setToast("无法导入：文件格式不正确");
    }
    event.target.value = "";
  };

  const resetData = async () => {
    try {
      const fresh = await api.resetData();
      setData(fresh);
      setSelectedEquipmentId(null);
      setSelectedOrderId(null);
      setModal(null);
      setToast("服务器已恢复演示数据");
    } catch {
      setToast("恢复失败，请检查后端连接");
    }
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    setData(seedData);
    setView("dashboard");
    setSelectedEquipmentId(null);
    setSelectedOrderId(null);
    setReportOrderId(null);
  };

  const navigation = [
    { id: "dashboard" as const, label: "工作台", icon: LayoutDashboard },
    { id: "equipment" as const, label: "设备档案", icon: Boxes, count: attentionEquipment.length },
    { id: "workOrders" as const, label: "服务工单", icon: ClipboardList, count: openOrders.length },
    { id: "reminders" as const, label: "保养提醒", icon: Bell, count: dueEquipment.length },
  ].filter((item) => user?.role !== "technician" || item.id !== "reminders");

  const navigate = (target: View) => {
    setView(target);
    setMobileNav(false);
    setSearch("");
  };

  const viewTitles: Record<View, { title: string; subtitle: string }> = {
    dashboard: { title: user?.role === "technician" ? "我的工作台" : "今日工作台", subtitle: user?.role === "technician" ? "分配给我的任务与现场服务" : "设备状态、待办工单与保养风险" },
    equipment: { title: "设备档案", subtitle: "客户、地点与设备的完整服务历史" },
    workOrders: { title: "服务工单", subtitle: "从报修到客户确认的现场闭环" },
    reminders: { title: "保养提醒", subtitle: "按到期风险安排主动服务" },
  };

  if (!authReady) return <div className="auth-loading"><Wrench size={24} /><span>正在连接续衡服务</span></div>;
  if (!user) return <LoginScreen onLogin={(activeUser) => loadWorkspace(activeUser).catch(() => setToast("无法加载角色工作区"))} />;
  if (user.role === "customer") {
    return <><CustomerPortal user={user} data={data} syncStatus={syncStatus} onLogout={logout} onCreateRequest={createCustomerRequest} onConfirm={(order, signature) => patchOrder(order.id, { customerName: user.name, customerSignature: signature, signedAt: todayIso(), status: "已完成", completedAt: todayIso() })} onReport={(order) => setReportOrderId(order.id)} />{reportOrder && <ServiceReport order={reportOrder} equipment={equipmentById[reportOrder.equipmentId]} client={clientsById[equipmentById[reportOrder.equipmentId]?.clientId]} onClose={() => setReportOrderId(null)} />}{toast && <div className="toast"><Check size={16} />{toast}</div>}</>;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Wrench size={20} /></div>
          <div><strong>续衡</strong><span>{user.role === "technician" ? "服务人员工作端" : user.role === "dispatcher" ? "调度协作工作台" : "设备维保管理端"}</span></div>
        </div>
        <nav aria-label="主导航">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}>
                <Icon size={19} />
                <span>{item.label}</span>
                {Boolean(item.count) && <b>{item.count}</b>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          {user.role === "admin" && <button type="button" onClick={() => setModal("data")}><Database size={18} /><span>数据与备份</span></button>}
          <div className="sidebar-user"><div><b>{user.name}</b><span>{user.role === "admin" ? "管理员" : user.role === "dispatcher" ? "调度客服" : "服务人员"}</span></div><IconButton label="退出登录" onClick={logout}><LogOut size={17} /></IconButton></div>
          <div className={`storage-status sync-${syncStatus}`}><span></span>{syncStatus === "loading" ? "正在连接服务器" : syncStatus === "saving" ? "正在保存" : syncStatus === "saved" ? "服务器已保存" : "服务器连接异常"}</div>
        </div>
      </aside>
      {mobileNav && <button className="nav-scrim" aria-label="关闭导航" onClick={() => setMobileNav(false)} />}

      <main className="workspace">
        <header className="topbar">
          <div className="page-heading">
            <IconButton label="打开导航" className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20} /></IconButton>
            <div><h1>{viewTitles[view].title}</h1><p>{viewTitles[view].subtitle}</p></div>
          </div>
          <div className="topbar-actions">
            {(view === "equipment" || view === "workOrders") && (
              <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索编号、客户或设备" /></label>
            )}
            {user.role !== "technician" && <button className="button primary" type="button" onClick={() => setModal(view === "equipment" ? "equipment" : "workOrder")}>
              <Plus size={17} />{view === "equipment" ? "新增设备" : "新建工单"}
            </button>}
          </div>
        </header>

        {view === "dashboard" && (
          <div className="content dashboard-content">
            <section className="metric-strip" aria-label="运营概况">
              <div><span className="metric-icon red"><AlertTriangle size={18} /></span><p>待处理工单</p><strong>{openOrders.length}</strong><small>{openOrders.filter((item) => item.priority === "紧急").length} 项紧急</small></div>
              <div><span className="metric-icon amber"><CalendarDays size={18} /></span><p>14 天内保养</p><strong>{dueEquipment.length}</strong><small>{dueEquipment.filter((item) => daysFromToday(item.nextMaintenance) < 0).length} 台已逾期</small></div>
              <div><span className="metric-icon green"><Boxes size={18} /></span><p>在管设备</p><strong>{data.equipment.length}</strong><small>{data.clients.length} 个客户</small></div>
              <div><span className="metric-icon blue"><CheckCircle2 size={18} /></span><p>工单完成率</p><strong>{completionRate}%</strong><small>基于当前记录</small></div>
            </section>

            <div className={`dashboard-grid ${user.role === "technician" ? "single" : ""}`}>
              <section className="panel work-focus">
                <div className="section-header"><div><h2>今日优先事项</h2><p>按风险与计划时间排序</p></div><button className="text-button" onClick={() => navigate("workOrders")}>查看全部<ChevronRight size={15} /></button></div>
                <div className="focus-list">
                  {openOrders.slice(0, 4).map((order) => {
                    const equipment = equipmentById[order.equipmentId];
                    const client = equipment && clientsById[equipment.clientId];
                    return (
                      <button key={order.id} type="button" className="focus-row" onClick={() => { setSelectedOrderId(order.id); setView("workOrders"); }}>
                        <span className={`priority-line ${priorityClass(order.priority)}`}></span>
                        <div className="focus-main"><div><b>{order.title}</b><span className={`badge ${priorityClass(order.priority)}`}>{order.priority}</span></div><p>{client?.name} · {equipment?.category}</p></div>
                        <div className="focus-meta"><span>{order.assignee}</span><small>{dateLabel(order.scheduledAt)}</small></div>
                        <ChevronRight size={18} />
                      </button>
                    );
                  })}
                </div>
              </section>

              {user.role !== "technician" && <section className="panel maintenance-focus">
                <div className="section-header"><div><h2>保养窗口</h2><p>未来 14 天与已逾期设备</p></div><button className="text-button" onClick={() => navigate("reminders")}>安排服务<ChevronRight size={15} /></button></div>
                <div className="timeline-list">
                  {dueEquipment.slice(0, 5).map((item) => {
                    const overdue = daysFromToday(item.nextMaintenance) < 0;
                    return (
                      <button key={item.id} type="button" onClick={() => { setSelectedEquipmentId(item.id); setView("equipment"); }}>
                        <span className={overdue ? "timeline-dot overdue" : "timeline-dot"}></span>
                        <div><b>{item.category}</b><small>{clientsById[item.clientId]?.name} · {item.site}</small></div>
                        <em className={overdue ? "overdue-text" : ""}>{maintenanceLabel(item.nextMaintenance)}</em>
                      </button>
                    );
                  })}
                </div>
              </section>}
            </div>

            <section className="panel recent-section">
              <div className="section-header"><div><h2>最近服务记录</h2><p>用于交接、结算和客户回访</p></div><span className={`sync-note sync-${syncStatus}`}><span></span>{syncStatus === "saved" ? "已同步到服务器" : syncStatus === "saving" ? "正在同步" : syncStatus === "error" ? "同步异常" : "正在连接"}</span></div>
              <div className="recent-table table-scroll">
                <table>
                  <thead><tr><th>工单</th><th>客户 / 设备</th><th>服务内容</th><th>负责人</th><th>状态</th><th>计划日期</th></tr></thead>
                  <tbody>{data.workOrders.slice(0, 5).map((order) => {
                    const equipment = equipmentById[order.equipmentId];
                    return <tr key={order.id} onClick={() => { setSelectedOrderId(order.id); setView("workOrders"); }}><td><code>{order.id}</code></td><td><b>{clientsById[equipment?.clientId]?.name}</b><small>{equipment?.category} · {equipment?.site}</small></td><td>{order.title}</td><td>{order.assignee}</td><td><span className={`status status-${order.status}`}>{statusIcon(order.status)}{order.status}</span></td><td>{fullDate(order.scheduledAt)}</td></tr>;
                  })}</tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {view === "equipment" && (
          <div className="content">
            <div className="toolbar-row">
              <div className="segmented">
                {(["全部", "运行中", "需关注", "停机"] as const).map((status) => <button key={status} className={equipmentFilter === status ? "active" : ""} onClick={() => setEquipmentFilter(status)}>{status}<span>{status === "全部" ? data.equipment.length : data.equipment.filter((item) => item.status === status).length}</span></button>)}
              </div>
              <span className="result-count">显示 {filteredEquipment.length} 台设备</span>
            </div>
            <section className="panel equipment-panel">
              <div className="table-scroll">
                <table className="equipment-table">
                  <thead><tr><th>设备</th><th>客户与位置</th><th>编号 / 序列号</th><th>下次保养</th><th>状态</th><th></th></tr></thead>
                  <tbody>{filteredEquipment.map((item) => {
                    const overdue = daysFromToday(item.nextMaintenance) < 0;
                    return (
                      <tr key={item.id} onClick={() => setSelectedEquipmentId(item.id)}>
                        <td><div className="equipment-cell-icon"><Wrench size={18} /></div><div><b>{item.category}</b><small>{item.brand} {item.model}</small></div></td>
                        <td><b>{clientsById[item.clientId]?.name}</b><small><MapPin size={12} />{item.site}</small></td>
                        <td><code>{item.id}</code><small>{item.serial}</small></td>
                        <td><b className={overdue ? "overdue-text" : ""}>{maintenanceLabel(item.nextMaintenance)}</b><small>{fullDate(item.nextMaintenance)}</small></td>
                        <td><span className={`equipment-status ${item.status === "运行中" ? "ok" : item.status === "需关注" ? "attention" : "stopped"}`}><span></span>{item.status}</span></td>
                        <td><ChevronRight size={18} /></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              {!filteredEquipment.length && <div className="empty-state"><Search size={26} /><b>没有找到设备</b><span>请更换筛选条件或搜索词。</span></div>}
            </section>
          </div>
        )}

        {view === "workOrders" && (
          <div className="content workorders-page">
            <div className="toolbar-row">
              <div className="segmented compact">
                <button className={orderLayout === "board" ? "active" : ""} onClick={() => setOrderLayout("board")}><Columns3 size={15} />看板</button>
                <button className={orderLayout === "list" ? "active" : ""} onClick={() => setOrderLayout("list")}><List size={15} />列表</button>
              </div>
              <span className="result-count">{filteredOrders.length} 张工单</span>
            </div>
            {orderLayout === "board" ? (
              <div className="kanban">
                {workOrderStatuses.map((status) => (
                  <section className="kanban-column" key={status}>
                    <header><span className={`column-dot dot-${status}`}></span><h2>{status}</h2><b>{filteredOrders.filter((item) => item.status === status).length}</b></header>
                    <div className="kanban-stack">
                      {filteredOrders.filter((item) => item.status === status).map((order) => {
                        const equipment = equipmentById[order.equipmentId];
                        return (
                          <button className="order-card" type="button" key={order.id} onClick={() => setSelectedOrderId(order.id)}>
                            <div className="order-card-top"><code>{order.id}</code><span className={`badge ${priorityClass(order.priority)}`}>{order.priority}</span></div>
                            <h3>{order.title}</h3>
                            <p>{clientsById[equipment?.clientId]?.name}</p>
                            <div className="order-equipment"><Wrench size={14} />{equipment?.category} · {equipment?.site}</div>
                            <footer><span><CalendarDays size={14} />{dateLabel(order.scheduledAt)}</span><span className="assignee-avatar">{order.assignee.slice(0, 1)}</span></footer>
                          </button>
                        );
                      })}
                      {!filteredOrders.some((item) => item.status === status) && <div className="column-empty">暂无工单</div>}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <section className="panel table-scroll"><table><thead><tr><th>工单</th><th>客户 / 设备</th><th>问题</th><th>负责人</th><th>状态</th><th>计划日期</th></tr></thead><tbody>{filteredOrders.map((order) => { const equipment = equipmentById[order.equipmentId]; return <tr key={order.id} onClick={() => setSelectedOrderId(order.id)}><td><code>{order.id}</code></td><td><b>{clientsById[equipment?.clientId]?.name}</b><small>{equipmentName(equipment)}</small></td><td>{order.title}</td><td>{order.assignee}</td><td><span className={`status status-${order.status}`}>{statusIcon(order.status)}{order.status}</span></td><td>{fullDate(order.scheduledAt)}</td></tr>; })}</tbody></table></section>
            )}
          </div>
        )}

        {view === "reminders" && (
          <div className="content reminders-page">
            <section className="reminder-summary">
              <div><AlertTriangle size={19} /><span>已逾期</span><strong>{data.equipment.filter((item) => daysFromToday(item.nextMaintenance) < 0).length}</strong></div>
              <div><CalendarDays size={19} /><span>7 天内</span><strong>{data.equipment.filter((item) => { const d = daysFromToday(item.nextMaintenance); return d >= 0 && d <= 7; }).length}</strong></div>
              <div><Clock3 size={19} /><span>30 天内</span><strong>{data.equipment.filter((item) => { const d = daysFromToday(item.nextMaintenance); return d > 7 && d <= 30; }).length}</strong></div>
            </section>
            <section className="panel reminder-list-panel">
              <div className="section-header"><div><h2>待安排保养</h2><p>按到期日期从近到远排列</p></div></div>
              <div className="reminder-list">
                {[...data.equipment].sort((a, b) => a.nextMaintenance.localeCompare(b.nextMaintenance)).map((item) => {
                  const days = daysFromToday(item.nextMaintenance);
                  const existing = data.workOrders.find((order) => order.equipmentId === item.id && order.status !== "已完成" && order.title.includes("保养"));
                  return (
                    <div className="reminder-row" key={item.id}>
                      <div className={`date-tile ${days < 0 ? "overdue" : days <= 7 ? "soon" : ""}`}><b>{new Date(`${item.nextMaintenance}T12:00:00`).getDate()}</b><span>{new Intl.DateTimeFormat("zh-CN", { month: "short" }).format(new Date(`${item.nextMaintenance}T12:00:00`))}</span></div>
                      <div className="reminder-main"><h3>{item.category}<span className={`equipment-status ${item.status === "运行中" ? "ok" : "attention"}`}><span></span>{item.status}</span></h3><p>{clientsById[item.clientId]?.name} · {item.site}</p><small>{item.brand} {item.model} · {item.id}</small></div>
                      <div className="reminder-date"><b className={days < 0 ? "overdue-text" : ""}>{maintenanceLabel(item.nextMaintenance)}</b><span>计划日期 {fullDate(item.nextMaintenance)}</span></div>
                      {existing ? <button className="button ghost" onClick={() => { setSelectedOrderId(existing.id); setView("workOrders"); }}>查看工单</button> : <button className="button secondary" onClick={() => { setSelectedEquipmentId(item.id); setModal("workOrder"); }}><Plus size={16} />生成工单</button>}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      {selectedEquipment && (
        <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedEquipmentId(null)}>
          <aside className="drawer">
            <header className="drawer-header"><div><span className={`equipment-status ${selectedEquipment.status === "运行中" ? "ok" : "attention"}`}><span></span>{selectedEquipment.status}</span><h2>{selectedEquipment.category}</h2><p>{selectedEquipment.brand} {selectedEquipment.model}</p></div><IconButton label="关闭" onClick={() => setSelectedEquipmentId(null)}><X size={20} /></IconButton></header>
            <div className="drawer-body">
              <div className="drawer-actions">{user.role !== "technician" && <button className="button primary" onClick={() => setModal("workOrder")}><Plus size={16} />新建工单</button>}<button className="button ghost" onClick={() => document.getElementById("equipment-qr")?.scrollIntoView({ behavior: "smooth" })}><QrCode size={16} />设备码</button></div>
              <section className="detail-section"><h3>设备信息</h3><dl className="detail-grid"><div><dt>设备编号</dt><dd>{selectedEquipment.id}</dd></div><div><dt>序列号</dt><dd>{selectedEquipment.serial}</dd></div><div><dt>安装日期</dt><dd>{fullDate(selectedEquipment.installedAt)}</dd></div><div><dt>下次保养</dt><dd>{fullDate(selectedEquipment.nextMaintenance)}</dd></div></dl></section>
              <section className="detail-section"><h3>客户与位置</h3><div className="client-detail"><b>{clientsById[selectedEquipment.clientId]?.name}</b><span>{clientsById[selectedEquipment.clientId]?.contact} · {clientsById[selectedEquipment.clientId]?.phone}</span><span><MapPin size={14} />{clientsById[selectedEquipment.clientId]?.address} · {selectedEquipment.site}</span></div></section>
              <section className="detail-section"><h3>服务历史</h3><div className="history-list">{data.workOrders.filter((item) => item.equipmentId === selectedEquipment.id).map((order) => <button key={order.id} onClick={() => { setSelectedEquipmentId(null); setSelectedOrderId(order.id); setView("workOrders"); }}><span className={`history-icon status-${order.status}`}>{statusIcon(order.status)}</span><div><b>{order.title}</b><small>{order.id} · {fullDate(order.createdAt)} · {order.assignee}</small></div><ChevronRight size={17} /></button>)}{!data.workOrders.some((item) => item.equipmentId === selectedEquipment.id) && <div className="empty-inline">暂无服务记录</div>}</div></section>
              <section className="detail-section" id="equipment-qr"><h3>设备二维码</h3><QRPreview equipment={selectedEquipment} /><p className="detail-note">打印并粘贴到设备上，扫码可直接打开该设备档案。</p></section>
            </div>
          </aside>
        </div>
      )}

      {selectedOrder && (
        <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedOrderId(null)}>
          <aside className="drawer drawer-wide">
            <header className="drawer-header"><div><div className="order-title-line"><code>{selectedOrder.id}</code><span className={`badge ${priorityClass(selectedOrder.priority)}`}>{selectedOrder.priority}</span></div><h2>{selectedOrder.title}</h2><p>{clientsById[equipmentById[selectedOrder.equipmentId]?.clientId]?.name} · {equipmentById[selectedOrder.equipmentId]?.category}</p></div><IconButton label="关闭" onClick={() => { setSelectedOrderId(null); setSigning(false); }}><X size={20} /></IconButton></header>
            <div className="drawer-body order-detail-body">
              <div className="order-status-track">{workOrderStatuses.map((status) => <button key={status} className={selectedOrder.status === status ? "active" : ""} onClick={() => patchOrder(selectedOrder.id, { status, completedAt: status === "已完成" ? todayIso() : selectedOrder.completedAt })}>{statusIcon(status)}<span>{status}</span></button>)}</div>
              <section className="detail-section"><div className="section-inline-title"><h3>现场记录</h3><span>自动保存</span></div><label className="field"><span>报修描述</span><textarea value={selectedOrder.description} onChange={(event) => patchOrder(selectedOrder.id, { description: event.target.value })} /></label><div className="field-pair"><label className="field"><span>故障判断</span><textarea value={selectedOrder.diagnosis} placeholder="记录检测结果与故障原因" onChange={(event) => patchOrder(selectedOrder.id, { diagnosis: event.target.value })} /></label><label className="field"><span>处理结果</span><textarea value={selectedOrder.solution} placeholder="记录已完成与遗留事项" onChange={(event) => patchOrder(selectedOrder.id, { solution: event.target.value })} /></label></div><div className="field-pair"><label className="field"><span>负责人</span><input value={selectedOrder.assignee} readOnly={user.role === "technician"} onChange={(event) => patchOrder(selectedOrder.id, { assignee: event.target.value })} /></label><label className="field"><span>工时（小时）</span><input type="number" min="0" step="0.5" value={selectedOrder.laborHours} onChange={(event) => patchOrder(selectedOrder.id, { laborHours: Number(event.target.value) })} /></label></div></section>
              <section className="detail-section"><h3>现场照片</h3><div className="photo-columns"><PhotoGroup label="维修前" photos={selectedOrder.beforePhotos} onUpload={(event) => addPhotos(event, "beforePhotos")} onRemove={(index) => patchOrder(selectedOrder.id, { beforePhotos: selectedOrder.beforePhotos.filter((_, i) => i !== index) })} /><PhotoGroup label="维修后" photos={selectedOrder.afterPhotos} onUpload={(event) => addPhotos(event, "afterPhotos")} onRemove={(index) => patchOrder(selectedOrder.id, { afterPhotos: selectedOrder.afterPhotos.filter((_, i) => i !== index) })} /></div></section>
              <section className="detail-section"><div className="section-inline-title"><h3>配件与费用</h3><button className="text-button" onClick={() => patchOrder(selectedOrder.id, { parts: [...selectedOrder.parts, { id: makeId("P"), name: "新配件", quantity: 1, price: 0 }] })}><Plus size={15} />添加配件</button></div>{selectedOrder.parts.length ? <div className="parts-list">{selectedOrder.parts.map((part) => <div key={part.id}><input value={part.name} onChange={(event) => patchOrder(selectedOrder.id, { parts: selectedOrder.parts.map((item) => item.id === part.id ? { ...item, name: event.target.value } : item) })} /><input aria-label="数量" type="number" min="1" value={part.quantity} onChange={(event) => patchOrder(selectedOrder.id, { parts: selectedOrder.parts.map((item) => item.id === part.id ? { ...item, quantity: Number(event.target.value) } : item) })} /><input aria-label="单价" type="number" min="0" value={part.price} onChange={(event) => patchOrder(selectedOrder.id, { parts: selectedOrder.parts.map((item) => item.id === part.id ? { ...item, price: Number(event.target.value) } : item) })} /><b>¥{(part.quantity * part.price).toFixed(2)}</b><IconButton label="删除配件" onClick={() => patchOrder(selectedOrder.id, { parts: selectedOrder.parts.filter((item) => item.id !== part.id) })}><X size={16} /></IconButton></div>)}</div> : <div className="empty-inline"><PackageOpen size={20} />暂无更换配件</div>}</section>
              <section className="detail-section"><div className="section-inline-title"><h3>客户确认</h3>{selectedOrder.signedAt && <span className="signed-tag"><Check size={14} />已确认</span>}</div>{selectedOrder.customerSignature ? <div className="signature-result"><img src={selectedOrder.customerSignature} alt="客户签字" /><div><b>{selectedOrder.customerName || "客户代表"}</b><span>{fullDate(selectedOrder.signedAt || "")}</span></div><button className="text-button" onClick={() => setSigning(true)}>重新签字</button></div> : signing ? <SignaturePad onCancel={() => setSigning(false)} onSave={(signature) => { patchOrder(selectedOrder.id, { customerSignature: signature, signedAt: todayIso(), customerName: selectedOrder.customerName || "客户代表", status: "已完成", completedAt: todayIso() }); setSigning(false); setToast("客户签字已保存"); }} /> : <div className="signing-prompt"><UserRoundCheck size={24} /><div><b>尚未获得客户确认</b><span>确认完成内容、遗留事项与责任边界。</span></div><button className="button secondary" onClick={() => setSigning(true)}>现场签字</button></div>} {signing && <label className="field compact-field"><span>客户姓名</span><input value={selectedOrder.customerName || ""} onChange={(event) => patchOrder(selectedOrder.id, { customerName: event.target.value })} placeholder="请输入签字人姓名" /></label>}</section>
            </div>
            <footer className="drawer-footer"><span>最后修改将自动保存到服务器</span><button className="button primary" onClick={() => setReportOrderId(selectedOrder.id)}><FileText size={16} />查看服务报告</button></footer>
          </aside>
        </div>
      )}

      {modal === "equipment" && <Modal title="新增设备" description="建立客户、地点与设备的长期服务档案" onClose={() => setModal(null)}><form className="modal-form" onSubmit={addEquipment}><div className="field-pair"><label className="field"><span>所属客户</span><select name="clientId" required>{data.clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label><label className="field"><span>安装位置</span><input name="site" required placeholder="例如：吧台 A 区" /></label></div><div className="field-pair"><label className="field"><span>设备类型</span><input name="category" required placeholder="例如：商用咖啡机" /></label><label className="field"><span>品牌</span><input name="brand" required placeholder="设备品牌" /></label></div><div className="field-pair"><label className="field"><span>型号</span><input name="model" required /></label><label className="field"><span>序列号</span><input name="serial" required /></label></div><div className="field-pair"><label className="field"><span>安装日期</span><input type="date" name="installedAt" required defaultValue={todayIso()} /></label><label className="field"><span>下次保养</span><input type="date" name="nextMaintenance" required defaultValue={todayIso()} /></label></div><div className="modal-actions"><button className="button ghost" type="button" onClick={() => setModal(null)}>取消</button><button className="button primary" type="submit"><Plus size={16} />建立档案</button></div></form></Modal>}

      {modal === "workOrder" && <Modal title="新建服务工单" description="记录问题、计划时间与现场负责人" onClose={() => setModal(null)}><form className="modal-form" onSubmit={addWorkOrder}><label className="field"><span>关联设备</span><select name="equipmentId" required defaultValue={selectedEquipmentId || data.equipment[0]?.id}>{data.equipment.map((item) => <option value={item.id} key={item.id}>{clientsById[item.clientId]?.name} · {item.category} · {item.site}</option>)}</select></label><div className="field-pair"><label className="field"><span>服务主题</span><input name="title" required placeholder="例如：季度清洗保养" /></label><label className="field"><span>优先级</span><select name="priority" defaultValue="普通"><option>紧急</option><option>普通</option><option>低</option></select></label></div><label className="field"><span>问题描述</span><textarea name="description" required placeholder="记录客户描述、异常现象或保养范围" /></label><div className="field-pair"><label className="field"><span>计划日期</span><input type="date" name="scheduledAt" required defaultValue={todayIso()} /></label><label className="field"><span>负责人</span><input name="assignee" placeholder="未指派" /></label></div><div className="modal-actions"><button className="button ghost" type="button" onClick={() => setModal(null)}>取消</button><button className="button primary" type="submit"><Plus size={16} />创建工单</button></div></form></Modal>}

      {modal === "data" && <Modal title="数据与备份" description="业务数据由后端服务器持久化保存，可随时导出离线备份" onClose={() => setModal(null)}><div className="data-options"><button type="button" onClick={exportData}><span className="option-icon"><Download size={20} /></span><div><b>导出数据备份</b><p>下载包含设备、客户和工单的 JSON 文件</p></div><ChevronRight size={18} /></button><button type="button" onClick={() => importRef.current?.click()}><span className="option-icon"><Upload size={20} /></span><div><b>从备份恢复</b><p>导入备份并写入服务器数据库</p></div><ChevronRight size={18} /></button><button type="button" onClick={resetData}><span className="option-icon muted"><RotateCcw size={20} /></span><div><b>恢复演示数据</b><p>重置服务器中的客户、设备与工单</p></div><ChevronRight size={18} /></button><input ref={importRef} type="file" accept="application/json" hidden onChange={importData} /></div></Modal>}

      {reportOrder && <ServiceReport order={reportOrder} equipment={equipmentById[reportOrder.equipmentId]} client={clientsById[equipmentById[reportOrder.equipmentId]?.clientId]} onClose={() => setReportOrderId(null)} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}

function PhotoGroup({ label, photos, onUpload, onRemove }: { label: string; photos: string[]; onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void; onRemove: (index: number) => void }) {
  return <div className="photo-group"><div className="photo-group-title"><b>{label}</b><span>{photos.length}/6</span></div><div className="photo-grid">{photos.map((photo, index) => <div className="photo-thumb" key={`${photo.slice(-12)}-${index}`}><img src={photo} alt={`${label} ${index + 1}`} /><button type="button" aria-label="删除照片" onClick={() => onRemove(index)}><X size={13} /></button></div>)}<label className="photo-upload"><Camera size={20} /><span>添加照片</span><input type="file" accept="image/*" multiple hidden onChange={onUpload} /></label></div></div>;
}

function ServiceReport({ order, equipment, client, onClose }: { order: WorkOrder; equipment: Equipment; client: AppData["clients"][number]; onClose: () => void }) {
  const total = order.parts.reduce((sum, part) => sum + part.quantity * part.price, 0);
  return createPortal(
    <div className="report-backdrop">
      <div className="report-toolbar"><button className="button ghost" onClick={onClose}><X size={17} />关闭</button><button className="button primary" onClick={() => window.print()}><Printer size={17} />打印 / 保存 PDF</button></div>
      <article className="print-root">
        <header className="report-header"><div><div className="report-brand"><Wrench size={20} />续衡设备服务</div><h1>设备服务报告</h1></div><div><span>报告编号</span><strong>{order.id}</strong><span>服务日期</span><strong>{fullDate(order.completedAt || order.scheduledAt)}</strong></div></header>
        <section className="report-summary"><div><span>客户</span><b>{client?.name}</b><small>{client?.contact} · {client?.phone}</small></div><div><span>设备</span><b>{equipment?.category}</b><small>{equipment?.brand} {equipment?.model} · {equipment?.id}</small></div><div><span>位置</span><b>{equipment?.site}</b><small>{client?.address}</small></div></section>
        <section className="report-section"><h2>服务内容</h2><dl className="report-details"><div><dt>报修 / 计划事项</dt><dd>{order.title}</dd></div><div><dt>问题描述</dt><dd>{order.description || "-"}</dd></div><div><dt>故障判断</dt><dd>{order.diagnosis || "-"}</dd></div><div><dt>处理结果</dt><dd>{order.solution || "-"}</dd></div></dl></section>
        <section className="report-section"><h2>工时与配件</h2><table><thead><tr><th>项目</th><th>数量</th><th>单价</th><th>小计</th></tr></thead><tbody><tr><td>现场服务工时</td><td>{order.laborHours} 小时</td><td>-</td><td>-</td></tr>{order.parts.map((part) => <tr key={part.id}><td>{part.name}</td><td>{part.quantity}</td><td>¥{part.price.toFixed(2)}</td><td>¥{(part.quantity * part.price).toFixed(2)}</td></tr>)}{!order.parts.length && <tr><td colSpan={4}>本次未记录更换配件</td></tr>}</tbody><tfoot><tr><td colSpan={3}>配件合计</td><td>¥{total.toFixed(2)}</td></tr></tfoot></table></section>
        {(order.beforePhotos.length > 0 || order.afterPhotos.length > 0) && <section className="report-section"><h2>现场照片</h2><div className="report-photos">{order.beforePhotos.map((photo, index) => <figure key={`before-${index}`}><img src={photo} /><figcaption>维修前 {index + 1}</figcaption></figure>)}{order.afterPhotos.map((photo, index) => <figure key={`after-${index}`}><img src={photo} /><figcaption>维修后 {index + 1}</figcaption></figure>)}</div></section>}
        <section className="report-signoff"><div><span>服务人员</span><b>{order.assignee}</b><small>工单状态：{order.status}</small></div><div><span>客户确认</span>{order.customerSignature ? <img src={order.customerSignature} alt="客户签字" /> : <b>{order.customerName || "待确认"}</b>}<small>{order.signedAt ? `${order.customerName || "客户代表"} · ${fullDate(order.signedAt)}` : "尚未签字确认"}</small></div></section>
        <footer className="report-footer"><span>设备序列号：{equipment?.serial}</span><span>本报告由续衡设备维保助手生成</span></footer>
      </article>
    </div>,
    document.body,
  );
}

export default App;
