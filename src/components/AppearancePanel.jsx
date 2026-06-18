import { X } from 'lucide-react';
import useChatStore from '../store/chatStore';

const ACCENT_SWATCHES = [
  { label: 'Teal (default)', ac: '#00C9A7', ach: '#1DDBB9', r: 0, g: 201, b: 167 },
  { label: 'Sapphire', ac: '#1E88E5', ach: '#42A5F5', r: 30, g: 136, b: 229 },
  { label: 'Amber', ac: '#FF8F00', ach: '#FFA726', r: 255, g: 143, b: 0 },
  { label: 'Emerald', ac: '#43A047', ach: '#66BB6A', r: 67, g: 160, b: 71 },
  { label: 'Crimson', ac: '#E53935', ach: '#EF5350', r: 229, g: 57, b: 53 },
  { label: 'Violet', ac: '#8E24AA', ach: '#AB47BC', r: 142, g: 36, b: 170 }
];

const DARK_PALETTES = [
  { id: 'bgOceanic', label: 'Oceanic (default)', vars: { bg: '#07111C', bgs: '#0B1A28', bge: '#0F2234', bgh: '#152E46', bd: '#1D3C58' } },
  { id: 'bgCharcoal', label: 'Charcoal', vars: { bg: '#111111', bgs: '#1A1A1A', bge: '#212121', bgh: '#2A2A2A', bd: '#3D3D3D' } },
  { id: 'bgMidnight', label: 'Midnight Blue', vars: { bg: '#0A0F1E', bgs: '#0F1528', bge: '#141D38', bgh: '#1A2744', bd: '#223366' } },
  { id: 'bgForest', label: 'Forest Dark', vars: { bg: '#0A160F', bgs: '#0F2016', bge: '#142B1C', bgh: '#1C3A25', bd: '#264D34' } }
];

const LIGHT_PALETTES = [
  { id: 'bgClean', label: 'Clean (default)', vars: { bg: '#F7F8FA', bgs: '#FFFFFF', bge: '#FFFFFF', bgh: '#EFEFEF', bd: '#E0E0E0' } },
  { id: 'bgWarm', label: 'Warm Paper', vars: { bg: '#FDF9F0', bgs: '#FFFDF5', bge: '#FFFDF5', bgh: '#F0EBD8', bd: '#DDD5BC' } },
  { id: 'bgPure', label: 'Pure White', vars: { bg: '#FFFFFF', bgs: '#FAFAFA', bge: '#FFFFFF', bgh: '#F0F0F0', bd: '#E8E8E8' } }
];

function AppearancePanel() {
  const {
    appearanceOpen,
    toggleAppearance,
    setTheme,
    setBgPalette,
    bgPaletteId,
    theme,
    accentColor,
    setAccentColor,
    setCustomAccentColor
  } = useChatStore();

  const handleAccentClick = (c) => {
    setAccentColor(c.ac, c.ach, c.r, c.g, c.b);
  };

  return (
    <div className={`color-panel ${appearanceOpen ? 'open' : ''}`}>
      {/* Header */}
      <div className="cp-hdr">
        <span className="cp-title">Appearance</span>
        <button onClick={toggleAppearance} className="cp-close" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {/* Accent Swatches */}
      <div className="cp-sec">
        <div className="cp-slbl">Accent Color</div>
        <div className="cp-swatches">
          {ACCENT_SWATCHES.map((c) => (
            <button
              key={c.label}
              className={`cp-sw ${c.ac === accentColor.ac ? 'active' : ''}`}
              style={{ background: c.ac }}
              onClick={() => handleAccentClick(c)}
              title={c.label}
            />
          ))}
          <div className="cp-divider"></div>
          <label title="Custom accent" style={{ cursor: 'pointer' }}>
            <input
              type="color"
              value={accentColor.ac}
              onChange={(e) => setCustomAccentColor(e.target.value)}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: '2px solid var(--bd)',
                cursor: 'pointer',
                padding: 1,
                background: 'var(--bgh)'
              }}
            />
          </label>
        </div>
      </div>

      {/* Background — Dark */}
      <div className="cp-sec">
        <div className="cp-slbl">Background — Dark</div>
        <div className="cp-bg-row">
          {DARK_PALETTES.map((p) => (
            <button
              key={p.id}
              className={`bg-sw ${bgPaletteId === p.id ? 'active' : ''}`}
              style={{ background: `linear-gradient(to right, ${p.vars.bgs} 45%, ${p.vars.bg} 45%)` }}
              onClick={() => setBgPalette(p.id, p.vars, 'dark')}
              title={p.label}
            />
          ))}
        </div>
      </div>

      {/* Background — Light */}
      <div className="cp-sec">
        <div className="cp-slbl">Background — Light</div>
        <div className="cp-bg-row">
          {LIGHT_PALETTES.map((p) => (
            <button
              key={p.id}
              className={`bg-sw ${bgPaletteId === p.id ? 'active' : ''}`}
              style={{ background: `linear-gradient(to right, ${p.vars.bgs} 45%, ${p.vars.bg} 45%)`, border: '1px solid #ddd' }}
              onClick={() => setBgPalette(p.id, p.vars, 'light')}
              title={p.label}
            />
          ))}
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="cp-sec">
        <div className="cp-slbl">Theme</div>
        <div className="cp-theme-row">
          <button className={`cp-theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
            ☀ Light
          </button>
          <button className={`cp-theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
            ☾ Dark
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppearancePanel;