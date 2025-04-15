import React from "react";
import { Connection, Position, DataTransfer } from "@/lib/types";

interface IPCConnectionProps {
  connection: Connection;
  fromPosition: Position;
  toPosition: Position;
  dataTransfers: DataTransfer[];
}

const IPCConnection: React.FC<IPCConnectionProps> = ({
  connection,
  fromPosition,
  toPosition,
  dataTransfers,
}) => {
  // Calculate connection line coordinates
  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const angle = Math.atan2(dy, dx);

  const length = Math.sqrt(dx * dx + dy * dy);

  // Calculate midpoint for label
  const midX = (fromPosition.x + toPosition.x) / 2;
  const midY = (fromPosition.y + toPosition.y) / 2;

  // Define arrow points
  const arrowLength = 10;
  const arrowWidth = 6;

  const arrowX = toPosition.x - arrowLength * Math.cos(angle);
  const arrowY = toPosition.y - arrowLength * Math.sin(angle);

  const arrowPoint1X = arrowX - arrowWidth * Math.cos(angle - Math.PI / 2);
  const arrowPoint1Y = arrowY - arrowWidth * Math.sin(angle - Math.PI / 2);

  const arrowPoint2X = arrowX + arrowWidth * Math.cos(angle - Math.PI / 2);
  const arrowPoint2Y = arrowY + arrowWidth * Math.sin(angle - Math.PI / 2);

  return (
    <>
      {/* Connection line */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <line
          x1={fromPosition.x}
          y1={fromPosition.y}
          x2={toPosition.x}
          y2={toPosition.y}
          className={`ipc-connection ipc-${connection.type} ${
            connection.state === "active" ? "flowing" : ""
          } ${connection.state === "deadlocked" ? "deadlock-connection" : ""}`}
        />

        {/* Arrow for one-way connections (only for queues, pipes are bi-directional) */}
        {connection.type === "queue" && (
          <polygon
            points={`${toPosition.x},${toPosition.y} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
            className={`fill-queue stroke-none`}
          />
        )}

        {/* Data transfer animations */}
        {dataTransfers.map((transfer) => {
          const progress = transfer.progress / 100;
          const posX =
            transfer.type === "produce"
              ? fromPosition.x + (toPosition.x - fromPosition.x) * progress
              : toPosition.x + (fromPosition.x - toPosition.x) * progress;
          const posY =
            transfer.type === "produce"
              ? fromPosition.y + (toPosition.y - fromPosition.y) * progress
              : toPosition.y + (fromPosition.y - fromPosition.y) * progress;

          return (
            <circle
              key={transfer.id}
              cx={posX}
              cy={posY}
              r={3 + transfer.size}
              className={`data-particle ${
                transfer.type === "consume" ? "data-consume" : ""
              }`}
            />
          );
        })}

        {/* Connection type label */}
        <text
          x={midX}
          y={midY - 10}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          {connection.type}
        </text>

        {/* Queue capacity indicator if applicable */}
        {connection.type === "queue" && connection.capacity && (
          <text
            x={midX}
            y={midY + 10}
            textAnchor="middle"
            className={`text-xs ${
              connection.currentLoad &&
              connection.currentLoad > connection.capacity * 0.8
                ? "fill-amber-500"
                : "fill-muted-foreground"
            }`}
          >
            {connection.currentLoad || 0}/{connection.capacity}
          </text>
        )}

        {/* Memory region semaphore indicator */}
        {connection.type === "memory" && connection.memoryRegion && (
          <text
            x={midX}
            y={midY + 10}
            textAnchor="middle"
            className={`text-xs ${
              connection.memoryRegion.semaphore.hasWriter
                ? "fill-amber-500"
                : connection.memoryRegion.semaphore.currentReaders >=
                  connection.memoryRegion.semaphore.maxReaders
                ? "fill-amber-500"
                : "fill-muted-foreground"
            }`}
          >
            R:{connection.memoryRegion.semaphore.currentReaders}/
            {connection.memoryRegion.semaphore.maxReaders}
            {connection.memoryRegion.semaphore.hasWriter ? " W:1" : " W:0"}
          </text>
        )}
      </svg>
    </>
  );
};

export default IPCConnection;
