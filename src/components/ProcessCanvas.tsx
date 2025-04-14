
import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import ProcessNode from './ProcessNode';
import IPCConnection from './IPCConnection';
import { Process, Connection, Position, IPCType, DataTransfer } from '@/lib/types';
import { generateId } from '@/lib/utils';

const ProcessCanvas: React.FC = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dataTransfers, setDataTransfers] = useState<DataTransfer[]>([]);
  const [connectMode, setConnectMode] = useState<{active: boolean, fromProcess?: string, type: IPCType}>({
    active: false,
    type: 'pipe'
  });
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Add a process at a specific position
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

  // Start a connection from a process
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

  // Complete a connection to another process
  const completeConnection = (toProcessId: string) => {
    if (!connectMode.active || !connectMode.fromProcess || connectMode.fromProcess === toProcessId) {
      return;
    }

    // Check if connection already exists
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

  // Handle canvas click for adding processes
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (connectMode.active) {
      setConnectMode({ active: false, type: 'pipe' });
      return;
    }

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      addProcess(position);
    }
  };

  // Remove a process and its connections
  const removeProcess = (processId: string) => {
    setProcesses(processes.filter(p => p.id !== processId));
    setConnections(connections.filter(c => c.from !== processId && c.to !== processId));
  };

  // Send data through a connection
  const sendData = (fromProcessId: string, toProcessId: string) => {
    const connection = connections.find(
      c => (c.from === fromProcessId && c.to === toProcessId) ||
           (c.type === 'pipe' && c.from === toProcessId && c.to === fromProcessId)
    );

    if (!connection) return;

    // Create a data transfer
    const newTransfer: DataTransfer = {
      id: generateId(),
      connectionId: connection.id,
      startTime: Date.now(),
      progress: 0,
      size: Math.floor(Math.random() * 5) + 1 // Random size 1-5
    };
    
    setDataTransfers([...dataTransfers, newTransfer]);
    
    // Update connection state
    setConnections(connections.map(c => 
      c.id === connection.id ? { ...c, state: 'active', currentLoad: (c.currentLoad || 0) + 1 } : c
    ));
    
    // Check for potential deadlocks
    checkForDeadlocks();
  };

  // Simulate data transfer progress
  useEffect(() => {
    if (dataTransfers.length === 0) return;
    
    const interval = setInterval(() => {
      setDataTransfers(prev => prev.map(transfer => {
        if (transfer.progress >= 100) {
          // Remove completed transfer
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

  // Check for deadlocks in the IPC system
  const checkForDeadlocks = () => {
    // Simple deadlock detection for demo purposes
    // In a real system, this would be more sophisticated (like using a wait-for graph)
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

  // Calculate connection metrics and check for bottlenecks
  useEffect(() => {
    // Check for bottlenecks
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
    <div 
      ref={canvasRef}
      className="canvas-area w-full h-full min-h-[600px] relative overflow-hidden"
      onClick={handleCanvasClick}
    >
      {/* Render connections first so they appear behind processes */}
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
      
      {/* Render processes */}
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

      {/* Instruction overlay when canvas is empty */}
      {processes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="mb-2">Click anywhere to add a process</p>
            <p>Then create IPC connections between processes</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessCanvas;
