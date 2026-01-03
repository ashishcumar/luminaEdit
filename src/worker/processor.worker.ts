import { FFmpeg } from "@ffmpeg/ffmpeg";
const ffmpegRef = new FFmpeg();
const baseURL = `${self.location.origin}/ffmpeg`;
const lastMetadata = { duration: 0, width: 0, height: 0 };

const LoadFFmpeg = async () => {
  try {
    ffmpegRef.on("log", ({ message }) => {
      const durationMatch = message.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (durationMatch) {
        const hours = parseFloat(durationMatch[1]);
        const minutes = parseFloat(durationMatch[2]);
        const seconds = parseFloat(durationMatch[3]);
        lastMetadata.duration = hours * 3600 + minutes * 60 + seconds;
      }

      const resMatch = message.match(/ (\d+)x(\d+)[, ]/);
      if (resMatch && !message.includes("Stream #")) {
        lastMetadata.width = parseInt(resMatch[1]);
        lastMetadata.height = parseInt(resMatch[2]);
      }
    });

    ffmpegRef.on("progress", ({ progress }) => {
      self.postMessage({ type: "PROGRESS", payload: { progress: Math.round(progress * 100) } });
    });

    await ffmpegRef.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });
    self.postMessage({ type: "LOAD_COMPLETED" });
  } catch (e) {
    self.postMessage({ type: "ERROR", error: e instanceof Error ? e.message : String(e) });
  }
}

const PrepareFile = async (name: string, id: string) => {
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(name);
    const file = await fileHandle.getFile();

    let arrayBuffer: ArrayBuffer | null = await file.arrayBuffer();
    if (arrayBuffer.byteLength === 0 && file.size > 0) {
      console.warn(`File ${name} is empty in OPFS despite original size ${file.size}. This is usually due to a storage quota error during Save.`);
    }
    console.log(`Writing ${name} to VFS (${arrayBuffer.byteLength} bytes) from OPFS`);
    await ffmpegRef.writeFile(name, new Uint8Array(arrayBuffer));
    arrayBuffer = null;
    await ffmpegRef.exec([
      "-analyzeduration",
      "100000",
      "-probesize",
      "100000",
      "-i",
      name,
    ]);

    console.log(`File ${name} is now in VFS`);

    self.postMessage({
      type: "FILE_READY",
      payload: { name: name, id, metaData: lastMetadata },
    });
  } catch (e) {
    self.postMessage({ type: "ERROR", payload: e instanceof Error ? e.message : String(e) });
  }
}

const GetThumbnail = async (id: string, fileName: string) => {
  try {
    const outputName = `thumb_${Date.now()}.jpg`;

    const result = await ffmpegRef.exec([
      "-ss",
      "00:00:01",
      "-i",
      fileName,
      "-frames:v",
      "1",
      "-y",
      outputName,
    ]);

    if (result !== 0) throw new Error("Thumbnail capture failed");

    const data = await ffmpegRef.readFile(outputName);
    const uint8Data = data as Uint8Array;
    const nonSharedBuffer = new Uint8Array(uint8Data).slice().buffer;
    const blob = new Blob([nonSharedBuffer], { type: "image/jpeg" });

    self.postMessage({
      type: "THUMBNAIL_READY",
      payload: { blob, fileName, id },
    });

    await ffmpegRef.deleteFile(outputName);
  } catch (e) {
    self.postMessage({ type: "ERROR", payload: e instanceof Error ? e.message : String(e) });
  }
}

const GetFrame = async (fileName: string, time: number, quality: number = 2) => {
  try {
    const outputName = `snapshot_${Date.now()}.jpg`;

    self.postMessage({ type: "PROGRESS", payload: { progress: 10 } });

    const result = await ffmpegRef.exec([
      "-ss",
      time.toString(),
      "-i",
      fileName,
      "-frames:v",
      "1",
      "-q:v",
      quality.toString(),
      "-threads", "1",
      "-y",
      outputName,
    ]);

    if (result !== 0) throw new Error("Frame capture failed. Video might be too large for browser memory.");

    console.log("getting frame done")
    const data = await ffmpegRef.readFile(outputName);
    const uint8Data = data as Uint8Array;
    console.log("frame read")
    const nonSharedBuffer = new Uint8Array(uint8Data).slice().buffer;
    console.log("buffer created")
    const blob = new Blob([nonSharedBuffer], { type: "image/jpeg" });
    console.log("blob created")

    self.postMessage({
      type: "FRAME_READY",
      payload: { blob, fileName, time },
    });

    await ffmpegRef.deleteFile(outputName);
  } catch (e) {
    self.postMessage({ type: "ERROR", payload: e instanceof Error ? e.message : String(e) });
  }
}

