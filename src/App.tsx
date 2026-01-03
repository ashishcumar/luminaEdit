import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { db } from "./database/db";
import type {
  AssetMetadata,
  TimelineClip,
  TextOverlay
} from "./interfaces/interfaces";
import { Header } from "./components/Header";
import { MediaPanel } from "./components/MediaPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { Timeline } from "./components/Timeline";
import { PropertiesPanel } from "./components/PropertiesPanel";

function App() {
  const [loaded, setLoaded] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [processingProgress, setProcessingProgress] = useState(0);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(30);
  const [compareClip, setCompareClip] = useState<AssetMetadata | null>(null);

  const [draggingHandle, setDraggingHandle] = useState<{
    clipId: string,
    type: 'left' | 'right',
    initialX: number,
    initialOffset: number,
    initialDuration: number
  } | null>(null);

  const [draggingText, setDraggingText] = useState<{
    id: string,
    initialX: number,
    initialStartTime: number
  } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isScrubbing = useRef(false);

  const [modal, setModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'confirm';
    onConfirm?: () => void;
  }>({ show: false, title: "", message: "", type: 'info' });

  const showModal = useCallback((title: string, message: string, type: 'info' | 'warning' | 'error' | 'confirm' = 'info', onConfirm?: () => void) => {
    setModal({ show: true, title, message, type, onConfirm });
  }, []);

  const handleReset = async () => {
    setIsPlaying(false);
    setPlayheadSec(0);
    try {
      await db.delete();
      await db.open();
    } catch (e) { console.error("DB Reset failed", e); }

    setAssets([]);
    setTimelineClips([]);
    setTextOverlays([]);
    setSelectedItemId(null);
    setCompareClip(null);
    assets.forEach(a => { if (a.objectUrl) URL.revokeObjectURL(a.objectUrl) });
  };


  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 250 * 1024 * 1024) {
      showModal(
        "Optimization Recommended",
        `This file is ${(file.size / (1024 * 1024)).toFixed(0)}MB. Most browsers have a stable handling limit of ~250MB for video assets.\n\nWe strongly recommend optimizing this file immediately after import to prevent tab crashes.`,
        'warning',
        () => proceedWithImport(file)
      );
      return;
    }

    proceedWithImport(file);
  };

  const proceedWithImport = async (file: File) => {
    setIsProcessing(true);
    const id = crypto.randomUUID();
    const objectUrl = URL.createObjectURL(file);

    try {
      await db.assets.add({ id, name: file.name || "Untitled", data: file });
      workerRef.current?.postMessage({ type: "PREPARE_FILE", payload: { id } });

      const newAsset: AssetMetadata = {
        id,
        name: file.name,
        duration: 0,
        size: file.size,
        thumbnail: "",
        objectUrl,
        type: 'video'
      };

      setAssets(prev => [...prev, newAsset]);

      if (file.size > 100 * 1024 * 1024) {
        showModal(
          "Suggested: Optimize Asset",
          "This file is quite large. Would you like to compress and optimize it now for a smoother editing experience?",
          'confirm',
          () => handleCompress(newAsset)
        );
      }

    } catch (err) {
      console.error("Import failed:", err);
      URL.revokeObjectURL(objectUrl);

      const error = err as { name?: string; inner?: { name?: string } };
      if (error.name === 'QuotaExceededError' || (error.inner && error.inner.name === 'QuotaExceededError')) {
        showModal(
          "Storage Limit Reached",
          "Your browser storage is full. Browsers typically allow 1-2GB total, and this file exceeds the available space. Please delete old assets or clear your cache.",
          'error'
        );
      } else {
        showModal("Import Failed", "The file exceeds the browser's handling capacity or is in an unsupported format.", 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const addToTimeline = useCallback((asset: AssetMetadata) => {
    if (asset.duration <= 0) {
      showModal("Media Not Ready", "Thumbnail and metadata are still processing. Please wait a moment.", 'info');
      return;
    }

    const newClip: TimelineClip = {
      ...asset,
      instanceId: crypto.randomUUID(),
      timelineStart:
        timelineClips.length > 0
          ? timelineClips[timelineClips.length - 1].timelineStart +
          timelineClips[timelineClips.length - 1].duration
          : 0,
      offset: 0,
      duration: asset.duration,
      originalDuration: asset.duration,
      volume: 1.0,
      transition: 'none',
      filter: 'none',
      visualSettings: { brightness: 0, contrast: 1, saturation: 1 }
    };
    setTimelineClips((prev) => [...prev, newClip]);
  }, [showModal, timelineClips]);

  const updateTime = useCallback((clientX: number) => {
    const track = document.querySelector(".timeline-track-container");
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const x = Math.max(0, clientX - rect.left);
    const clickedSec = x / pixelsPerSecond;
    setPlayheadSec(clickedSec);
  }, [pixelsPerSecond]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPlaying(false);
    isScrubbing.current = true;
    updateTime(e.clientX);
  };

  const updateItem = useCallback((id: string, changes: Record<string, unknown>, type: 'video' | 'text') => {
    if (type === 'video') {
      setTimelineClips((prev) => {
        const updated = prev.map((clip) =>
          clip.instanceId === id ? { ...clip, ...changes } : clip
        );
        let accumulatedTime = 0;
        return updated.map((clip) => {
          const newClip = { ...clip, timelineStart: accumulatedTime };
          accumulatedTime += newClip.duration;
          return newClip;
        });
      });
    } else if (type === 'text') {
      setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
    }
  }, []);

  const handleExport = useCallback(() => {
    setIsExporting(true);
    const exportData = {
      videoClips: timelineClips.map((clip) => ({
        fileName: clip.name,
        offset: clip.offset,
        duration: clip.duration,
        volume: clip.volume,
        filter: clip.filter,
        visualSettings: clip.visualSettings,
        transition: clip.transition
      })),
      textOverlays: textOverlays
    };

    workerRef?.current?.postMessage({
      type: "EXPORT_TIMELINE",
      payload: { clips: exportData.videoClips, textOverlays: exportData.textOverlays },
    });
  }, [timelineClips, textOverlays]);

  const handleDragStart = (e: React.MouseEvent, clipId: string, type: "left" | "right") => {
    e.stopPropagation();
    e.preventDefault();

    const clip = timelineClips.find((clip) => clip.instanceId === clipId);
    if (!clip) return;
    setDraggingHandle({
      clipId,
      type,
      initialX: e.clientX,
      initialOffset: clip.offset,
      initialDuration: clip.duration
    })
  }

  const handleTextDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const text = textOverlays.find(t => t.id === id);
    if (!text) return;
    setDraggingText({
      id,
      initialX: e.clientX,
      initialStartTime: text.startTime
    });
  }

  const handleCompress = useCallback((asset: AssetMetadata) => {
    setIsProcessing(true);
    workerRef.current?.postMessage({
      type: "COMPRESS_FILE",
      payload: { id: asset.id, fileName: asset.name }
    });
  }, []);

  const handleDelete = (id: string) => {
    setTimelineClips((prev) => prev.filter((c) => c.instanceId !== id));
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await db.assets.delete(assetId);
      setAssets(prev => {
        const asset = prev.find(a => a.id === assetId);
        if (asset?.objectUrl) URL.revokeObjectURL(asset.objectUrl);
        return prev.filter(a => a.id !== assetId);
      });
      setTimelineClips(prev => prev.filter(c => c.id !== assetId));
    } catch (e) {
      console.error("Delete asset failed", e);
    }
  };

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./worker/processor.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === "LOAD_COMPLETED") setLoaded(true);
      if (type === "FILE_READY") {
        const { name, id, metaData } = payload;
        setAssets(prev => prev.map(a => a.id === id ? { ...a, duration: metaData?.duration || 0 } : a));

        workerRef.current?.postMessage({
          type: "GET_THUMBNAIL",
          payload: { fileName: name },
        });
      }
      if (type === "THUMBNAIL_READY") {
        const { blob, fileName } = payload;
        const url = URL.createObjectURL(blob);
        setAssets((prev) =>
          prev.map((a) => (a.name === fileName ? { ...a, thumbnail: url } : a))
        );
      }
      if (type === "PROGRESS") {
        setProcessingProgress(payload.progress);
      }
      if (type === "EXPORT_READY") {
        const { blob } = payload;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my_video_edit.mp4";
        a.click();
        setIsExporting(false);
        setProcessingProgress(0);
      }
      if (type === "COMPRESSION_READY") {
        const { blob, name } = payload;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        setIsProcessing(false);
        setProcessingProgress(0);
        showModal("Success", "Video compressed and downloaded successfully!", 'info');
      }
    };

    workerRef.current.postMessage({ type: "LOAD" });
  }, [showModal]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing.current) {
        updateTime(e.clientX);
        return;
      }
      if (draggingHandle) {
        const { clipId, type, initialX, initialOffset, initialDuration } = draggingHandle;
        const pixelDelta = e.clientX - initialX;
        const timeDelta = pixelDelta / pixelsPerSecond;
        if (type === "right") {
          const newDuration = Math.max(0.1, initialDuration + timeDelta);
          updateItem(clipId, { duration: newDuration }, 'video');
        }
        else if (type === "left") {
          const safeTimeDelta = Math.min(timeDelta, initialDuration - 0.1);
          const newOffset = Math.max(0, initialOffset + safeTimeDelta);
          const offsetChange = newOffset - initialOffset;
          const newDuration = Math.max(0.1, initialDuration - offsetChange);

          if (Math.abs(offsetChange) > 0.001) {
            updateItem(clipId, { offset: newOffset, duration: newDuration }, 'video');
          }
        }
      }
      if (draggingText) {
        const { id, initialX, initialStartTime } = draggingText;
        const pixelDelta = e.clientX - initialX;
        const timeDelta = pixelDelta / pixelsPerSecond;
        const newStartTime = Math.max(0, initialStartTime + timeDelta);
        updateItem(id, { startTime: newStartTime }, 'text');
      }
    };
    const handleMouseUp = () => {
      isScrubbing.current = false;
      setDraggingHandle(null);
      setDraggingText(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", checkMobile);
    };
  }, [draggingHandle, draggingText, pixelsPerSecond, updateTime, updateItem]);

  useEffect(() => {
    if (!videoRef.current) return;

    const activeClip = timelineClips.find(
      (clip) =>
        playheadSec >= clip.timelineStart &&
        playheadSec < clip.timelineStart + clip.duration
    );

    if (activeClip && activeClip.objectUrl) {
      const currentSrc = videoRef.current.getAttribute("src")
      if (currentSrc !== activeClip.objectUrl) {
        videoRef.current.src = activeClip.objectUrl;
      }

      const internalTime = playheadSec - activeClip.timelineStart + activeClip.offset;

      const threshold = isPlaying ? 0.2 : 0.05;
      if (Math.abs(videoRef.current.currentTime - internalTime) > threshold) {
        videoRef.current.currentTime = internalTime;
      }

      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(e => console.log("Play interrupted", e));
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    } else {
      if (videoRef.current.src) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
      }
    }

  }, [playheadSec, timelineClips, isPlaying]);



  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      setPlayheadSec((prev) => {
        const nextTime = prev + delta;
        const totalDuration = timelineClips.reduce(
          (acc, clip) => Math.max(acc, clip.timelineStart + clip.duration),
          0
        );

        if (nextTime >= totalDuration) {
          setIsPlaying(false);
          return totalDuration; 
        }
        return nextTime;
      });
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, timelineClips]);

  const handleAddText = () => {
    const newText: TextOverlay = {
      id: crypto.randomUUID(),
      text: "New Text",
      startTime: playheadSec,
      duration: 5,
      x: 50,
      y: 50,
      fontSize: 48,
      color: "#ffffff",
      fontFamily: "Inter, sans-serif",
      fontWeight: "bold",
      fontStyle: "normal",
      shadow: true
    };
    setTextOverlays(prev => [...prev, newText]);
    setSelectedItemId(newText.id);
  };

  const selectedItem =
    timelineClips.find(c => c.instanceId === selectedItemId) ||
    textOverlays.find(t => t.id === selectedItemId) || null;

  if (isMobile) {
    return (
      <div className="mobile-warning">
        <div className="warning-card">
          <div className="warning-icon">🖥️</div>
          <h2>Desktop Only</h2>
          <p>LuminaEdit requires a high-performance desktop browser to handle video processing and FFmpeg.wasm.</p>
          <p>Please open this link on your Laptop or PC to start editing!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-editor">
      <Header
        loaded={loaded}
        isExporting={isExporting}
        isProcessing={isProcessing}
        progress={processingProgress}
        onFileChange={onFileChange}
        handleExport={handleExport}
        handleReset={handleReset}
      />

      <main className="editor-body">
        <MediaPanel
          assets={assets}
          addToTimeline={addToTimeline}
          onCompare={(asset) => setCompareClip(asset)}
          onCompress={handleCompress}
          onDeleteAsset={(id) => showModal("Confirm Delete", "Remove this asset and all its timeline instances?", "confirm", () => handleDeleteAsset(id))}
        />

        <PreviewPanel
          videoRef={videoRef}
          playheadSec={playheadSec}
          timelineClips={timelineClips}
          textOverlays={textOverlays}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          loaded={loaded}
          compareClip={compareClip}
          onCloseCompare={() => setCompareClip(null)}
        />

        <PropertiesPanel
          selectedItem={selectedItem}
          updateItem={updateItem}
          onDelete={(id) => showModal("Delete Clip", "Permanently remove this clip from the timeline?", "confirm", () => handleDelete(id))}
        />
      </main>

      <Timeline
        playheadSec={playheadSec}
        pixelsPerSecond={pixelsPerSecond}
        setPixelsPerSecond={setPixelsPerSecond}
        timelineClips={timelineClips}
        textOverlays={textOverlays}
        onAddText={handleAddText}
        handleDragStart={handleDragStart}
        handleTextDragStart={handleTextDragStart}
        handleDelete={handleDelete}
        handleMouseDown={handleMouseDown}
        onSelect={(id) => setSelectedItemId(id)}
        selectedId={selectedItemId}
      />

      {modal.show && (
        <div className="modal-overlay" onClick={() => setModal(prev => ({ ...prev, show: false }))}>
          <div className={`modal-content ${modal.type}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.title}</h3>
              <button className="close-btn" onClick={() => setModal(prev => ({ ...prev, show: false }))}>&times;</button>
            </div>
            <div className="modal-body">
              {modal.message.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(prev => ({ ...prev, show: false }))}>
                {modal.type === 'confirm' || modal.type === 'warning' ? "Cancel" : "Close"}
              </button>
              {(modal.type === 'confirm' || modal.type === 'warning') && (
                <button
                  className="btn-primary"
                  onClick={() => { modal.onConfirm?.(); setModal(prev => ({ ...prev, show: false })); }}
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

