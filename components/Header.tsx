/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useUI } from '../lib/state';

export default function Header() {
  const { toggleSidebar, openStorage } = useUI();

  return (
    <header>
      <div className="header-left">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-1 rounded bg-[#0d9c53]/20 text-[#0d9c53] border border-[#0d9c53]/40 flex items-center gap-1">
            <span className="icon text-xs">airplanemode_active</span>
            EdgeTR Offline
          </span>
        </div>
      </div>
      <div className="header-right flex items-center gap-2">
        <button
          className="storage-button p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1.5"
          onClick={openStorage}
          aria-label="Lokaal Opslagbeheer"
          title="Lokaal Opslagbeheer & Schijfruimte"
        >
          <span className="icon text-xl text-[#448dff]">sd_storage</span>
          <span className="text-xs font-medium hidden sm:inline text-white/70">Opslag</span>
        </button>
        <button
          className="settings-button"
          onClick={toggleSidebar}
          aria-label="Settings"
          title="Settings"
        >
          <span className="icon">tune</span>
        </button>
      </div>
    </header>
  );
}
