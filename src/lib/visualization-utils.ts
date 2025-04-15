/**
 * Visualization Utilities
 *
 * This file contains utilities for enhancing visualization of IPC mechanisms,
 * deadlocks, and other synchronization concepts in the application.
 */

import { Process, Connection, Position, DataTransfer } from "./types";
import { DeadlockCycle } from "./deadlock-utils";

/**
 * Animation parameters for visualizing data transfers
 */
export interface AnimationParams {
  connectionId: string;
  animationDelay: string;
  animationDuration: string;
  color?: string;
}

/**
 * Calculates the path for a connection between two processes
 * Adds a slight curve to make the connection more visually appealing
 */
export function calculateConnectionPath(
  fromPosition: Position,
  toPosition: Position,
  type: "pipe" | "queue" | "memory"
): string {
  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // For straight lines (memory connections)
  if (type === "memory") {
    return `M${fromPosition.x},${fromPosition.y} L${toPosition.x},${toPosition.y}`;
  }

  // For curved lines (pipes and queues)
  // Calculate control point for the curve
  const curveOffset = distance * 0.2;
  const midX = (fromPosition.x + toPosition.x) / 2;
  const midY = (fromPosition.y + toPosition.y) / 2;

  // Perpendicular vector for control point
  const perpX = -dy / distance;
  const perpY = dx / distance;

  const controlX = midX + perpX * curveOffset;
  const controlY = midY + perpY * curveOffset;

  return `M${fromPosition.x},${fromPosition.y} Q${controlX},${controlY} ${toPosition.x},${toPosition.y}`;
}

/**
 * Generates animation parameters for visualizing deadlock cycles
 * Creates a flowing animation that highlights the circular dependency
 */
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

/**
 * Calculates positions for data transfer particles along a connection
 */
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

/**
 * Generates a visual indicator for a process's state
 */
export function getProcessStateIndicator(state: Process["state"]): {
  color: string;
  label: string;
  animation?: string;
} {
  switch (state) {
    case "idle":
      return { color: "var(--muted-foreground)", label: "Idle" };
    case "running":
      return { color: "var(--primary)", label: "Running" };
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

/**
 * Generates a tooltip content for a connection based on its state and type
 */
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
