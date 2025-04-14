
export type IPCType = 'pipe' | 'queue' | 'memory';

export type ProcessState = 'idle' | 'running' | 'blocked';

export interface Position {
  x: number;
  y: number;
}

export interface Process {
  id: string;
  name: string;
  position: Position;
  state: ProcessState;
  resources: string[]; // IDs of resources held
  waitingFor: string | null; // ID of resource waiting for
}

export interface Connection {
  id: string;
  from: string; // Process ID
  to: string; // Process ID
  type: IPCType;
  state: 'idle' | 'active';
  capacity?: number; // For queues
  currentLoad?: number; // Current messages in queue
}

export interface DataTransfer {
  id: string;
  connectionId: string;
  startTime: number;
  progress: number; // 0-100
  size: number; // Visual size of data packet
}
