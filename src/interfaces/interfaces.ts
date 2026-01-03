export interface AssetMetadata {
  id: string;
  name: string;
  duration: number;
  thumbnail: string;
  objectUrl?: string;
  size?: number; 
  type?: 'video' | 'audio' | 'image';
}

export interface VisualSettings {
  brightness: number; 
  contrast: number;   
  saturation: number; 
}

export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  x: number;
  y: number; 
  fontSize: number;
  color: string;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  shadow: boolean;
}

export interface TimelineClip extends AssetMetadata {
  instanceId: string;
  timelineStart: number;
  duration: number;
  offset: number;
  originalDuration: number;
  filter?: 'none' | 'grayscale' | 'sepia' | 'vintage' | 'vibrant';
  volume: number;
  visualSettings: VisualSettings;
  transition: 'none' | 'fade' | 'crossfade';
}

export interface AudioTrackClip {
  instanceId: string;
  assetId: string;
  name: string;
  timelineStart: number;
  duration: number;
  offset: number;
  volume: number;
  objectUrl: string;
}

export interface OverlayTrackItem {
  instanceId: string;
  assetId: string;
  name: string;
  timelineStart: number;
  duration: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  objectUrl: string;
}
