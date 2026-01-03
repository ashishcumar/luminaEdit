import type {
    TimelineClip,
    TextOverlay
} from "../interfaces/interfaces";
import "../App.css";
import TuneIcon from '@mui/icons-material/Tune';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import TextFormatIcon from '@mui/icons-material/TextFormat';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DeleteIcon from '@mui/icons-material/Delete';
import PaletteIcon from '@mui/icons-material/Palette';

interface Props {
    selectedItem: TimelineClip | TextOverlay | null;
    updateItem: (id: string, changes: any, type: 'video' | 'text') => void;
    onDelete: (id: string) => void;
}

export const PropertiesPanel = ({ selectedItem, updateItem, onDelete }: Props) => {
    if (!selectedItem) {
        return (
            <aside className="properties-panel empty">
                <div className="empty-state">
                    <TuneIcon style={{ fontSize: 40, opacity: 0.2 }} />
                    <p>Select an item to edit its properties</p>
                </div>
            </aside>
        );
    }

    const isVideo = 'visualSettings' in selectedItem;
    const isText = 'text' in selectedItem;

    return (
        <aside className="properties-panel">
            <div className="panel-header">
                <TuneIcon fontSize="small" />
                <span>{(selectedItem as any).name || (selectedItem as any).text || "Properties"}</span>
                <button
                    className="icon-btn delete-btn"
                    onClick={() => onDelete(isVideo ? (selectedItem as TimelineClip).instanceId : (selectedItem as TextOverlay).id)}
                    title="Delete Item"
                    style={{ marginLeft: 'auto', color: 'var(--accent-danger)' }}
                >
                    <DeleteIcon fontSize="small" />
                </button>
            </div>

            <div className="properties-content">
                {isText && (
                    <section className="prop-section">
                        <header><TextFormatIcon fontSize="inherit" /> Text Settings</header>
                        <div className="control-group">
                            <label>Content</label>
                            <input
                                type="text" className="prop-input"
                                value={(selectedItem as TextOverlay).text}
                                onChange={(e) => updateItem(selectedItem.id, { text: e.target.value }, 'text')}
                            />
                        </div>

                        <div className="filter-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: '12px' }}>
                            <div className="control-group">
                                <label>Font Size</label>
                                <input
                                    type="range" min="10" max="200"
                                    value={(selectedItem as TextOverlay).fontSize}
                                    onChange={(e) => updateItem(selectedItem.id, { fontSize: Number(e.target.value) }, 'text')}
                                />
                            </div>
                            <div className="control-group">
                                <label>Weight</label>
                                <select
                                    className="prop-select"
                                    value={(selectedItem as TextOverlay).fontWeight}
                                    onChange={(e) => updateItem(selectedItem.id, { fontWeight: e.target.value }, 'text')}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="bold">Bold</option>
                                    <option value="900">Black</option>
                                </select>
                            </div>
                        </div>

                        <div className="control-group">
                            <label>Font Family</label>
                            <select
                                className="prop-select"
                                value={(selectedItem as TextOverlay).fontFamily}
                                onChange={(e) => updateItem(selectedItem.id, { fontFamily: e.target.value }, 'text')}
                            >
                                <option value="'Inter', sans-serif">Inter (Modern)</option>
                                <option value="'Playfair Display', serif">Playfair (Elegant)</option>
                                <option value="'Roboto Mono', monospace">Roboto Mono (Tech)</option>
                                <option value="'Pacifico', cursive">Pacifico (Script)</option>
                                <option value="'Bebas Neue', sans-serif">Bebas Neue (Impact)</option>
                            </select>
                        </div>

                        <header style={{ marginTop: '20px' }}><PaletteIcon fontSize="inherit" /> Appearance</header>
                        <div className="control-group">
                            <label>Text Color</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={(selectedItem as TextOverlay).color}
                                    onChange={(e) => updateItem(selectedItem.id, { color: e.target.value }, 'text')}
                                    style={{ width: '40px', height: '30px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '12px', opacity: 0.7 }}>{(selectedItem as TextOverlay).color}</span>
                            </div>
                        </div>

                        <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                checked={(selectedItem as TextOverlay).shadow}
                                onChange={(e) => updateItem(selectedItem.id, { shadow: e.target.checked }, 'text')}
                                id="shadow-check"
                            />
                            <label htmlFor="shadow-check" style={{ marginBottom: 0 }}>Drop Shadow</label>
                        </div>

                        <header style={{ marginTop: '20px' }}><AccessTimeIcon fontSize="inherit" /> Timing</header>
                        <div className="control-group">
                            <label>Duration: {(selectedItem as TextOverlay).duration}s</label>
                            <input
                                type="range" min="0.5" max="20" step="0.5"
                                value={(selectedItem as TextOverlay).duration}
                                onChange={(e) => updateItem(selectedItem.id, { duration: Number(e.target.value) }, 'text')}
                            />
                        </div>

                        <header style={{ marginTop: '20px' }}>Screen Position</header>
                        <div className="control-group">
                            <label>X Position ({(selectedItem as TextOverlay).x}%)</label>
                            <input
                                type="range" min="0" max="100"
                                value={(selectedItem as TextOverlay).x}
                                onChange={(e) => updateItem(selectedItem.id, { x: Number(e.target.value) }, 'text')}
                            />
                        </div>
                        <div className="control-group">
                            <label>Y Position ({(selectedItem as TextOverlay).y}%)</label>
                            <input
                                type="range" min="0" max="100"
                                value={(selectedItem as TextOverlay).y}
                                onChange={(e) => updateItem(selectedItem.id, { y: Number(e.target.value) }, 'text')}
                            />
                        </div>
                    </section>
                )}

                {isVideo && (
                    <>
                        <section className="prop-section">
                            <header>
                                <ColorLensIcon fontSize="inherit" />
                                Color Filters
                            </header>
                            <div className="filter-grid">
                                {['none', 'grayscale', 'sepia', 'vintage', 'vibrant'].map(f => (
                                    <button
                                        key={f}
                                        className={`filter-btn ${(selectedItem as TimelineClip).filter === f ? 'active' : ''}`}
                                        onClick={() => updateItem((selectedItem as TimelineClip).instanceId, { filter: f as any }, 'video')}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="prop-section">
                            <header>Manual Adjustments</header>
                            {(['brightness', 'contrast', 'saturation'] as const).map(key => (
                                <div className="control-group" key={key}>
                                    <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                                    <input
                                        type="range"
                                        min={key === 'brightness' ? -0.5 : 0}
                                        max={key === 'brightness' ? 0.5 : 3}
                                        step="0.05"
                                        value={(selectedItem as TimelineClip).visualSettings[key]}
                                        onChange={(e) => updateItem(
                                            (selectedItem as TimelineClip).instanceId,
                                            { visualSettings: { ...(selectedItem as TimelineClip).visualSettings, [key]: parseFloat(e.target.value) } },
                                            'video'
                                        )}
                                    />
                                </div>
                            ))}
                        </section>

                        <section className="prop-section">
                            <header>
                                <VolumeUpIcon fontSize="inherit" />
                                Audio
                            </header>
                            <div className="control-group">
                                <label>Volume</label>
                                <input
                                    type="range" min="0" max="2" step="0.1"
                                    value={(selectedItem as TimelineClip).volume}
                                    onChange={(e) => updateItem((selectedItem as TimelineClip).instanceId, { volume: parseFloat(e.target.value) }, 'video')}
                                />
                                <span>{((selectedItem as TimelineClip).volume * 100).toFixed(0)}%</span>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </aside>
    );
};
