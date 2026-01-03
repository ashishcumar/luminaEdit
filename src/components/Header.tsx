import React from "react";
import "../App.css";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

interface HeaderProps {
    loaded: boolean;
    isExporting: boolean;
    isProcessing: boolean;
    progress: number;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleExport: () => void;
    handleReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    loaded,
    isExporting,
    isProcessing,
    progress,
    onFileChange,
    handleExport,
    handleReset
}) => {
    return (
        <header className="editor-header">
            <div className="logo-area">
                <span className="logo-icon">✨</span>
                <span>LuminaEdit</span>
                <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: '8px', border: '1px solid #333', padding: '2px 6px', borderRadius: '4px' }}>
                    BETA {loaded ? "• Ready" : "• Loading..."}
                </span>
            </div>

            <div className="header-actions">
                <button
                    className="icon-btn"
                    title="Reset Project"
                    onClick={handleReset}
                >
                    <DeleteSweepIcon fontSize="small" />
                </button>

                <label className={`btn-primary ${isProcessing ? 'disabled' : ''}`} style={{ cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <UploadFileIcon fontSize="small" />
                    {isProcessing ? (progress > 0 ? `Processing ${Math.round(progress) > 1000 ? 0 : Math.round(progress)}%` : "Importing...") : "Import"}
                    <input type="file" hidden onChange={onFileChange} accept="video/*" disabled={isProcessing} />
                </label>

                <button
                    className="btn-primary"
                    onClick={handleExport}
                    disabled={!loaded || isExporting}
                    style={{ background: isExporting ? '#3f3f46' : '' }}
                >
                    <DownloadIcon fontSize="small" />
                    {isExporting ? (progress > 0 ? `Exporting ${Math.round(progress) > 1000 ? 0 : Math.round(progress)}%` : "Exporting...") : "Export"}
                </button>
            </div>
        </header>
    );
};
