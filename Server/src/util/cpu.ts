import os from 'node:os';
import type { MemoryUsage } from '../../../Share/Perf.js';

export function getMemoryUsage(): MemoryUsage {
  const mem = os.totalmem() - os.freemem()
  return {
    usage: mem,
    total: os.totalmem(),
    free: os.freemem(),
    percentage: Math.min(Math.round(mem / os.totalmem() * 100), 100)
  };
}