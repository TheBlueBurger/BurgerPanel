import os from 'node:os';
import type { MemoryUsage } from '../../../Share/Perf.js';
//Create function to get CPU information
export function cpuUsage() {

  return os.loadavg()
}


export function getMemoryUsage(): MemoryUsage {
  const mem = os.totalmem() - os.freemem()
  return {
    usage: mem,
    total: os.totalmem(),
    free: os.freemem(),
    percentage: Math.min(Math.round(mem / os.totalmem() * 100), 100)
  };
}