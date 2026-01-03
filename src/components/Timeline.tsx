import React from "react";
import type {
    TimelineClip,
    TextOverlay
} from "../interfaces/interfaces";
import { TimelineItem } from "./TimelineItem";
import "../App.css";
import TitleIcon from '@mui/icons-material/Title';
import MovieIcon from '@mui/icons-material/Movie';

interface TimelineProps {
    playheadSec: number;
    pixelsPerSecond: number;
    setPixelsPerSecond: (val: number) => void;
    timelineClips: TimelineClip[];
    textOverlays: TextOverlay[];

    onAddText: () => void;
    handleDragStart: (e: React.MouseEvent, clipId: string, type: "left" | "right") => void;
    handleTextDragStart: (e: React.MouseEvent, id: string) => void;
    handleDelete: (id: string) => void;
    handleMouseDown: (e: React.MouseEvent) => void;
    onSelect: (id: string) => void;
    selectedId: string | null;
}

export const Timeline: React.FC<TimelineProps> = ({
    playheadSec,
    pixelsPerSecond,
    setPixelsPerSecond,
    timelineClips,
    textOverlays,
    onAddText,
    handleDragStart,
    handleTextDragStart,
    handleDelete,
    handleMouseDown,
    onSelect,
    selectedId,
}) => {
    return (
        <footer className="timeline-section">
            <div className="timeline-toolbar">
                <div className="toolbar-group">
                    <button className="icon-btn" onClick={onAddText} title="Add Text Overlay">
                        <TitleIcon fontSize="small" />
                        <span>Add Text</span>
                    </button>
                </div>

                <div className="toolbar-group">
                    <span style={{ fontSize: 10, textTransform: 'uppercase' }}>Zoom</span>
                    <input
                        type="range" min="5" max="100"
                        value={pixelsPerSecond}
                        onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
                        className="zoom-slider"
                    />
                </div>
            </div>

            <div className="timeline-canvas">
                <div className="timeline-track-container" style={{ width: "5000px" }} onMouseDown={handleMouseDown}>
                    <div className="time-ruler">
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div key={i} className="ruler-tick" style={{ left: `${i * 10 * pixelsPerSecond}px` }}>
                                {i * 10}s
                            </div>
                        ))}
                    </div>

                    <div className="timeline-multi-track">
                        <div className="track-row text-track">
                            <div className="track-label"><TitleIcon fontSize="inherit" /></div>
                            {textOverlays.map(text => (
                                <div
                                    key={text.id}
                                    className={`track-item text-item ${selectedId === text.id ? 'selected' : ''}`}
                                    style={{
                                        left: text.startTime * pixelsPerSecond,
                                        width: text.duration * pixelsPerSecond,
                                        cursor: 'grab'
                                    }}
                                    onMouseDown={(e) => { e.stopPropagation(); handleTextDragStart(e, text.id); onSelect(text.id); }}
                                >
                                    {text.text}
                                </div>
                            ))}
                        </div>
                        <div className="track-row video-track main-track">
                            <div className="track-label"><MovieIcon fontSize="inherit" /></div>
                            {timelineClips.map((clip) => (
                                <TimelineItem
                                    key={clip.instanceId}
                                    clip={clip}
                                    pixelsPerSecond={pixelsPerSecond}
                                    onDragStart={handleDragStart}
                                    onDelete={handleDelete}
                                    onSelect={onSelect}
                                    isSelected={selectedId === clip.instanceId}
                                />
                            ))}
                        </div>
                        <div
                            className="playhead-marker"
                            style={{ left: `${playheadSec * pixelsPerSecond}px` }}
                        >
                            <div className="playhead-head" />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};
