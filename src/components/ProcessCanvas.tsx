import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import ProcessNode from './ProcessNode';
import IPCConnection from './IPCConnection';
import { Process, Connection, Position, IPCType, DataTransfer } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProcessCanvas: React.FC = () => {
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
  };

  const startConnection = (processId: string, type: IPCType) => {
    setConnectMode({
      active: true,
      fromProcess: processId,
      type
    });
    
    toast({
      title: "Connection Started",
      description: `Select another process to complete the ${type} connection`,
    });
  };

  const completeConnection = (toProcessId: string) => {
    if (!connectMode.active || !connectMode.fromProcess || connectMode.fromProcess === toProcessId) {
      return;
    }

    const connectionExists = connections.some(
      conn => 
        (conn.from === connectMode.fromProcess && conn.to === toProcessId) ||
        (conn.from === toProcessId && conn.to === connectMode.fromProcess && conn.type === 'pipe')
    );

    if (connectionExists) {
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
    
    toast({
      title: "Connection Created",
      description: `Created ${connectMode.type} between processes`
    });
    
    setConnectMode({ active: false, type: 'pipe' });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (connectMode.active) {
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
    setProcesses(processes.filter(p => p.id !== processId));
    setConnections(connections.filter(c => c.from !== processId && c.to !== processId));
  };

  const sendData = (fromProcessId: string, toProcessId: string) => {
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
    
    checkForDeadlocks();
  };

  const createProducerConsumerSimulation = () => {
    setProcesses([]);
    setConnections([]);
    setDataTransfers([]);

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

      toast({
        title: "Simulation Created",
        description: "Producer-Consumer problem simulation has been set up",
      });
    }, 100);
  };

  useEffect(() => {
    if (dataTransfers.length === 0) return;
    
    const interval = setInterval(() => {
      setDataTransfers(prev => prev.map(transfer => {
        if (transfer.progress >= 100) {
          const connection = connections.find(c => c.id === transfer.connectionId);
          if (connection) {
            setConnections(connections.map(c => 
              c.id === connection.id ? { ...c, currentLoad: Math.max(0, (c.currentLoad || 0) - 1) } : c
            ));
          }
          return transfer;
        }
        
        return {
          ...transfer,
          progress: transfer.progress + 10
        };
      }).filter(t => t.progress < 100));
    }, 500);
    
    return () => clearInterval(interval);
  }, [dataTransfers, connections]);

  const checkForDeadlocks = () => {
    const activeConnections = connections.filter(c => c.state === 'active');
    const busyProcesses = new Set();
    
    activeConnections.forEach(conn => {
      busyProcesses.add(conn.from);
      busyProcesses.add(conn.to);
    });
    
    if (activeConnections.length > 0 && busyProcesses.size === processes.length && processes.length > 1) {
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
          <span className="text-xs">Producer-Consumer Demo</span>
        </Button>
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
              <p className="mt-4">Or use the Producer-Consumer Demo button</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessCanvas;
