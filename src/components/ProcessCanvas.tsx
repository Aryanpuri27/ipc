import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import ProcessNode from "./ProcessNode";
import IPCConnection from "./IPCConnection";
import {
  Process,
  Connection,
  Position,
  IPCType,
  DataTransfer,
} from "@/lib/types";
import { LogEntry } from "./LogPanel";
import { generateId } from "@/lib/utils";
import { Hand } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessCanvasProps {
  onLogEvent?: (log: LogEntry) => void;
  demoMode?: boolean;
}

const ProcessCanvas: React.FC<ProcessCanvasProps> = ({
  onLogEvent,
  demoMode = false,
}) => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dataTransfers, setDataTransfers] = useState<DataTransfer[]>([]);
  const [connectMode, setConnectMode] = useState<{
    active: boolean;
    fromProcess?: string;
    type: IPCType;
  }>({
    active: false,
    type: "pipe",
  });
  const [interactionMode, setInteractionMode] = useState<"create" | "hand">(
    "create"
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const logEvent = (
    type: LogEntry["type"],
    message: string,
    details?: string
  ) => {
    if (onLogEvent) {
      onLogEvent({
        id: generateId(),
        timestamp: new Date(),
        type,
        message,
        details,
      });
    }
  };

  const addProcess = (position: Position) => {
    const newProcess: Process = {
      id: generateId(),
      name: `Process ${processes.length + 1}`,
      position,
      state: "idle",
      resources: [],
      waitingFor: null,
    };

    setProcesses([...processes, newProcess]);
    logEvent(
      "info",
      "Process Created",
      `${newProcess.name} added at position (${Math.round(
        position.x
      )}, ${Math.round(position.y)})`
    );
  };

  const startConnection = (processId: string, type: IPCType) => {
    setConnectMode({
      active: true,
      fromProcess: processId,
      type,
    });

    const process = processes.find((p) => p.id === processId);
    logEvent(
      "info",
      "Connection Started",
      `Starting ${type} connection from ${process?.name}`
    );

    toast({
      title: "Connection Started",
      description: `Select another process to complete the ${type} connection`,
    });
  };

  const completeConnection = (toProcessId: string) => {
    if (
      !connectMode.active ||
      !connectMode.fromProcess ||
      connectMode.fromProcess === toProcessId
    ) {
      return;
    }

    const fromProcess = processes.find((p) => p.id === connectMode.fromProcess);
    const toProcess = processes.find((p) => p.id === toProcessId);

    // For memory connections, check if there's an existing memory region
    if (connectMode.type === "memory") {
      const existingMemoryConnection = connections.find(
        (conn) => conn.type === "memory" && conn.memoryRegion
      );

      if (existingMemoryConnection) {
        // Add new connection to the same memory region
        const newConnection: Connection = {
          id: generateId(),
          from: connectMode.fromProcess,
          to: toProcessId,
          type: "memory",
          state: "idle",
          memoryRegion: existingMemoryConnection.memoryRegion,
        };
        setConnections([...connections, newConnection]);
        logEvent(
          "success",
          "Memory Connection Created",
          `${fromProcess?.name} connected to shared memory region with ${toProcess?.name}`
        );
        setConnectMode({ active: false, type: "pipe" });
        return;
      }
    }

    const connectionExists = connections.some(
      (conn) =>
        (conn.from === connectMode.fromProcess && conn.to === toProcessId) ||
        (conn.from === toProcessId &&
          conn.to === connectMode.fromProcess &&
          conn.type === "pipe")
    );

    if (connectionExists) {
      logEvent(
        "warning",
        "Connection Failed",
        `Connection between ${fromProcess?.name} and ${toProcess?.name} already exists`
      );

      toast({
        title: "Connection exists",
        description: "These processes are already connected",
        variant: "destructive",
      });
      setConnectMode({ active: false, type: "pipe" });
      return;
    }

    const newConnection: Connection = {
      id: generateId(),
      from: connectMode.fromProcess,
      to: toProcessId,
      type: connectMode.type,
      state: "idle",
      capacity: connectMode.type === "queue" ? 10 : undefined,
      currentLoad: 0,
      memoryRegion:
        connectMode.type === "memory"
          ? {
              id: generateId(),
              semaphore: {
                maxReaders: 5,
                currentReaders: 0,
                hasWriter: false,
              },
            }
          : undefined,
    };

    setConnections([...connections, newConnection]);

    logEvent(
      "success",
      "Connection Created",
      `${connectMode.type} established between ${fromProcess?.name} and ${toProcess?.name}`
    );

    toast({
      title: "Connection Created",
      description: `Created ${connectMode.type} between processes`,
    });

    setConnectMode({ active: false, type: "pipe" });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (connectMode.active) {
      logEvent(
        "info",
        "Connection Cancelled",
        "Clicked on canvas instead of a process"
      );
      setConnectMode({ active: false, type: "pipe" });
      return;
    }

    if (interactionMode === "create" && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      addProcess(position);
    }
  };

  const removeProcess = (processId: string) => {
    const process = processes.find((p) => p.id === processId);

    const connectionsToRemove = connections.filter(
      (c) => c.from === processId || c.to === processId
    );

    setProcesses(processes.filter((p) => p.id !== processId));
    setConnections(
      connections.filter((c) => c.from !== processId && c.to !== processId)
    );

    logEvent(
      "warning",
      `Process Removed`,
      `${process?.name} and ${connectionsToRemove.length} connection(s) were removed`
    );
  };

  const sendData = (fromProcessId: string, toProcessId: string) => {
    const fromProcess = processes.find((p) => p.id === fromProcessId);
    const toProcess = processes.find((p) => p.id === toProcessId);

    const connection = connections.find(
      (c) =>
        (c.from === fromProcessId && c.to === toProcessId) ||
        (c.type === "pipe" && c.from === toProcessId && c.to === fromProcessId)
    );

    if (!connection) return;

    // Handle queue capacity and synchronization
    if (connection.type === "queue") {
      const currentLoad = connection.currentLoad || 0;
      const capacity = connection.capacity || 10;

      if (currentLoad >= capacity) {
        logEvent(
          "warning",
          "Buffer Full",
          `Cannot send data: Queue is at maximum capacity (${capacity})`
        );
        toast({
          title: "Queue Full",
          description: `Cannot send data: Queue is at capacity (${currentLoad}/${capacity})`,
          variant: "destructive",
        });
        return;
      }

      // Simulate queue blocking behavior
      const isBlocked = Math.random() < 0.2; // 20% chance of blocking
      if (isBlocked) {
        setProcesses(
          processes.map((p) =>
            p.id === fromProcessId ? { ...p, state: "blocked" } : p
          )
        );

        setTimeout(() => {
          setProcesses(
            processes.map((p) =>
              p.id === fromProcessId ? { ...p, state: "idle" } : p
            )
          );
        }, 1000);

        return;
      }
    }

    // Handle shared memory synchronization
    if (connection.type === "memory" && connection.memoryRegion) {
      // Attempt to acquire write lock
      if (
        connection.memoryRegion.semaphore.hasWriter ||
        connection.memoryRegion.semaphore.currentReaders > 0
      ) {
        logEvent(
          "warning",
          "Memory Access Blocked",
          `Cannot write to shared memory: Region is being accessed by other processes`
        );
        toast({
          title: "Memory Locked",
          description: "Cannot write to shared memory: Region is in use",
          variant: "destructive",
        });

        // Mark process as blocked and waiting for memory access
        setProcesses(
          processes.map((p) =>
            p.id === fromProcessId
              ? {
                  ...p,
                  state: "blocked",
                  waitingFor: connection.memoryRegion.id,
                }
              : p
          )
        );
        return;
      }

      // Acquire write lock
      setConnections(
        connections.map((c) =>
          c.memoryRegion?.id === connection.memoryRegion.id
            ? {
                ...c,
                memoryRegion: {
                  ...c.memoryRegion,
                  semaphore: {
                    ...c.memoryRegion.semaphore,
                    hasWriter: true,
                  },
                },
              }
            : c
        )
      );
    }

    // Allocate resources for the transfer with proper type tracking
    const resourceId =
      connection.type === "memory"
        ? `mem_${generateId()}`
        : `res_${generateId()}`;
    setProcesses(
      processes.map((p) => {
        if (p.id === fromProcessId) {
          return {
            ...p,
            state: "running",
            resources: [...p.resources, resourceId],
          };
        }
        return p;
      })
    );

    const newTransfer: DataTransfer = {
      id: generateId(),
      connectionId: connection.id,
      startTime: Date.now(),
      progress: 0,
      size: Math.floor(Math.random() * 5) + 1,
      type: "produce",
    };

    setDataTransfers([...dataTransfers, newTransfer]);

    setConnections(
      connections.map((c) =>
        c.id === connection.id
          ? { ...c, state: "active", currentLoad: (c.currentLoad || 0) + 1 }
          : c
      )
    );

    logEvent(
      "info",
      "Data Transfer Started",
      `Sending data from ${fromProcess?.name} to ${toProcess?.name} via ${connection.type}`
    );

    // Set up resource release after transfer completion
    setTimeout(() => {
      if (connection.type === "memory" && connection.memoryRegion) {
        // Release write lock
        setConnections(
          connections.map((c) =>
            c.memoryRegion?.id === connection.memoryRegion.id
              ? {
                  ...c,
                  memoryRegion: {
                    ...c.memoryRegion,
                    semaphore: {
                      ...c.memoryRegion.semaphore,
                      hasWriter: false,
                    },
                  },
                }
              : c
          )
        );
      }

      setProcesses(
        processes.map((p) => {
          if (p.id === fromProcessId) {
            return {
              ...p,
              state: "idle",
              resources: p.resources.filter((r) => r !== resourceId),
              memoryAccess: undefined,
            };
          }
          return p;
        })
      );

      logEvent(
        "info",
        "Resources Released",
        `${fromProcess?.name} released resources after transfer completion`
      );

      // Check for blocked processes waiting for this memory region
      if (connection.type === "memory" && connection.memoryRegion) {
        const blockedProcesses = processes.filter(
          (p) =>
            p.state === "blocked" && p.waitingFor === connection.memoryRegion.id
        );
        if (blockedProcesses.length > 0) {
          setProcesses(
            processes.map((p) =>
              p.waitingFor === connection.memoryRegion.id
                ? { ...p, state: "idle", waitingFor: null }
                : p
            )
          );
        }
      }
    }, 2000); // Release after 2 seconds

    checkForDeadlocks();
  };

  const consumeData = (fromProcessId: string, toProcessId: string) => {
    const fromProcess = processes.find((p) => p.id === fromProcessId);
    const toProcess = processes.find((p) => p.id === toProcessId);

    const connection = connections.find(
      (c) =>
        (c.from === fromProcessId && c.to === toProcessId) ||
        (c.type === "pipe" && c.from === toProcessId && c.to === fromProcessId)
    );

    if (!connection) return;

    // Handle resource consumption with proper synchronization
    if (connection.type === "queue") {
      const currentLoad = connection.currentLoad || 0;

      if (currentLoad === 0) {
        logEvent(
          "warning",
          "Queue Empty",
          `Cannot consume: No messages available in the queue`
        );
        toast({
          title: "Queue Empty",
          description: "Cannot consume: Queue is empty",
          variant: "destructive",
        });

        // Simulate blocking consumer
        setProcesses(
          processes.map((p) =>
            p.id === toProcessId ? { ...p, state: "blocked" } : p
          )
        );

        setTimeout(() => {
          setProcesses(
            processes.map((p) =>
              p.id === toProcessId ? { ...p, state: "idle" } : p
            )
          );
        }, 1000);

        return;
      }
    } else if (connection.type === "memory" && connection.memoryRegion) {
      // Check for write lock
      if (connection.memoryRegion.semaphore.hasWriter) {
        logEvent(
          "warning",
          "Memory Access Blocked",
          `Cannot read from shared memory: Region is being written to`
        );
        toast({
          title: "Memory Locked",
          description: "Cannot read from shared memory: Write in progress",
          variant: "destructive",
        });

        // Mark process as blocked and waiting for memory access
        setProcesses(
          processes.map((p) =>
            p.id === toProcessId
              ? {
                  ...p,
                  state: "blocked",
                  waitingFor: connection.memoryRegion.id,
                }
              : p
          )
        );
        return;
      }

      // Check reader limit
      if (
        connection.memoryRegion.semaphore.currentReaders >=
        connection.memoryRegion.semaphore.maxReaders
      ) {
        logEvent(
          "warning",
          "Memory Access Blocked",
          `Cannot read from shared memory: Maximum readers reached`
        );
        toast({
          title: "Reader Limit",
          description: "Cannot read from shared memory: Too many readers",
          variant: "destructive",
        });
        return;
      }

      // Increment reader count
      setConnections(
        connections.map((c) =>
          c.memoryRegion?.id === connection.memoryRegion.id
            ? {
                ...c,
                memoryRegion: {
                  ...c.memoryRegion,
                  semaphore: {
                    ...c.memoryRegion.semaphore,
                    currentReaders: c.memoryRegion.semaphore.currentReaders + 1,
                  },
                },
              }
            : c
        )
      );

      // Track this process as a reader
      const resourceId = `read_mem_${generateId()}`;
      setProcesses(
        processes.map((p) =>
          p.id === toProcessId
            ? {
                ...p,
                state: "running",
                resources: [...p.resources, resourceId],
                memoryAccess: {
                  type: "read",
                  regionId: connection.memoryRegion.id,
                },
              }
            : p
        )
      );
    }

    // Allocate resources for consumption
    const resourceId = generateId();
    setProcesses(
      processes.map((p) => {
        if (p.id === toProcessId) {
          return {
            ...p,
            state: "running",
            resources: [...p.resources, resourceId],
          };
        }
        return p;
      })
    );

    const newTransfer: DataTransfer = {
      id: generateId(),
      connectionId: connection.id,
      startTime: Date.now(),
      progress: 0,
      size: Math.floor(Math.random() * 5) + 1,
      type: "consume",
    };

    setDataTransfers([...dataTransfers, newTransfer]);

    setConnections(
      connections.map((c) =>
        c.id === connection.id
          ? {
              ...c,
              state: "active",
              currentLoad: Math.max(0, (c.currentLoad || 1) - 1),
            }
          : c
      )
    );

    logEvent(
      "info",
      "Resource Consumption Started",
      `${toProcess?.name} started consuming resource from ${fromProcess?.name}`
    );

    // Release resources after consumption
    setTimeout(() => {
      if (connection.type === "memory" && connection.memoryRegion) {
        // Release reader lock
        setConnections(
          connections.map((c) =>
            c.memoryRegion?.id === connection.memoryRegion.id
              ? {
                  ...c,
                  memoryRegion: {
                    ...c.memoryRegion,
                    semaphore: {
                      ...c.memoryRegion.semaphore,
                      currentReaders: Math.max(
                        0,
                        c.memoryRegion.semaphore.currentReaders - 1
                      ),
                    },
                  },
                }
              : c
          )
        );
      }

      setProcesses(
        processes.map((p) => {
          if (p.id === toProcessId) {
            return {
              ...p,
              state: "idle",
              resources: p.resources.filter((r) => r !== resourceId),
              memoryAccess: undefined,
            };
          }
          return p;
        })
      );

      logEvent(
        "info",
        "Resources Released",
        `${toProcess?.name} released resources after consumption`
      );

      // Check for blocked processes waiting for this memory region
      if (connection.type === "memory" && connection.memoryRegion) {
        const blockedProcesses = processes.filter(
          (p) =>
            p.state === "blocked" && p.waitingFor === connection.memoryRegion.id
        );
        if (blockedProcesses.length > 0) {
          setProcesses(
            processes.map((p) =>
              p.waitingFor === connection.memoryRegion.id
                ? { ...p, state: "idle", waitingFor: null }
                : p
            )
          );
        }
      }
    }, 2000); // Release after 2 seconds
  };

  const createProducerConsumerSimulation = () => {
    setProcesses([]);
    setConnections([]);
    setDataTransfers([]);

    logEvent(
      "info",
      "Demo Started",
      "Setting up Producer-Consumer Problem simulation"
    );

    const producer: Process = {
      id: generateId(),
      name: "Producer",
      position: { x: 200, y: 200 },
      state: "idle",
      resources: [],
      waitingFor: null,
    };

    const consumer: Process = {
      id: generateId(),
      name: "Consumer",
      position: { x: 500, y: 200 },
      state: "idle",
      resources: [],
      waitingFor: null,
    };

    const buffer: Process = {
      id: generateId(),
      name: "Buffer",
      position: { x: 350, y: 350 },
      state: "idle",
      resources: [],
      waitingFor: null,
    };

    setProcesses([producer, consumer, buffer]);

    setTimeout(() => {
      const producerToBuffer: Connection = {
        id: generateId(),
        from: producer.id,
        to: buffer.id,
        type: "queue",
        state: "idle",
        capacity: 5,
        currentLoad: 0,
      };

      const bufferToConsumer: Connection = {
        id: generateId(),
        from: buffer.id,
        to: consumer.id,
        type: "queue",
        state: "idle",
        capacity: 5,
        currentLoad: 0,
      };

      setConnections([producerToBuffer, bufferToConsumer]);

      logEvent(
        "success",
        "Demo Ready",
        "Producer-Consumer simulation created with limited buffer. Producer can send data to buffer, and Consumer can consume from buffer."
      );

      toast({
        title: "Simulation Created",
        description: "Click on processes to produce or consume resources",
      });

      // Set up automatic consumer behavior
      const consumeInterval = setInterval(() => {
        const currentBuffer = connections.find(
          (c) => c.from === buffer.id && c.to === consumer.id
        );
        if (currentBuffer?.currentLoad && currentBuffer.currentLoad > 0) {
          consumeData(buffer.id, consumer.id);
        }
      }, 2000);

      // Clean up interval when simulation changes
      return () => clearInterval(consumeInterval);
    }, 100);
  };

  const createDeadlockDemoSimulation = () => {
    setProcesses([]);
    setConnections([]);
    setDataTransfers([]);

    logEvent(
      "info",
      "Demo Started",
      "Setting up Deadlock Detection simulation"
    );

    const process1: Process = {
      id: generateId(),
      name: "Process A",
      position: { x: 250, y: 150 },
      state: "idle",
      resources: [],
      waitingFor: null,
    };

    const process2: Process = {
      id: generateId(),
      name: "Process B",
      position: { x: 450, y: 150 },
      state: "idle",
      resources: [],
      waitingFor: null,
    };

    const process3: Process = {
      id: generateId(),
      name: "Process C",
      position: { x: 350, y: 300 },
      state: "idle",
      resources: [],
      waitingFor: null,
    };

    setProcesses([process1, process2, process3]);

    setTimeout(() => {
      const connection1: Connection = {
        id: generateId(),
        from: process1.id,
        to: process2.id,
        type: "memory",
        state: "idle",
        currentLoad: 0,
      };

      const connection2: Connection = {
        id: generateId(),
        from: process2.id,
        to: process3.id,
        type: "memory",
        state: "idle",
        currentLoad: 0,
      };

      const connection3: Connection = {
        id: generateId(),
        from: process3.id,
        to: process1.id,
        type: "memory",
        state: "idle",
        currentLoad: 0,
      };

      setConnections([connection1, connection2, connection3]);

      logEvent(
        "success",
        "Demo Ready",
        "Circular dependency created - send data in a cycle to trigger deadlock detection"
      );

      toast({
        title: "Deadlock Demo Created",
        description:
          "Send data between processes to simulate a deadlock scenario",
      });
    }, 100);
  };

  const createPipeDemoSimulation = () => {
    setProcesses([]);
    setConnections([]);
    setDataTransfers([]);

    logEvent(
      "info",
      "Demo Started",
      "Setting up Pipe Communication simulation"
    );

    const parentProcess: Process = {
      id: generateId(),
      name: "Parent Process",
      position: { x: 250, y: 200 },
      state: "idle",
      resources: [],
      waitingFor: null,
    };

    const childProcess: Process = {
      id: generateId(),
      name: "Child Process",
      position: { x: 450, y: 200 },
      state: "idle",
      resources: [],
      waitingFor: null,
    };

    setProcesses([parentProcess, childProcess]);

    setTimeout(() => {
      const pipeConnection: Connection = {
        id: generateId(),
        from: parentProcess.id,
        to: childProcess.id,
        type: "pipe",
        state: "idle",
        currentLoad: 0,
      };

      setConnections([pipeConnection]);

      logEvent(
        "success",
        "Demo Ready",
        "Pipe communication channel created between parent and child process"
      );

      toast({
        title: "Pipe Demo Created",
        description:
          "Send data between parent and child processes through pipe",
      });
    }, 100);
  };

  useEffect(() => {
    if (dataTransfers.length === 0) return;

    const interval = setInterval(() => {
      setDataTransfers((prev) => {
        const completedTransfers = prev.filter((t) => t.progress >= 100);
        const updatedTransfers = prev
          .map((transfer) => {
            if (transfer.progress >= 100) return transfer;

            return {
              ...transfer,
              progress: transfer.progress + 10,
            };
          })
          .filter((t) => t.progress < 100);

        completedTransfers.forEach((transfer) => {
          const connection = connections.find(
            (c) => c.id === transfer.connectionId
          );
          if (connection) {
            const fromProcess = processes.find((p) => p.id === connection.from);
            const toProcess = processes.find((p) => p.id === connection.to);

            logEvent(
              "success",
              "Data Transfer Complete",
              `Data successfully transferred from ${fromProcess?.name} to ${toProcess?.name}`
            );

            setConnections((prev) =>
              prev.map((c) =>
                c.id === connection.id
                  ? { ...c, currentLoad: Math.max(0, (c.currentLoad || 0) - 1) }
                  : c
              )
            );
          }
        });

        return updatedTransfers;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [dataTransfers, connections, processes]);

  const checkForDeadlocks = () => {
    const activeConnections = connections.filter((c) => c.state === "active");
    const busyProcesses = new Set();

    activeConnections.forEach((conn) => {
      busyProcesses.add(conn.from);
      busyProcesses.add(conn.to);
    });

    if (
      activeConnections.length > 0 &&
      busyProcesses.size === processes.length &&
      processes.length > 1
    ) {
      // Mark all processes as deadlocked
      setProcesses(
        processes.map((p) => ({
          ...p,
          state: "deadlocked",
        }))
      );

      // Mark all active connections as deadlocked
      setConnections(
        connections.map((c) => ({
          ...c,
          state: c.state === "active" ? "deadlocked" : c.state,
        }))
      );

      logEvent(
        "error",
        "Deadlock Detected",
        "All processes are waiting for resources in a circular dependency"
      );

      toast({
        title: "Deadlock Detected",
        description: "Circular dependency detected between processes",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    connections.forEach((conn) => {
      if (
        conn.type === "queue" &&
        conn.capacity &&
        conn.currentLoad &&
        conn.currentLoad >= conn.capacity * 0.8
      ) {
        logEvent(
          "warning",
          "Queue Bottleneck",
          `Queue is at ${Math.round(
            (conn.currentLoad / conn.capacity) * 100
          )}% capacity`
        );

        toast({
          title: "Bottleneck Detected",
          description: `Queue is at ${Math.round(
            (conn.currentLoad / conn.capacity) * 100
          )}% capacity`,
          variant: "default",
        });
      }
    });
  }, [connections]);

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          variant={interactionMode === "create" ? "default" : "outline"}
          size="sm"
          onClick={() => setInteractionMode("create")}
          className="flex items-center gap-1"
        >
          <span className="text-xs">Create</span>
        </Button>
        <Button
          variant={interactionMode === "hand" ? "default" : "outline"}
          size="sm"
          onClick={() => setInteractionMode("hand")}
          className="flex items-center gap-1"
        >
          <Hand className="h-4 w-4" />
          <span className="text-xs">Hand</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={createProducerConsumerSimulation}
          className="flex items-center gap-1 ml-4"
        >
          <span className="text-xs">Producer-Consumer</span>
        </Button>

        {demoMode && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={createDeadlockDemoSimulation}
              className="flex items-center gap-1"
            >
              <span className="text-xs">Deadlock Demo</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={createPipeDemoSimulation}
              className="flex items-center gap-1"
            >
              <span className="text-xs">Pipe Demo</span>
            </Button>
          </>
        )}
      </div>
      <div
        ref={canvasRef}
        className={`canvas-area w-full h-full min-h-[600px] relative overflow-hidden ${
          interactionMode === "hand" ? "cursor-move" : "cursor-default"
        }`}
        onClick={handleCanvasClick}
      >
        {connections.map((connection) => {
          const fromProcess = processes.find((p) => p.id === connection.from);
          const toProcess = processes.find((p) => p.id === connection.to);

          if (!fromProcess || !toProcess) return null;

          return (
            <IPCConnection
              key={connection.id}
              connection={connection}
              fromPosition={fromProcess.position}
              toPosition={toProcess.position}
              dataTransfers={dataTransfers.filter(
                (t) => t.connectionId === connection.id
              )}
            />
          );
        })}

        {processes.map((process) => (
          <ProcessNode
            key={process.id}
            process={process}
            onStartConnection={startConnection}
            onCompleteConnection={completeConnection}
            onSendData={(toProcessId) => sendData(process.id, toProcessId)}
            onRemove={() => removeProcess(process.id)}
            connectMode={connectMode}
            connectionOptions={connections
              .filter((c) => c.from === process.id || c.to === process.id)
              .map((c) => ({
                processId: c.from === process.id ? c.to : c.from,
                processName:
                  processes.find(
                    (p) => p.id === (c.from === process.id ? c.to : c.from)
                  )?.name || "",
                type: c.type,
              }))}
          />
        ))}

        {processes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="mb-2">Click anywhere to add a process</p>
              <p>Then create IPC connections between processes</p>
              <p className="mt-4">Or use the Demo buttons to see examples</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessCanvas;
