/**
 * Deadlock Visualization Utilities
 *
 * This file contains utilities for enhancing deadlock visualization and detection
 * in the IPC Synchronizer application.
 */

import { Process, Connection, Position } from "./types";
import { generateId } from "./utils";
import { LogEntry } from "@/components/LogPanel";

/**
 * Represents a detected deadlock cycle in the system
 */
export interface DeadlockCycle {
  id: string;
  processes: string[]; // Process IDs involved in the cycle
  connections: string[]; // Connection IDs involved in the cycle
  detectedAt: Date;
  resolved: boolean;
  resolutionStrategy?: string;
}

/**
 * Analyzes the current process and connection state to detect deadlocks
 * Returns detailed information about any deadlock cycles found
 */
export function detectDeadlockCycles(
  processes: Process[],
  connections: Connection[]
): DeadlockCycle[] {
  const cycles: DeadlockCycle[] = [];
  const activeConnections = connections.filter((c) => c.state === "active");

  // Build a dependency graph
  const graph: Record<string, string[]> = {};

  // Initialize graph with all processes
  processes.forEach((process) => {
    graph[process.id] = [];
  });

  // Add edges for active connections
  activeConnections.forEach((conn) => {
    // For each active connection, the 'from' process depends on the 'to' process
    if (!graph[conn.from]) graph[conn.from] = [];
    graph[conn.from].push(conn.to);
  });

  // Find cycles in the graph using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const findCycles = (
    nodeId: string,
    path: string[] = [],
    connPath: string[] = []
  ) => {
    if (recursionStack.has(nodeId)) {
      // Found a cycle
      const cycleStartIndex = path.indexOf(nodeId);
      const cyclePath = path.slice(cycleStartIndex);
      cyclePath.push(nodeId); // Complete the cycle

      // Find connections involved in this cycle
      const cycleConnections = connPath.slice(cycleStartIndex);

      cycles.push({
        id: generateId(),
        processes: cyclePath,
        connections: cycleConnections,
        detectedAt: new Date(),
        resolved: false,
      });
      return;
    }

    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph[nodeId] || [];
    for (const neighbor of neighbors) {
      // Find the connection between current node and neighbor
      const conn = activeConnections.find(
        (c) => c.from === nodeId && c.to === neighbor
      );

      if (conn) {
        findCycles(neighbor, [...path, nodeId], [...connPath, conn.id]);
      }
    }

    recursionStack.delete(nodeId);
  };

  // Start DFS from each node
  for (const processId of Object.keys(graph)) {
    findCycles(processId);
  }

  return cycles;
}

/**
 * Creates a log entry for a detected deadlock
 */
export function createDeadlockLogEntry(
  cycle: DeadlockCycle,
  processes: Process[],
  connections: Connection[]
): LogEntry {
  // Get detailed process information
  const processDetails = cycle.processes.map((id) => {
    const process = processes.find((p) => p.id === id);
    return {
      name: process?.name || id,
      state: process?.state || "unknown",
      resources: connections
        .filter((c) => c.from === id || c.to === id)
        .map((c) => ({
          id: c.id,
          type: c.type,
          direction: c.from === id ? "outgoing" : "incoming",
          state: c.state,
          capacity: c.capacity,
          currentLoad: c.currentLoad,
        })),
    };
  });

  // Create a detailed message about the cycle
  const cycleDescription =
    processDetails.map((p) => `${p.name} (${p.state})`).join(" → ") +
    " → " +
    processDetails[0].name;

  // Build a timeline of resource requests
  const resourceTimeline = cycle.connections.map((connId, index) => {
    const conn = connections.find((c) => c.id === connId);
    const fromProcess = processDetails.find(
      (p) =>
        p.name ===
        (processes.find((proc) => proc.id === conn?.from)?.name || conn?.from)
    );
    const toProcess = processDetails.find(
      (p) =>
        p.name ===
        (processes.find((proc) => proc.id === conn?.to)?.name || conn?.to)
    );

    return `${index + 1}. ${fromProcess?.name} is waiting for resources from ${
      toProcess?.name
    } via ${conn?.type} connection`;
  });

  // Generate detailed resolution strategies
  const resolutionStrategies = [
    "Implement resource allocation ordering",
    "Use timeouts and retry mechanisms",
    "Implement a deadlock detection and recovery system",
    "Consider using a resource manager to coordinate access",
  ];

  // Add specific strategies based on connection types
  const connectionTypes = new Set(
    cycle.connections.map((id) => connections.find((c) => c.id === id)?.type)
  );
  if (connectionTypes.has("queue")) {
    resolutionStrategies.push(
      "Implement queue capacity limits and timeout mechanisms",
      "Consider using non-blocking queue operations"
    );
  }
  if (connectionTypes.has("pipe")) {
    resolutionStrategies.push(
      "Use asynchronous pipe operations",
      "Implement pipe buffer size limits"
    );
  }

  return {
    id: generateId(),
    timestamp: new Date(),
    type: "error",
    message: "Deadlock Detected",
    details: `Circular wait detected: ${cycleDescription}\n\nDeadlock Formation Sequence:\n${resourceTimeline.join(
      "\n"
    )}`,
    additionalInfo: {
      processes: processDetails.map((p) => ({
        name: p.name,
        state: p.state,
        heldResources: p.resources
          .filter((r) => r.direction === "outgoing" && r.state === "active")
          .map((r) => r.id),
        waitingForResources: p.resources
          .filter((r) => r.direction === "incoming" && r.state === "active")
          .map((r) => r.id),
      })),
      connectionTypes: Array.from(connectionTypes),
      severity: "high",
      detectedAt: cycle.detectedAt,
      solutions: resolutionStrategies,
    },
  };
}

/**
 * Calculates animation parameters for visualizing deadlock cycles
 */
export function getDeadlockAnimationParams(
  cycle: DeadlockCycle,
  connections: Connection[]
) {
  // Calculate animation delay for each connection to create a flowing effect
  const animationParams = cycle.connections.map((connId, index) => {
    return {
      connectionId: connId,
      animationDelay: `${index * 0.2}s`,
      animationDuration: "1.5s",
    };
  });

  return animationParams;
}

/**
 * Suggests a resolution strategy for the detected deadlock
 */
export function suggestDeadlockResolution(cycle: DeadlockCycle): string {
  const strategies = [
    "Release all resources and retry with proper ordering",
    "Implement a timeout and resource release mechanism",
    "Use a centralized resource manager to prevent deadlocks",
    "Implement the banker's algorithm for deadlock avoidance",
    "Use a priority-based resource allocation scheme",
  ];

  // For now, just return a random strategy
  // In a real implementation, this would analyze the specific deadlock pattern
  return strategies[Math.floor(Math.random() * strategies.length)];
}
