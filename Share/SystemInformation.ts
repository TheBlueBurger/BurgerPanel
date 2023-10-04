export interface MemoryUsage {
  usage: number;
  total: number;
  free: number;
  percentage: number;
}

export interface ServerPerformance {
  load?: number[];
  mem?: MemoryUsage;
  platform?: string;
}

export interface GeneralInformation {
  serverAmount: number;
  clients: {username?: string; _id?: string}[];
}