const ExportTimeline = async (clips: (Record<string, unknown> & {
  offset: number;
  duration: number;
  fileName: string;
  filter: string;
  visualSettings: { brightness: number, contrast: number, saturation: number };
  volume: number;
  transition: string;
})[], textOverlays: (Record<string, unknown> & {
  shadow?: boolean;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  startTime: number;
  duration: number;
})[] = []) => {
  try {
    const outputName = "output.mp4"
    const mergeName = "merged.mp4"
    const trimFilenames: string[] = [];

    for (let i = 0; i < clips?.length; i++) {
      const clip = clips[i];
      const trimName = `trim_${i}.mp4`;

      const filters = ["scale=1280:720"];
      if (clip.filter === 'grayscale') filters.push("hue=s=0");
      if (clip.filter === 'sepia') filters.push("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131");
      if (clip.filter === 'vintage') filters.push("curves=vintage");
      if (clip.filter === 'vibrant') filters.push("eq=saturation=1.3");

      const { brightness, contrast, saturation } = clip.visualSettings;
      filters.push(`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`);

      if (clip.transition === 'fade') {
        filters.push("fade=in:st=0:d=1");
      }

      const result = await ffmpegRef.exec([
        "-ss", clip.offset.toString(),
        "-t", clip.duration.toString(),
        "-i", clip.fileName,
        "-vf", filters.join(","),
        "-af", `volume=${clip.volume}`,
        "-c:v", "libx264",
        "-crf", "32",
        "-preset", "veryfast",
        "-threads", "1",
        "-c:a", "aac",
        "-b:a", "128k",
        trimName
      ])
      if (result !== 0) throw new Error(`Export failed on clip ${i}`);
      trimFilenames.push(trimName);
    }

    const fileList = trimFilenames?.map((trimName) => `file '${trimName}'`).join('\n');
    console.log("File list", fileList)
    await ffmpegRef.writeFile('concat_list.txt', fileList);
    console.log("File list written")

    const concatResult = await ffmpegRef.exec(['-f', 'concat', '-safe', '0', '-i', 'concat_list.txt', '-c', 'copy', mergeName]);
    if (concatResult !== 0) throw new Error("Concatenate failed");
    console.log("Concatenation done")

    if (textOverlays && textOverlays.length > 0) {
      const drawtextFilters = textOverlays.map(text => {
        const shadowOptions = text.shadow ? ":shadowcolor=black@0.6:shadowx=3:shadowy=3" : "";
        return `drawtext=text='${text.text}':x=(w*${text.x / 100}-tw/2):y=(h*${text.y / 100}-th/2):fontsize=${text.fontSize}:fontcolor=${text.color}${shadowOptions}:enable='between(t,${text.startTime},${text.startTime + text.duration})'`;
      }).join(",");

      const textResult = await ffmpegRef.exec([
        "-i", mergeName,
        "-vf", drawtextFilters,
        "-c:v", "libx264",
        "-crf", "32",
        "-preset", "veryfast",
        "-threads", "1",
        "-c:a", "copy",
        outputName
      ]);
      if (textResult !== 0) throw new Error("Text overlay export failed");
    } else {
      const copyResult = await ffmpegRef.exec(["-i", mergeName, "-c", "copy", outputName]);
      if (copyResult !== 0) throw new Error("Final copy failed");
    }

    const data = await ffmpegRef?.readFile(outputName);
    const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });
    console.log("Exported video data", blob)
    self.postMessage({ type: "EXPORT_READY", payload: { blob } });
    for (const file of [...trimFilenames, mergeName, outputName, 'concat_list.txt']) {
      try { await ffmpegRef.deleteFile(file); } catch { /* ignore error */ }
    }
  } catch (e) {
    self.postMessage({ type: "ERROR", payload: e instanceof Error ? e.message : String(e) });
  }
}

const CompressFile = async (id: string, fileName: string) => {
  try {
    const outputName = `compressed_${Date.now()}.mp4`;
    const result = await ffmpegRef.exec([
      "-i", fileName,
      "-vcodec", "libx264",
      "-crf", "32",
      "-preset", "veryfast",
      "-vf", "scale='min(1280,iw)':-2",
      "-acodec", "aac",
      "-b:a", "128k",
      "-threads", "1",
      outputName
    ]);
    if (result !== 0) throw new Error("Compression failed");

    const data = await ffmpegRef.readFile(outputName);
    const uint8Data = data as Uint8Array;
    const blob = new Blob([new Uint8Array(uint8Data)], { type: "video/mp4" });

    self.postMessage({
      type: "COMPRESSION_READY",
      payload: { blob, originalId: id, name: `compressed_${fileName}` },
    });

    await ffmpegRef.deleteFile(outputName);
  } catch (e) {
    self.postMessage({ type: "ERROR", payload: e instanceof Error ? e.message : String(e) });
  }
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;
  if (type === "LOAD") {
    LoadFFmpeg();
  } else if (type === "PREPARE_FILE") {
    const { name, id } = payload;
    PrepareFile(name, id);
  } else if (type === "GET_THUMBNAIL") {
    const { fileName, id } = payload;
    GetThumbnail(id, fileName)
  } else if (type === "EXPORT_TIMELINE") {
    const { clips, textOverlays } = payload;
    ExportTimeline(clips, textOverlays);
  } else if (type === "COMPRESS_FILE") {
    const { id, fileName } = payload;
    CompressFile(id, fileName);
  } else if (type === "GET_FRAME") {
    const { fileName, time, quality } = payload;
    GetFrame(fileName, time, quality);
  } else if (type === "UNLOAD_FILE") {
    const { fileName } = payload;
    try { await ffmpegRef.deleteFile(fileName); } catch { /* ignore */ }
  } else if (type === "CLEAR_ALL") {
    try {
      const files = await ffmpegRef.listDir('/');
      for (const file of files) {
        if (!file.isDir) {
          try { await ffmpegRef.deleteFile(file.name); } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error("Clear all failed", e);
    }
  }
};
