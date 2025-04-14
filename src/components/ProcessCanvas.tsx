import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import ProcessNode from './ProcessNode';
import IPCConnection from './IPCConnection';
import { Process, Connection, Position, IPCType, DataTransfer } from '@/lib/types';
import { LogEntry } from './LogPanel';
import { generateId } from '@/lib/utils';
import { Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProcessCanvasProps {
  onLogEvent?: (log: LogEntry) => void;
  demoMode?: boolean;
}

const ProcessCanvas: React.FC<ProcessCanvasProps> = ({ onLogEvent, demoMode = false }) => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dataTransfers, setDataTransfers] = useState<DataTransfer[]>([]);
  const [connectMode, setConnectMode] = useState<{active: boolean, fromProcess?: string, type: IPCType}>({
    active: false,
    type: 'pipe'
  });
  const [interactionMode, setInteractionMode] = useState<'create' | 'hand'>('create');
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const logEvent = (type: LogEntry['type'], message: string, details?: string) => {
    if (onLogEvent) {
      onLogEvent({
        id: generateId(),
        timestamp: new Date(),
        type,
        message,
        details
      });
    }
  };

  const addProcess = (position: Position) => {
    const newProcess: Process = {
      id: generateId(),
      name: `Process ${processes.length + 1}`,
      position,
      state: 'idle',
      resources: [],
      waitingFor: null
    };
    
    setProcesses([...processes, newProcess]);
    logEvent('info', 'Process Created', `${newProcess.name} added at position (${Math.round(position.x)}, ${Math.round(position.y)})`);
  };

  const startConnection = (processId: string, type: IPCType) => {
    setConnectMode({
      active: true,
      fromProcess: processId,
      type
    });
    
    const process = processes.find(p => p.id === processId);
    logEvent('info', 'Connection Started', `Starting ${type} connection from ${process?.name}`);
    
    toast({
      title: "Connection Started",
      description: `Select another process to complete the ${type} connection`,
    });
  };

  const completeConnection = (toProcessId: string) => {
    if (!connectMode.active || !connectMode.fromProcess || connectMode.fromProcess === toProcessId) {
      return;
    }

    const fromProcess = processes.find(p => p.id === connectMode.fromProcess);
    const toProcess = processes.find(p => p.id === toProcessId);
    
    const connectionExists = connections.some(
      conn => 
        (conn.from === connectMode.fromProcess && conn.to === toProcessId) ||
        (conn.from === toProcessId && conn.to === connectMode.fromProcess && conn.type === 'pipe')
    );

    if (connectionExists) {
      logEvent('warning', 'Connection Failed', `Connection between ${fromProcess?.name} and ${toProcess?.name} already exists`);
      
      toast({
        title: "Connection exists",
        description: "These processes are already connected",
        variant: "destructive"
      });
      setConnectMode({ active: false, type: 'pipe' });
      return;
    }

    const newConnection: Connection = {
      id: generateId(),
      from: connectMode.fromProcess,
      to: toProcessId,
      type: connectMode.type,
      state: 'idle',
      capacity: connectMode.type === 'queue' ? 10 : undefined,
      currentLoad: 0
    };

    setConnections([...connections, newConnection]);
    
    logEvent('success', 'Connection Created', `${connectMode.type} established between ${fromProcess?.name} and ${toProcess?.name}`);
    
    toast({
      title: "Connection Created",
      description: `Created ${connectMode.type} between processes`
    });
    
    setConnectMode({ active: false, type: 'pipe' });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (connectMode.active) {
      logEvent('info', 'Connection Cancelled', 'Clicked on canvas instead of a process');
      setConnectMode({ active: false, type: 'pipe' });
      return;
    }

    if (interactionMode === 'create' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      addProcess(position);
    }
  };

  const removeProcess = (processId: string) => {
    const process = processes.find(p => p.id === processId);
    
    const connectionsToRemove = connections.filter(c => c.from === processId || c.to === processId);
    
    setProcesses(processes.filter(p => p.id !== processId));
    setConnections(connections.filter(c => c.from !== processId && c.to !== processId));
    
    logEvent('warning', `Process Removed`, `${process?.name} and ${connectionsToRemove.length} connection(s) were removed`);
  };

  const sendData = (fromProcessId: string, toProcessId: string) => {
    const fromProcess = processes.find(p => p.id === fromProcessId);
    const toProcess = processes.find(p => p.id === toProcessId);
    
    const connection = connections.find(
      c => (c.from === fromProcessId && c.to === toProcessId) ||
           (c.type === 'pipe' && c.from === toProcessId && c.to === fromProcessId)
    );

    if (!connection) return;

    const newTransfer: DataTransfer = {
      id: generateId(),
      connectionId: connection.id,
      startTime: Date.now(),
      progress: 0,
      size: Math.floor(Math.random() * 5) + 1
    };
    
    setDataTransfers([...dataTransfers, newTransfer]);
    
    setConnections(connections.map(c => 
      c.id === connection.id ? { ...c, state: 'active', currentLoad: (c.currentLoad || 0) + 1 } : c
    ));
    
    logEvent('info', 'Data Transfer Started', `Sending data from ${fromProcess?.name} to ${toProcess?.name} via ${connection.type}`);
    
    checkForDeadlocks();
  };

  const createProducerConsumerSimulation = () => {
    setProcesses([]);
    setConnections([]);
    setDataTransfers([]);

    logEvent('info', 'Demo Started', 'Setting up Producer-Consumer Problem simulation');

    const producer: Process = {
      id: generateId(),
      name: "Producer",
      position: { x: 200, y: 200 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const consumer: Process = {
      id: generateId(),
      name: "Consumer",
      position: { x: 500, y: 200 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const buffer: Process = {
      id: generateId(),
      name: "Buffer",
      position: { x: 350, y: 350 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    setProcesses([producer, consumer, buffer]);

    setTimeout(() => {
      const producerToBuffer: Connection = {
        id: generateId(),
        from: producer.id,
        to: buffer.id,
        type: 'queue',
        state: 'idle',
        capacity: 5,
        currentLoad: 0
      };

      const bufferToConsumer: Connection = {
        id: generateId(),
        from: buffer.id,
        to: consumer.id,
        type: 'queue',
        state: 'idle',
        capacity: 5,
        currentLoad: 0
      };

      setConnections([producerToBuffer, bufferToConsumer]);

      logEvent('success', 'Demo Ready', 'Producer-Consumer simulation created with limited buffer');

      toast({
        title: "Simulation Created",
        description: "Producer-Consumer problem simulation has been set up",
      });
    }, 100);
  };

  const createDeadlockDemoSimulation = () => {
    setProcesses([]);
    setConnections([]);
    setDataTransfers([]);
    
    logEvent('info', 'Demo Started', 'Setting up Deadlock Detection simulation');

    const process1: Process = {
      id: generateId(),
      name: "Process A",
      position: { x: 250, y: 150 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const process2: Process = {
      id: generateId(),
      name: "Process B",
      position: { x: 450, y: 150 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const process3: Process = {
      id: generateId(),
      name: "Process C",
      position: { x: 350, y: 300 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    setProcesses([process1, process2, process3]);

    setTimeout(() => {
      const connection1: Connection = {
        id: generateId(),
        from: process1.id,
        to: process2.id,
        type: 'memory',
        state: 'idle',
        currentLoad: 0
      };

      const connection2: Connection = {
        id: generateId(),
        from: process2.id,
        to: process3.id,
        type: 'memory',
        state: 'idle',
        currentLoad: 0
      };

      const connection3: Connection = {
        id: generateId(),
        from: process3.id,
        to: process1.id,
        type: 'memory',
        state: 'idle',
        currentLoad: 0
      };

      setConnections([connection1, connection2, connection3]);
      
      logEvent('success', 'Demo Ready', 'Circular dependency created - send data in a cycle to trigger deadlock detection');

      toast({
        title: "Deadlock Demo Created",
        description: "Send data between processes to simulate a deadlock scenario",
      });
    }, 100);
  };

  const createPipeDemoSimulation = () => {
    setProcesses([]);
    setConnections([]);
    setDataTransfers([]);
    
    logEvent('info', 'Demo Started', 'Setting up Pipe Communication simulation');

    const parentProcess: Process = {
      id: generateId(),
      name: "Parent Process",
      position: { x: 250, y: 200 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const childProcess: Process = {
      id: generateId(),
      name: "Child Process",
      position: { x: 450, y: 200 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    setProcesses([parentProcess, childProcess]);

    setTimeout(() => {
      const pipeConnection: Connection = {
        id: generateId(),
        from: parentProcess.id,
        to: childProcess.id,
        type: 'pipe',
        state: 'idle',
        currentLoad: 0
      };

      setConnections([pipeConnection]);
      
      logEvent('success', 'Demo Ready', 'Pipe communication channel created between parent and child process');

      toast({
        title: "Pipe Demo Created",
        description: "Send data between parent and child processes through pipe",
      });
    }, 100);
  };

  const createReadersWritersSimulation = () => {
    setProcesses([]);
    setConnections([]);
    setDataTransfers([]);
    
    logEvent('info', 'Demo Started', 'Setting up Readers-Writers Problem simulation');

    const database: Process = {
      id: generateId(),
      name: "Database",
      position: { x: 350, y: 250 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const reader1: Process = {
      id: generateId(),
      name: "Reader 1",
      position: { x: 200, y: 150 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const reader2: Process = {
      id: generateId(),
      name: "Reader 2",
      position: { x: 200, y: 350 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const writer1: Process = {
      id: generateId(),
      name: "Writer 1",
      position: { x: 500, y: 150 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const writer2: Process = {
      id: generateId(),
      name: "Writer 2",
      position: { x: 500, y: 350 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    setProcesses([database, reader1, reader2, writer1, writer2]);

    setTimeout(() => {
      const reader1ToDb: Connection = {
        id: generateId(),
        from: reader1.id,
        to: database.id,
        type: 'memory',
        state: 'idle',
        currentLoad: 0
      };

      const reader2ToDb: Connection = {
        id: generateId(),
        from: reader2.id,
        to: database.id,
        type: 'memory',
        state: 'idle',
        currentLoad: 0
      };

      const writer1ToDb: Connection = {
        id: generateId(),
        from: writer1.id,
        to: database.id,
        type: 'memory',
        state: 'idle',
        currentLoad: 0
      };

      const writer2ToDb: Connection = {
        id: generateId(),
        from: writer2.id,
        to: database.id,
        type: 'memory',
        state: 'idle',
        currentLoad: 0
      };

      setConnections([reader1ToDb, reader2ToDb, writer1ToDb, writer2ToDb]);
      
      logEvent('success', 'Demo Ready', 'Readers-Writers Problem simulation created. Multiple readers can access simultaneously, but writers need exclusive access.');
      
      onLogEvent?.({
        id: generateId(),
        timestamp: new Date(),
        type: 'info',
        message: 'Readers-Writers Problem',
        details: 'This demonstrates shared resource access with different priorities',
        additionalInfo: {
          severity: 'low',
          processes: ['Reader 1', 'Reader 2', 'Writer 1', 'Writer 2', 'Database'],
          resources: ['Shared Memory'],
          solutions: [
            'Use read-write locks to allow multiple readers but only one writer',
            'Implement priority mechanisms to prevent starvation'
          ]
        }
      });

      toast({
        title: "Simulation Created",
        description: "Readers-Writers Problem simulation has been set up",
      });
    }, 100);
  };

  const createDiningPhilosophersSimulation = () => {
    setProcesses([]);
    setConnections([]);
    setDataTransfers([]);
    
    logEvent('info', 'Demo Started', 'Setting up Dining Philosophers Problem simulation');

    const center = { x: 350, y: 250 };
    const radius = 150;
    const numPhilosophers = 5;
    const philosophers: Process[] = [];
    const forks: Process[] = [];

    for (let i = 0; i < numPhilosophers; i++) {
      const angle = (i * 2 * Math.PI) / numPhilosophers;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      
      philosophers.push({
        id: generateId(),
        name: `Philosopher ${i+1}`,
        position: { x, y },
        state: 'idle',
        resources: [],
        waitingFor: null
      });
      
      const forkAngle = ((i + 0.5) * 2 * Math.PI) / numPhilosophers;
      const forkRadius = radius * 0.7;
      const forkX = center.x + forkRadius * Math.cos(forkAngle);
      const forkY = center.y + forkRadius * Math.sin(forkAngle);
      
      forks.push({
        id: generateId(),
        name: `Fork ${i+1}`,
        position: { x: forkX, y: forkY },
        state: 'idle',
        resources: [],
        waitingFor: null
      });
    }
    
    setProcesses([...philosophers, ...forks]);

    setTimeout(() => {
      const connections: Connection[] = [];
      
      for (let i = 0; i < numPhilosophers; i++) {
        const leftForkIndex = i;
        const rightForkIndex = (i + 1) % numPhilosophers;
        
        connections.push({
          id: generateId(),
          from: philosophers[i].id,
          to: forks[leftForkIndex].id,
          type: 'memory',
          state: 'idle',
          currentLoad: 0
        });
        
        connections.push({
          id: generateId(),
          from: philosophers[i].id,
          to: forks[rightForkIndex].id,
          type: 'memory',
          state: 'idle',
          currentLoad: 0
        });
      }
      
      setConnections(connections);
      
      logEvent('success', 'Demo Ready', 'Dining Philosophers Problem simulation created. Use the simulation to see how deadlocks can form.');
      
      onLogEvent?.({
        id: generateId(),
        timestamp: new Date(),
        type: 'info',
        message: 'Dining Philosophers Problem',
        details: 'Classic synchronization problem demonstrating deadlock potential',
        additionalInfo: {
          severity: 'medium',
          processes: philosophers.map(p => p.name),
          resources: forks.map(f => f.name),
          solutions: [
            'Implement resource hierarchy (assign numbers to forks)',
            'Allow at most N-1 philosophers to sit simultaneously',
            'Use an arbitrator (waiter) to control resource allocation'
          ]
        }
      });

      toast({
        title: "Simulation Created",
        description: "Dining Philosophers Problem simulation has been set up",
      });
    }, 100);
  };

  const createBoundedBufferSimulation = () => {
    setProcesses([]);
    setConnections([]);
    setDataTransfers([]);
    
    logEvent('info', 'Demo Started', 'Setting up Bounded Buffer Problem simulation');

    const producer1: Process = {
      id: generateId(),
      name: "Fast Producer",
      position: { x: 150, y: 150 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const producer2: Process = {
      id: generateId(),
      name: "Slow Producer",
      position: { x: 150, y: 350 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const consumer1: Process = {
      id: generateId(),
      name: "Fast Consumer",
      position: { x: 550, y: 150 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const consumer2: Process = {
      id: generateId(),
      name: "Slow Consumer",
      position: { x: 550, y: 350 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    const buffer: Process = {
      id: generateId(),
      name: "Small Buffer",
      position: { x: 350, y: 250 },
      state: 'idle',
      resources: [],
      waitingFor: null
    };

    setProcesses([producer1, producer2, consumer1, consumer2, buffer]);

    setTimeout(() => {
      const producer1ToBuffer: Connection = {
        id: generateId(),
        from: producer1.id,
        to: buffer.id,
        type: 'queue',
        state: 'idle',
        capacity: 3,
        currentLoad: 0
      };

      const producer2ToBuffer: Connection = {
        id: generateId(),
        from: producer2.id,
        to: buffer.id,
        type: 'queue',
        state: 'idle',
        capacity: 3,
        currentLoad: 0
      };

      const bufferToConsumer1: Connection = {
        id: generateId(),
        from: buffer.id,
        to: consumer1.id,
        type: 'queue',
        state: 'idle',
        capacity: 3,
        currentLoad: 0
      };

      const bufferToConsumer2: Connection = {
        id: generateId(),
        from: buffer.id,
        to: consumer2.id,
        type: 'queue',
        state: 'idle',
        capacity: 3,
        currentLoad: 0
      };

      setConnections([producer1ToBuffer, producer2ToBuffer, bufferToConsumer1, bufferToConsumer2]);
      
      logEvent('success', 'Demo Ready', 'Bounded Buffer Problem simulation created with very small buffer capacity.');
      
      onLogEvent?.({
        id: generateId(),
        timestamp: new Date(),
        type: 'warning',
        message: 'Bounded Buffer Challenge',
        details: 'Small buffer size will lead to bottlenecks when producers are faster than consumers',
        additionalInfo: {
          severity: 'medium',
          processes: ['Fast Producer', 'Slow Producer', 'Fast Consumer', 'Slow Consumer', 'Small Buffer'],
          resources: ['Queue Buffers (capacity: 3)'],
          solutions: [
            'Increase buffer size',
            'Implement backpressure mechanisms',
            'Balance producer and consumer speeds'
          ]
        }
      });

      toast({
        title: "Simulation Created",
        description: "Bounded Buffer Problem simulation has been set up",
      });
    }, 100);
  };

  useEffect(() => {
    if (dataTransfers.length === 0) return;
    
    const interval = setInterval(() => {
      setDataTransfers(prev => {
        const completedTransfers = prev.filter(t => t.progress >= 100);
        const updatedTransfers = prev.map(transfer => {
          if (transfer.progress >= 100) return transfer;
          
          return {
            ...transfer,
            progress: transfer.progress + 10
          };
        }).filter(t => t.progress < 100);
        
        completedTransfers.forEach(transfer => {
          const connection = connections.find(c => c.id === transfer.connectionId);
          if (connection) {
            const fromProcess = processes.find(p => p.id === connection.from);
            const toProcess = processes.find(p => p.id === connection.to);
            
            logEvent('success', 'Data Transfer Complete', 
              `Data successfully transferred from ${fromProcess?.name} to ${toProcess?.name}`);
            
            setConnections(prev => prev.map(c => 
              c.id === connection.id ? { ...c, currentLoad: Math.max(0, (c.currentLoad || 0) - 1) } : c
            ));
          }
        });
        
        return updatedTransfers;
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, [dataTransfers, connections, processes]);

  const checkForDeadlocks = () => {
    const activeConnections = connections.filter(c => c.state === 'active');
    const busyProcesses = new Set();
    
    activeConnections.forEach(conn => {
      busyProcesses.add(conn.from);
      busyProcesses.add(conn.to);
    });
    
    if (activeConnections.length > 0 && busyProcesses.size === processes.length && processes.length > 1) {
      logEvent('error', 'Deadlock Detected', 'All processes are waiting for resources in a circular dependency');
      
      toast({
        title: "Potential Deadlock Detected",
        description: "All processes are waiting for resources",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    connections.forEach(conn => {
      if (conn.type === 'queue' && conn.capacity && conn.currentLoad && conn.currentLoad >= conn.capacity * 0.8) {
        logEvent('warning', 'Queue Bottleneck', `Queue is at ${Math.round((conn.currentLoad / conn.capacity) * 100)}% capacity`);
        
        toast({
          title: "Bottleneck Detected",
          description: `Queue is at ${Math.round((conn.currentLoad / conn.capacity) * 100)}% capacity`,
          variant: "default"
        });
      }
    });
  }, [connections]);

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button 
          variant={interactionMode === 'create' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setInteractionMode('create')}
          className="flex items-center gap-1"
        >
          <span className="text-xs">Create</span>
        </Button>
        <Button 
          variant={interactionMode === 'hand' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setInteractionMode('hand')}
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={createReadersWritersSimulation}
              className="flex items-center gap-1"
            >
              <span className="text-xs">Readers-Writers</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={createDiningPhilosophersSimulation}
              className="flex items-center gap-1"
            >
              <span className="text-xs">Dining Philosophers</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={createBoundedBufferSimulation}
              className="flex items-center gap-1"
            >
              <span className="text-xs">Bounded Buffer</span>
            </Button>
          </>
        )}
      </div>
      <div 
        ref={canvasRef}
        className={`canvas-area w-full h-full min-h-[600px] relative overflow-hidden ${
          interactionMode === 'hand' ? 'cursor-move' : 'cursor-default'
        }`}
        onClick={handleCanvasClick}
      >
        {connections.map(connection => {
          const fromProcess = processes.find(p => p.id === connection.from);
          const toProcess = processes.find(p => p.id === connection.to);
          
          if (!fromProcess || !toProcess) return null;
          
          return (
            <IPCConnection
              key={connection.id}
              connection={connection}
              fromPosition={fromProcess.position}
              toPosition={toProcess.position}
              dataTransfers={dataTransfers.filter(t => t.connectionId === connection.id)}
            />
          );
        })}
        
        {processes.map(process => (
          <ProcessNode
            key={process.id}
            process={process}
            onStartConnection={startConnection}
            onCompleteConnection={completeConnection}
            onSendData={(toProcessId) => sendData(process.id, toProcessId)}
            onRemove={() => removeProcess(process.id)}
            connectMode={connectMode}
            connectionOptions={connections
              .filter(c => c.from === process.id || c.to === process.id)
              .map(c => ({
                processId: c.from === process.id ? c.to : c.from,
                processName: processes.find(p => p.id === (c.from === process.id ? c.to : c.from))?.name || '',
                type: c.type
              }))
            }
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
