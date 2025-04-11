import { Process, Connection, Position, DataTransfer } from "./types";
import { DeadlockCycle } from "./deadlock-utils";
export interface AnimationParams {
  connectionId: string;
  animationDelay: string;
  animationDuration: string;
  color?: string;
}

export function calculateConnectionPath(
  fromPosition: Position,
  toPosition: Position,
  type: "pipe" | "queue" | "memory"
): string {
  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (type === "memory") {
    const offsetX = (toPosition.x - fromPosition.x) * 0.1;
    const offsetY = (toPosition.y - fromPosition.y) * 0.1;
    return `M${fromPosition.x},${fromPosition.y} Q${
      (fromPosition.x + toPosition.x) / 2 + offsetX
    },${(fromPosition.y + toPosition.y) / 2 + offsetY} ${toPosition.x},${
      toPosition.y
    }`;
  }

  const curveOffset = distance * 0.2;
  const midX = (fromPosition.x + toPosition.x) / 2;
  const midY = (fromPosition.y + toPosition.y) / 2;

  const perpX = -dy / distance;
  const perpY = dx / distance;

  const controlX = midX + perpX * curveOffset;
  const controlY = midY + perpY * curveOffset;

  return `M${fromPosition.x},${fromPosition.y} Q${controlX},${controlY} ${toPosition.x},${toPosition.y}`;
}

export function getDeadlockAnimationParams(
  cycle: DeadlockCycle,
  connections: Connection[]
): AnimationParams[] {
  return cycle.connections.map((connId, index) => ({
    connectionId: connId,
    animationDelay: `${index * 0.2}s`,
    animationDuration: "1.5s",
    color: "var(--destructive)",
  }));
}

export function calculateDataTransferPosition(
  fromPosition: Position,
  toPosition: Position,
  progress: number
): Position {
  return {
    x: fromPosition.x + (toPosition.x - fromPosition.x) * (progress / 100),
    y: fromPosition.y + (toPosition.y - fromPosition.y) * (progress / 100),
  };
}

export function getProcessStateIndicator(state: Process["state"]): {
  color: string;
  label: string;
  animation?: string;
} {
  switch (state) {
    case "idle":
      return { color: "var(--muted-foreground)", label: "Idle" };

    case "running":
      return {
        color: "var(--primary)",
        label: "Running",
        animation: "pulse-slow",
      };

    case "blocked":
      return {
        color: "var(--amber-500)",
        label: "Blocked",
        animation: "pulse",
      };

    case "deadlocked":
      return {
        color: "var(--destructive)",
        label: "Deadlocked",
        animation: "pulse",
      };

    default:
      return { color: "var(--muted-foreground)", label: "Unknown" };
  }
}

export function getConnectionTooltip(
  connection: Connection,
  fromProcess?: Process,
  toProcess?: Process
): string {
  const fromName = fromProcess?.name || "Unknown";
  const toName = toProcess?.name || "Unknown";

  let statusInfo = "";
  switch (connection.state) {
    case "idle":
      statusInfo = "No active transfers";
      break;
    case "active":
      statusInfo = "Actively transferring data";
      break;
    case "deadlocked":
      statusInfo = "Part of a deadlock cycle";
      break;
  }

  let typeInfo = "";
  switch (connection.type) {
    case "pipe":
      typeInfo = "Bi-directional communication channel";
      break;
    case "queue": {
      const capacity = connection.capacity || 10;
      const load = connection.currentLoad || 0;
      const utilizationPercentage = Math.round((load / capacity) * 100);
      typeInfo = `Message queue (${load}/${capacity} messages, ${utilizationPercentage}% utilized)`;
      if (load >= capacity) {
        typeInfo += "\nQueue is full - producers will be blocked";
      } else if (load === 0) {
        typeInfo += "\nQueue is empty - consumers will be blocked";
      }
      break;
    }

    case "memory": {
      if (connection.memoryRegion) {
        const { currentReaders, maxReaders, hasWriter } =
          connection.memoryRegion.semaphore;
        typeInfo = `Shared memory region (ID: ${connection.memoryRegion.id})\n`;
        typeInfo += `Readers: ${currentReaders}/${maxReaders}\n`;
        typeInfo += `Writer: ${hasWriter ? "Active" : "None"}\n`;

        // Add process-specific access information
        if (
          fromProcess?.memoryAccess?.regionId === connection.memoryRegion.id
        ) {
          typeInfo += `\n${fromProcess.name} is ${fromProcess.memoryAccess.type}ing`;
        }
        if (toProcess?.memoryAccess?.regionId === connection.memoryRegion.id) {
          typeInfo += `\n${toProcess.name} is ${toProcess.memoryAccess.type}ing`;
        }

        if (hasWriter) {
          typeInfo += "\nMemory is locked for writing";
        } else if (currentReaders >= maxReaders) {
          typeInfo += "\nMaximum readers reached";
        }
      } else {
        typeInfo = "Shared memory region (uninitialized)";
      }
      break;
    }
  }

  return `${fromName} → ${toName}\n${connection.type} connection\n${statusInfo}\n${typeInfo}`;
}
