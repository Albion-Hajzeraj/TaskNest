import PanelCard from '../ui/PanelCard';
import ThemeSwitcher from '../ThemeSwitcher';

const SettingsPanel = ({
  density,
  setDensity,
  resetWorkspaceFilters,
  openFocusPanel,
  stats
}) => {
  return (
    <section className="panel-grid" aria-label="Settings">
      <PanelCard title="Workspace">
        <div className="settings-block">
          <p className="hint">Interface density</p>
          <div className="segmented-control" role="group" aria-label="Interface density">
            <button
              type="button"
              className={`btn segment-btn ${density === 'comfortable' ? 'active' : ''}`}
              onClick={() => setDensity('comfortable')}
              aria-pressed={density === 'comfortable'}
            >
              Comfortable
            </button>
            <button
              type="button"
              className={`btn segment-btn ${density === 'compact' ? 'active' : ''}`}
              onClick={() => setDensity('compact')}
              aria-pressed={density === 'compact'}
            >
              Compact
            </button>
          </div>
        </div>
        <div className="settings-block">
          <p className="hint">Theme</p>
          <ThemeSwitcher />
        </div>
      </PanelCard>

      <PanelCard title="Productivity">
        <ul className="settings-list" aria-label="Keyboard shortcuts">
          <li><kbd>N</kbd> Focus task input</li>
          <li><kbd>/</kbd> Focus search</li>
          <li><kbd>Alt + 1..4</kbd> Switch panels</li>
          <li><kbd>Esc</kbd> Close edit dialog</li>
        </ul>
        <div className="bulk-actions">
          <button className="btn" type="button" onClick={resetWorkspaceFilters}>
            Reset filters
          </button>
          <button className="btn" type="button" onClick={openFocusPanel}>
            Open focus view
          </button>
        </div>
        <p className="hint">Weekly completions: {stats.weekDone}</p>
      </PanelCard>
    </section>
  );
};

export default SettingsPanel;
