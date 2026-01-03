import { type RefObject, useRef, useState } from "react";
import type { AssetMetadata, TimelineClip, TextOverlay } from "../interfaces/interfaces";
import "../App.css";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

interface PreviewPanelProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    playheadSec: number;
    timelineClips: TimelineClip[];
    textOverlays: TextOverlay[];
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
    loaded: boolean;
    compareClip: AssetMetadata | null;
    onCloseCompare: () => void;
    onCaptureFrame: (fileName: string, time: number, quality: number) => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
    videoRef,
    playheadSec,
    timelineClips,
    textOverlays,
    isPlaying,
    setIsPlaying,
    loaded,
    compareClip,
    onCloseCompare,
    onCaptureFrame
}) => {
    const refPlayerRef = useRef<HTMLVideoElement>(null);
    const [isRefPlaying, setIsRefPlaying] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);

    const currentClip = timelineClips.find(c =>
        playheadSec >= c.timelineStart && playheadSec < (c.timelineStart + c.duration)
    );

    let cssFilter = "";
    if (currentClip) {
        const { brightness, contrast, saturation } = currentClip.visualSettings;
        const bValue = 100 + (brightness * 100);
        const cValue = contrast * 100;
        const sValue = saturation * 100;

        cssFilter = `brightness(${bValue}%) contrast(${cValue}%) saturate(${sValue}%)`;

        if (currentClip.filter === 'grayscale') cssFilter += " grayscale(100%)";
        if (currentClip.filter === 'sepia') cssFilter += " sepia(100%)";
        if (currentClip.filter === 'vintage') cssFilter += " sepia(50%) hue-rotate(-30deg) contrast(110%)";
        if (currentClip.filter === 'vibrant') cssFilter += " saturate(150%) brightness(110%)";
    }

    const activeTexts = textOverlays.filter(t =>
        playheadSec >= t.startTime && playheadSec < (t.startTime + t.duration)
    );
    const toggleRefPlay = () => {
        if (!refPlayerRef.current) return;
        if (refPlayerRef.current.paused) {
            refPlayerRef.current.play();
            setIsRefPlaying(true);
        } else {
            refPlayerRef.current.pause();
            setIsRefPlaying(false);
        }
    };

    const handleCapture = (quality: number) => {
        if (!currentClip) return;
        onCaptureFrame(currentClip.name, playheadSec - currentClip.timelineStart + currentClip.offset, quality);
        setShowQualityMenu(false);
    };

    return (
        <section className="preview-panel">
            <div className={`preview-container ${compareClip ? 'split-view' : ''}`}>
                <div className="video-player-wrapper">
                    <span className="player-label">Timeline Output</span>
                    <video
                        ref={videoRef}
                        className="main-preview"
                        controls={false}
                        muted={false}
                        onClick={() => setIsPlaying(!isPlaying)}
                        style={{ cursor: 'pointer', filter: cssFilter }}
                    />
                    <div className="text-overlays-layer" style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
                        {activeTexts.map(t => (
                            <div key={t.id} style={{
                                position: 'absolute',
                                left: `${t.x}%`,
                                top: `${t.y}%`,
                                color: t.color,
                                fontSize: `${t.fontSize}px`,
                                fontFamily: t.fontFamily,
                                fontWeight: t.fontWeight,
                                fontStyle: t.fontStyle,
                                transform: 'translate(-50%, -50%)',
                                textShadow: t.shadow ? '2px 2px 4px rgba(0,0,0,0.6)' : 'none',
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none'
                            }}>
                                {t.text}
                            </div>
                        ))}
                    </div>
                    <div className="time-code">
                        {playheadSec.toFixed(2)}s
                    </div>
                    {timelineClips.length > 0 && (
                        <div className="preview-controls-bar">
                            <button
                                className="overlay-play-btn"
                                onClick={() => setIsPlaying(!isPlaying)}
                                disabled={!loaded}
                                title={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                            </button>

                            <div className="capture-control-wrapper" style={{ position: 'relative' }}>
                                <button
                                    className="overlay-play-btn"
                                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                                    disabled={!currentClip}
                                    title="Capture Frame"
                                    style={{ background: 'var(--bg-element)' }}
                                >
                                    <CameraAltIcon />
                                </button>

                                {showQualityMenu && (
                                    <div className="quality-menu" style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        right: 0,
                                        background: 'var(--bg-panel)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '4px',
                                        marginBottom: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                        zIndex: 100
                                    }}>
                                        <button className="menu-item" onClick={() => handleCapture(1)} style={{ padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap', width: '100%', justifyContent: 'flex-start' }}>Highest (100%)</button>
                                        <button className="menu-item" onClick={() => handleCapture(5)} style={{ padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap', width: '100%', justifyContent: 'flex-start' }}>High (90%)</button>
                                        <button className="menu-item" onClick={() => handleCapture(15)} style={{ padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap', width: '100%', justifyContent: 'flex-start' }}>Medium (70%)</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {compareClip && (
                    <div className="video-player-wrapper">
                        <span className="player-label" style={{ background: '#2563eb' }}>
                            Reference: {compareClip.name}
                        </span>

                        <video
                            ref={refPlayerRef}
                            src={compareClip.objectUrl}
                            className="main-preview"
                            controls={false}
                            muted={true}
                            onClick={toggleRefPlay}
                            style={{ cursor: 'pointer' }}
                        />
                        <button
                            className="icon-btn"
                            style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', borderRadius: '50%' }}
                            onClick={onCloseCompare}
                        >
                            <CloseIcon fontSize="small" style={{ color: 'white' }} />
                        </button>
                        <div className="preview-controls-bar">
                            <button
                                className="overlay-play-btn"
                                onClick={toggleRefPlay}
                            >
                                {isRefPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
