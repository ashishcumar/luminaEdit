import React from "react";
import type { AssetMetadata } from "../interfaces/interfaces";
import "../App.css";
;
import CompressIcon from '@mui/icons-material/Compress';
import AddIcon from '@mui/icons-material/Add';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface MediaPanelProps {
    assets: AssetMetadata[];
    addToTimeline: (asset: AssetMetadata) => void;
    onCompare: (asset: AssetMetadata) => void;
    onCompress: (asset: AssetMetadata) => void;
    onDeleteAsset: (id: string) => void;
}

const formatSize = (bytes?: number) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
};

export const MediaPanel: React.FC<MediaPanelProps> = ({ assets, addToTimeline, onCompare, onCompress, onDeleteAsset }) => {
    return (
        <section className="media-panel">
            <div className="panel-header">
                <span>Total Assets ({assets.length})</span>
            </div>
            <div className="assets-list">
                {assets.map((asset) => {
                    const isLarge = (asset.size || 0) > 50 * 1024 * 1024; // > 50MB
                    const isHuge = (asset.size || 0) > 800 * 1024 * 1024; // > 800MB
                    return (
                        <div key={asset.id} className={`asset-card ${isHuge ? 'critical-size' : ''}`}>
                            {isHuge ? (
                                <div className="asset-badge critical">Storage Warning</div>
                            ) : isLarge ? (
                                <div className="asset-badge">Heavy File</div>
                            ) : null}
                            <div className="asset-thumb">
                                {asset.thumbnail ? (
                                    <img src={asset.thumbnail} alt={asset.name} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: '#111' }} />
                                )}
                                <div className="asset-actions">
                                    <button
                                        className="mini-btn delete-asset"
                                        title="Delete Asset"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("Delete this asset and all its timeline clips?")) {
                                                onDeleteAsset(asset.id);
                                            }
                                        }}
                                    >
                                        <DeleteOutlineIcon style={{ fontSize: 14 }} />
                                    </button>
                                    <button
                                        className="mini-btn"
                                        title="Compare / Preview"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCompare(asset);
                                        }}
                                    >
                                        <CompareArrowsIcon style={{ fontSize: 14 }} />
                                    </button>
                                    <button
                                        className="mini-btn"
                                        title="Add to Timeline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addToTimeline(asset);
                                        }}
                                    >
                                        <AddIcon style={{ fontSize: 16 }} />
                                    </button>
                                </div>
                            </div>
                            <div className="asset-info">
                                <div className="asset-name" title={asset.name}>{asset.name}</div>
                                <div className="asset-meta-row">
                                    <span className="asset-duration">{asset.duration.toFixed(1)}s</span>
                                    <span className="asset-size">{formatSize(asset.size)}</span>
                                </div>
                                <button
                                    className={`compress-action-btn ${isLarge ? 'highlight' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); onCompress(asset); }}
                                >
                                    <CompressIcon fontSize="inherit" />
                                    <span>Compress & Optimize</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
