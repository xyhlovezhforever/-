export type EquipmentStatus = "运行中" | "需关注" | "停机";
export type WorkOrderStatus = "待派工" | "处理中" | "待确认" | "已完成";
export type Priority = "紧急" | "普通" | "低";
export type UserRole = "admin" | "dispatcher" | "technician" | "customer";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  clientId?: string;
  technicianName?: string;
}

export interface Client {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
}

export interface Equipment {
  id: string;
  clientId: string;
  site: string;
  category: string;
  brand: string;
  model: string;
  serial: string;
  installedAt: string;
  nextMaintenance: string;
  status: EquipmentStatus;
}

export interface PartLine {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface WorkOrder {
  id: string;
  equipmentId: string;
  title: string;
  description: string;
  priority: Priority;
  status: WorkOrderStatus;
  assignee: string;
  createdAt: string;
  scheduledAt: string;
  completedAt?: string;
  diagnosis: string;
  solution: string;
  laborHours: number;
  parts: PartLine[];
  beforePhotos: string[];
  afterPhotos: string[];
  customerName?: string;
  customerSignature?: string;
  signedAt?: string;
}

export interface AppData {
  version: 1;
  clients: Client[];
  equipment: Equipment[];
  workOrders: WorkOrder[];
}
