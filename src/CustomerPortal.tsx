import { useEffect, useRef, useState } from "react";
import { Bell, CalendarDays, Camera, Check, ChevronRight, Clock3, FileText, LogOut, MapPin, Plus, Send, Wrench, X } from "lucide-react";
import type { AppData, Equipment, Priority, SessionUser, WorkOrder } from "./types";

const statusSteps = ["已提交", "已受理", "服务中", "待确认", "已完成"];

function displayStep(order: WorkOrder) {
  if (order.status === "待派工") return 0;
  if (order.status === "处理中") return 2;
  if (order.status === "待确认") return 3;
  return 4;
}

function fmt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function CustomerSignoff({ name, onConfirm, onCancel }: { name: string; onConfirm: (signature: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(1, window.devicePixelRatio);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const context = canvas.getContext("2d");
    context?.scale(ratio, ratio);
    if (context) { context.lineWidth = 2.4; context.lineCap = "round"; context.strokeStyle = "#153f3a"; }
  }, []);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  return <div className="customer-signoff"><p>请由 <b>{name}</b> 在下方签字确认服务结果</p><canvas ref={canvasRef} onPointerDown={(event) => { drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); const p = point(event); const context = event.currentTarget.getContext("2d"); context?.beginPath(); context?.moveTo(p.x, p.y); }} onPointerMove={(event) => { if (!drawing.current) return; const p = point(event); const context = event.currentTarget.getContext("2d"); context?.lineTo(p.x, p.y); context?.stroke(); }} onPointerUp={() => { drawing.current = false; }} /><div><button className="button ghost" onClick={onCancel}>取消</button><button className="button primary" onClick={() => canvasRef.current && onConfirm(canvasRef.current.toDataURL("image/png"))}><Check size={16} />确认验收</button></div></div>;
}

