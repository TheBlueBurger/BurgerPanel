export interface MemoryUsage {
  usage: number;
  total: number;
  free: number;
  percentage: number;
}

export interface ServerPerformancePacketS2C {
  type: "serverPerformance";
  load?: number[];
  mem?: MemoryUsage;
  emitEvent: boolean;
  platform?: string;
}