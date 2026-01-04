import React from "react";
import type { TimelineClip } from "../interfaces/interfaces";
import "../App.css";

interface Props {
    clip: TimelineClip;
    pixelsPerSecond: number;
    onDragStart: (e: React.MouseEvent, clipId: string, type: "left" | "right") => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
    isSelected: boolean;
}

export const TimelineItem = ({ clip, pixelsPerSecond, onDragStart, onDelete, onSelect, isSelected }: Props) => {
    return (
        <div
            className={`timeline-clip-item ${isSelected ? 'selected' : ''}`}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(clip.instanceId);
            }}
            style={{
                left: `${clip.timelineStart * pixelsPerSecond + 32}px`,
                width: `${clip.duration * pixelsPerSecond}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
                e.preventDefault();
                onDelete(clip.instanceId);
            }}
            title="Right click to delete"
        >
            <div
                className="clip-drag-handle left"
                onMouseDown={(e) => onDragStart(e, clip.instanceId, "left")}
            />
            <div className="clip-thumb-preview">
                {clip.thumbnail && <img src={clip.thumbnail} />}
            </div>
            <div className="clip-meta">
                <strong>{clip.name}</strong>
                <span>{clip.duration.toFixed(2)}s</span>
            </div>
            <div
                className="clip-drag-handle right"
                onMouseDown={(e) => onDragStart(e, clip.instanceId, "right")}
            />
        </div>
    );
};