import type { AppData } from "./types";

const today = new Date();
const dateOffset = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const seedData: AppData = {
  version: 1,
  clients: [
    { id: "c-01", name: "青禾咖啡（中山店）", contact: "林店长", phone: "138 0013 8001", address: "中山市东区兴文路 18 号" },
    { id: "c-02", name: "北岸餐饮管理", contact: "周经理", phone: "138 0013 8002", address: "珠海市香洲区海滨路 106 号" },
    { id: "c-03", name: "启明创智园", contact: "许主管", phone: "138 0013 8003", address: "深圳市南山区科技园南区 6 栋" },
  ],
  equipment: [
    { id: "EQ-240018", clientId: "c-01", site: "吧台 A 区", category: "商用咖啡机", brand: "Nuova Simonelli", model: "Appia II", serial: "NS-A2-88429", installedAt: "2022-05-18", nextMaintenance: dateOffset(-2), status: "需关注" },
    { id: "EQ-240021", clientId: "c-01", site: "后场制冰区", category: "制冰机", brand: "Hoshizaki", model: "IM-65NE", serial: "HZ-651-22019", installedAt: "2023-08-06", nextMaintenance: dateOffset(6), status: "运行中" },
    { id: "EQ-240033", clientId: "c-02", site: "中央厨房冷藏间", category: "冷藏工作台", brand: "星崎", model: "RT-156MA", serial: "RT156-20931", installedAt: "2021-11-22", nextMaintenance: dateOffset(13), status: "运行中" },
    { id: "EQ-240037", clientId: "c-02", site: "西餐厅后厨", category: "万能蒸烤箱", brand: "Rational", model: "iCombi Pro", serial: "RA-ICP-70211", installedAt: "2022-09-01", nextMaintenance: dateOffset(27), status: "运行中" },
    { id: "EQ-240041", clientId: "c-03", site: "6 栋 1F 机房", category: "精密空调", brand: "Vertiv", model: "PEX4", serial: "VT-PX4-11982", installedAt: "2020-04-15", nextMaintenance: dateOffset(1), status: "需关注" },
    { id: "EQ-240046", clientId: "c-03", site: "园区食堂", category: "洗碗机", brand: "Winterhalter", model: "PT-M", serial: "WH-PTM-8834", installedAt: "2024-01-12", nextMaintenance: dateOffset(45), status: "运行中" },
  ],
  workOrders: [
    { id: "WO-1027", equipmentId: "EQ-240018", title: "萃取压力不稳", description: "高峰时段压力表波动，出品速度下降。", priority: "紧急", status: "处理中", assignee: "陈昊", createdAt: dateOffset(-1), scheduledAt: dateOffset(0), diagnosis: "初检疑似泵压与进水滤芯问题。", solution: "", laborHours: 0.5, parts: [], beforePhotos: [], afterPhotos: [] },
    { id: "WO-1026", equipmentId: "EQ-240041", title: "高温告警复查", description: "昨晚出现一次高温告警，已自动恢复。", priority: "紧急", status: "待派工", assignee: "未指派", createdAt: dateOffset(-1), scheduledAt: dateOffset(0), diagnosis: "", solution: "", laborHours: 0, parts: [], beforePhotos: [], afterPhotos: [] },
    { id: "WO-1025", equipmentId: "EQ-240021", title: "季度清洗保养", description: "执行水路除垢、冷凝器清洁与制冰测试。", priority: "普通", status: "待确认", assignee: "李澈", createdAt: dateOffset(-3), scheduledAt: dateOffset(-1), diagnosis: "冷凝器积尘，制冰周期较基准增加 3 分钟。", solution: "完成冷凝器清洁、水路除垢与冰厚校准。", laborHours: 1.5, parts: [{ id: "p-01", name: "食品级除垢剂", quantity: 1, price: 68 }], beforePhotos: [], afterPhotos: [] },
    { id: "WO-1024", equipmentId: "EQ-240033", title: "柜内温度偏高", description: "午市后柜内温度升至 9°C。", priority: "普通", status: "已完成", assignee: "陈昊", createdAt: dateOffset(-6), scheduledAt: dateOffset(-5), completedAt: dateOffset(-5), diagnosis: "门封条右下角老化漏冷。", solution: "更换门封条并完成 30 分钟保压测试。", laborHours: 1.2, parts: [{ id: "p-02", name: "原厂门封条", quantity: 1, price: 260 }], beforePhotos: [], afterPhotos: [], customerName: "周经理", signedAt: dateOffset(-5) },
    { id: "WO-1023", equipmentId: "EQ-240037", title: "月度运行检查", description: "按维保计划执行水垢与密封检查。", priority: "低", status: "已完成", assignee: "李澈", createdAt: dateOffset(-10), scheduledAt: dateOffset(-9), completedAt: dateOffset(-9), diagnosis: "设备运行正常，门封无破损。", solution: "清洁排水口并完成自检程序。", laborHours: 0.8, parts: [], beforePhotos: [], afterPhotos: [], customerName: "周经理", signedAt: dateOffset(-9) },
  ],
};