export default function CustomerPortal({ user, data, syncStatus, onLogout, onCreateRequest, onConfirm, onReport }: {
  user: SessionUser;
  data: AppData;
  syncStatus: "loading" | "saving" | "saved" | "error";
  onLogout: () => void;
  onCreateRequest: (equipmentId: string, title: string, description: string, priority: Priority) => Promise<void>;
  onConfirm: (order: WorkOrder, signature: string) => void;
  onReport: (order: WorkOrder) => void;
}) {
  const [requesting, setRequesting] = useState<Equipment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [signing, setSigning] = useState(false);
  const client = data.clients[0];
  const active = data.workOrders.filter((item) => item.status !== "已完成");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requesting) return;
    const form = new FormData(event.currentTarget);
    await onCreateRequest(requesting.id, String(form.get("title")), String(form.get("description")), String(form.get("priority")) as Priority);
    setRequesting(null);
  };

  return (
    <div className="customer-portal">
      <header className="customer-header"><div className="customer-brand"><span><Wrench size={19} /></span><div><b>续衡服务</b><small>{client?.name}</small></div></div><div className="customer-account"><div><b>{user.name}</b><span className={`sync-${syncStatus}`}>{syncStatus === "saved" ? "数据已同步" : syncStatus === "saving" ? "正在同步" : syncStatus === "error" ? "同步异常" : "正在连接"}</span></div><button aria-label="退出登录" title="退出登录" onClick={onLogout}><LogOut size={18} /></button></div></header>
      <main className="customer-main">
        <section className="customer-welcome"><div><span>客户服务中心</span><h1>{user.name}，你好</h1><p>报修、服务进度和历史报告都在这里。</p></div><button className="button primary" onClick={() => setRequesting(data.equipment[0])}><Plus size={17} />发起报修</button></section>
        <section className="customer-stats"><div><Clock3 size={18} /><span>进行中</span><b>{active.length}</b></div><div><Wrench size={18} /><span>名下设备</span><b>{data.equipment.length}</b></div><div><FileText size={18} /><span>历史服务</span><b>{data.workOrders.filter((item) => item.status === "已完成").length}</b></div></section>

        {active.length > 0 && <section className="customer-section"><header><div><h2>当前服务</h2><p>查看处理进度与计划时间</p></div><Bell size={18} /></header><div className="customer-order-list">{active.map((order) => { const equipment = data.equipment.find((item) => item.id === order.equipmentId); const step = displayStep(order); return <button key={order.id} onClick={() => setSelectedOrder(order)}><span className={`customer-order-icon priority-${order.priority}`}><Wrench size={18} /></span><div><b>{order.title}</b><p>{equipment?.category} · {equipment?.site}</p><div className="mini-progress">{statusSteps.map((_, index) => <i key={index} className={index <= step ? "done" : ""}></i>)}</div></div><span>{order.status}<small>{fmt(order.scheduledAt)}</small></span><ChevronRight size={18} /></button>; })}</div></section>}

        <section className="customer-section"><header><div><h2>我的设备</h2><p>扫码设备均归入当前客户账户</p></div><span>{data.equipment.length} 台</span></header><div className="customer-equipment-grid">{data.equipment.map((item) => <article key={item.id}><div className="customer-equipment-icon"><Wrench size={20} /></div><div><h3>{item.category}</h3><p>{item.brand} {item.model}</p><span><MapPin size={13} />{item.site}</span></div><button onClick={() => setRequesting(item)}><Plus size={16} />报修</button></article>)}</div></section>

        <section className="customer-section"><header><div><h2>历史服务</h2><p>已完成并可查看服务报告</p></div><CalendarDays size={18} /></header><div className="customer-history">{data.workOrders.filter((item) => item.status === "已完成").map((order) => <button key={order.id} onClick={() => onReport(order)}><Check size={15} /><div><b>{order.title}</b><span>{order.id} · {fmt(order.completedAt || order.scheduledAt)}</span></div><FileText size={17} /></button>)}</div></section>
      </main>

      {requesting && <div className="modal-backdrop"><section className="modal customer-modal"><header className="modal-header"><div><h2>发起服务请求</h2><p>{requesting.category} · {requesting.site}</p></div><button className="icon-button" onClick={() => setRequesting(null)}><X size={20} /></button></header><form className="modal-form" onSubmit={submit}><label className="field"><span>问题类型</span><input name="title" required placeholder="例如：无法启动、噪音异常" /></label><label className="field"><span>现场情况</span><textarea name="description" required placeholder="请描述发生时间、异常表现；提交后调度会与你联系" /></label><label className="field"><span>紧急程度</span><select name="priority"><option>普通</option><option>紧急</option><option>低</option></select></label><div className="customer-upload-hint"><Camera size={18} /><span>提交后可由服务人员在工单中补充现场照片</span></div><div className="modal-actions"><button type="button" className="button ghost" onClick={() => setRequesting(null)}>取消</button><button className="button primary" type="submit"><Send size={16} />提交请求</button></div></form></section></div>}

      {selectedOrder && <div className="modal-backdrop"><section className="modal customer-modal"><header className="modal-header"><div><h2>{selectedOrder.title}</h2><p>{selectedOrder.id} · {selectedOrder.status}</p></div><button className="icon-button" onClick={() => { setSelectedOrder(null); setSigning(false); }}><X size={20} /></button></header><div className="customer-order-detail"><div className="customer-progress">{statusSteps.map((label, index) => <div className={index <= displayStep(selectedOrder) ? "done" : ""} key={label}><i>{index < displayStep(selectedOrder) ? <Check size={12} /> : index + 1}</i><span>{label}</span></div>)}</div><dl><div><dt>问题描述</dt><dd>{selectedOrder.description}</dd></div><div><dt>服务人员</dt><dd>{selectedOrder.assignee}</dd></div><div><dt>故障判断</dt><dd>{selectedOrder.diagnosis || "服务人员尚未填写"}</dd></div><div><dt>处理结果</dt><dd>{selectedOrder.solution || "服务尚未完成"}</dd></div></dl>{selectedOrder.status === "待确认" && (signing ? <CustomerSignoff name={user.name} onCancel={() => setSigning(false)} onConfirm={(signature) => { onConfirm(selectedOrder, signature); setSigning(false); setSelectedOrder(null); }} /> : <button className="button primary full-button" onClick={() => setSigning(true)}><Check size={16} />确认服务完成</button>)}</div></section></div>}
    </div>
  );
}
