import React, { useState } from 'react';
import { useOS } from '../../context/OSContext';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Search,
  ExternalLink,
  ShieldCheck,
  Plus,
  X,
  BookOpen,
  FolderCode,
  Globe,
  Sparkles
} from 'lucide-react';

interface Tab {
  id: string;
  title: string;
  url: string;
}

export const BrowserApp: React.FC = () => {
  const { profile, totalMemoryMB, openApp } = useOS();
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Conake Start', url: 'conake://start' },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [inputUrl, setInputUrl] = useState<string>('conake://start');

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const navigateTo = (url: string, title?: string) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('conake://')) {
      cleanUrl = `https://search.conake.org/?q=${encodeURIComponent(cleanUrl)}`;
    }
    setInputUrl(cleanUrl);
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? { ...t, url: cleanUrl, title: title || (cleanUrl.startsWith('conake://') ? cleanUrl.replace('conake://', '') : cleanUrl.replace('https://', '')) }
          : t
      )
    );
  };

  const handleNewTab = () => {
    const newId = String(Date.now());
    const newTab: Tab = { id: newId, title: 'New Tab', url: 'conake://start' };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setInputUrl('conake://start');
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0].id);
      setInputUrl(remaining[0].url);
    }
  };

  return (
    <div className="h-full bg-[#1b222d] text-[#f4f7f6] flex flex-col font-sans select-none overflow-hidden">
      {/* Tab Strip */}
      <div className="bg-[#10161f] px-2 pt-2 flex items-center gap-1 border-b border-[#243343] overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => {
              setActiveTabId(tab.id);
              setInputUrl(tab.url);
            }}
            className={`group max-w-56 flex items-center justify-between gap-2 px-3 py-1.5 rounded-t text-xs cursor-pointer border-t border-l border-r transition ${
              tab.id === activeTabId
                ? 'bg-[#1e2937] text-white border-[#2e4256] font-medium'
                : 'bg-[#141c26] text-zinc-400 border-transparent hover:bg-[#182330] hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="w-3.5 h-3.5 text-[#68d5bb] shrink-0" />
              <span className="truncate">{tab.title}</span>
            </div>
            {tabs.length > 1 && (
              <button
                onClick={(e) => handleCloseTab(tab.id, e)}
                className="opacity-60 hover:opacity-100 hover:bg-zinc-700/50 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={handleNewTab}
          className="p-1 hover:bg-[#1e2937] text-zinc-400 hover:text-zinc-200 rounded cursor-pointer"
          title="New Tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Toolbar */}
      <div className="bg-[#1a2432] p-2 flex items-center gap-2 border-b border-[#253648]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateTo('conake://start')}
            className="p-1.5 hover:bg-[#253648] text-zinc-300 rounded cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateTo('conake://start')}
            className="p-1.5 hover:bg-[#253648] text-zinc-300 rounded cursor-pointer"
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateTo(inputUrl)}
            className="p-1.5 hover:bg-[#253648] text-zinc-300 rounded cursor-pointer"
            title="Reload"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateTo('conake://start', 'Conake Start')}
            className="p-1.5 hover:bg-[#253648] text-zinc-300 rounded cursor-pointer"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* Address Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigateTo(inputUrl);
          }}
          className="flex-1 flex items-center bg-[#101721] border border-[#2b3e52] rounded-md px-3 py-1.5 text-xs text-zinc-200 focus-within:border-[#68d5bb]"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#68d5bb] mr-2 shrink-0" />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-zinc-100 font-mono text-xs"
            placeholder="Search with Conake or enter URL..."
          />
        </form>
      </div>

      {/* Bookmarks Bar */}
      <div className="bg-[#151d28] px-3 py-1 flex items-center gap-4 text-xs text-zinc-300 border-b border-[#202d3c] overflow-x-auto">
        <button
          onClick={() => navigateTo('conake://start', 'Conake Start')}
          className="flex items-center gap-1 hover:text-[#68d5bb] cursor-pointer shrink-0"
        >
          <Sparkles className="w-3 h-3 text-[#68d5bb]" /> Conake Home
        </button>
        <button
          onClick={() => navigateTo('conake://architecture', 'Architecture')}
          className="flex items-center gap-1 hover:text-[#68d5bb] cursor-pointer shrink-0"
        >
          <BookOpen className="w-3 h-3 text-cyan-400" /> Architecture Docs
        </button>
        <button
          onClick={() => navigateTo('conake://flathub', 'Flathub Directory')}
          className="flex items-center gap-1 hover:text-[#68d5bb] cursor-pointer shrink-0"
        >
          <FolderCode className="w-3 h-3 text-emerald-400" /> Flathub Repos
        </button>
        <button
          onClick={() => navigateTo('conake://debian', 'Debian Live Project')}
          className="flex items-center gap-1 hover:text-[#68d5bb] cursor-pointer shrink-0"
        >
          <Globe className="w-3 h-3 text-amber-400" /> Debian Live
        </button>
      </div>

      {/* Browser Viewport */}
      <div className="flex-1 bg-[#0f151e] overflow-y-auto p-6">
        {activeTab.url === 'conake://start' && (
          <div className="max-w-3xl mx-auto space-y-6 pt-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#182635] border border-[#233a4c] rounded-full text-xs text-[#68d5bb]">
                <ShieldCheck className="w-4 h-4" /> Conake Browser • Memory-efficient ESR
              </div>
              <h1 className="text-3xl font-extrabold text-[#f4f7f6]">
                Explore Conake OS
              </h1>
              <p className="text-xs text-zinc-400">
                Debian Live desktop runtime with boot-time memory profiling ({totalMemoryMB} MiB RAM • {profile} mode)
              </p>
            </div>

            {/* In-page search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search documentation, packages, or web..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigateTo((e.target as HTMLInputElement).value);
                  }
                }}
                className="w-full bg-[#16212d] border border-[#273c4f] rounded-lg pl-10 pr-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-[#68d5bb]"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            </div>

            {/* Quick Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <button
                onClick={() => navigateTo('conake://architecture', 'v0.1 Architecture')}
                className="bg-[#162230] hover:bg-[#1d2d3e] p-3.5 rounded-lg border border-[#233748] text-left transition cursor-pointer"
              >
                <BookOpen className="w-5 h-5 text-[#68d5bb] mb-2" />
                <div className="font-semibold text-xs text-zinc-200">v0.1 Architecture</div>
                <div className="text-[11px] text-zinc-400">RAM profiling & zRAM design</div>
              </button>

              <button
                onClick={() => navigateTo('conake://flathub', 'Flathub Remote')}
                className="bg-[#162230] hover:bg-[#1d2d3e] p-3.5 rounded-lg border border-[#233748] text-left transition cursor-pointer"
              >
                <FolderCode className="w-5 h-5 text-cyan-400 mb-2" />
                <div className="font-semibold text-xs text-zinc-200">Flathub Remote</div>
                <div className="text-[11px] text-zinc-400">GNOME Software hook</div>
              </button>

              <button
                onClick={() => openApp('iso-builder')}
                className="bg-[#162230] hover:bg-[#1d2d3e] p-3.5 rounded-lg border border-[#233748] text-left transition cursor-pointer"
              >
                <ExternalLink className="w-5 h-5 text-amber-400 mb-2" />
                <div className="font-semibold text-xs text-zinc-200">ISO Build Pipeline</div>
                <div className="text-[11px] text-zinc-400">live-build script inspector</div>
              </button>

              <button
                onClick={() => openApp('conake-store')}
                className="bg-[#162230] hover:bg-[#1d2d3e] p-3.5 rounded-lg border border-[#233748] text-left transition cursor-pointer"
              >
                <Globe className="w-5 h-5 text-purple-400 mb-2" />
                <div className="font-semibold text-xs text-zinc-200">Software Store</div>
                <div className="text-[11px] text-zinc-400">Browse desktop tools</div>
              </button>
            </div>
          </div>
        )}

        {activeTab.url === 'conake://architecture' && (
          <div className="max-w-3xl mx-auto bg-[#141d27] p-6 rounded-lg border border-[#223546] space-y-4">
            <h2 className="text-xl font-bold text-[#68d5bb] flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> Conake OS v0.1 Architecture Specification
            </h2>
            <div className="text-xs text-zinc-300 space-y-3 leading-relaxed">
              <p>
                Conake OS is assembled as a <strong>Debian Live system</strong>. <code className="bg-[#0e1620] px-1.5 py-0.5 rounded text-[#68d5bb]">boot/live-build/</code> describes the ISO package set, while the build script stages <code className="bg-[#0e1620] px-1.5 py-0.5 rounded text-[#68d5bb]">system/</code>, <code className="bg-[#0e1620] px-1.5 py-0.5 rounded text-[#68d5bb]">apps/</code>, and <code className="bg-[#0e1620] px-1.5 py-0.5 rounded text-[#68d5bb]">assets/</code> into the live root filesystem.
              </p>
              <h3 className="font-bold text-zinc-100 text-sm pt-2">RAM Profiling Policy</h3>
              <p>
                At boot, <code className="bg-[#0e1620] px-1.5 py-0.5 rounded text-[#68d5bb]">conake-memory-profile.service</code> reads <code className="bg-[#0e1620] px-1.5 py-0.5 rounded text-cyan-400">MemTotal</code> from <code className="bg-[#0e1620] px-1.5 py-0.5 rounded">/proc/meminfo</code> and writes the selected profile to <code className="bg-[#0e1620] px-1.5 py-0.5 rounded">/run/conake/memory-profile</code>:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Ultra-light (&lt; 2 GB RAM):</strong> 100% zRAM allocation; disables optional CUPS print services.</li>
                <li><strong>Lightweight (2–4 GB RAM):</strong> 75% zRAM allocation.</li>
                <li><strong>Normal (4–8 GB RAM):</strong> 50% zRAM allocation.</li>
                <li><strong>Full (8+ GB RAM):</strong> 25% zRAM allocation.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab.url === 'conake://flathub' && (
          <div className="max-w-3xl mx-auto bg-[#141d27] p-6 rounded-lg border border-[#223546] space-y-4">
            <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
              <FolderCode className="w-5 h-5" /> Flathub & Live-Build Integration
            </h2>
            <div className="text-xs text-zinc-300 space-y-3 leading-relaxed">
              <p>
                Conake OS integrates Flathub through the chroot hook located at:
                <br />
                <code className="bg-[#0e1620] px-2 py-1 rounded text-[#68d5bb] block my-2">
                  boot/live-build/config/hooks/live/0900-flathub.hook.chroot
                </code>
              </p>
              <p>
                This hook registers the Flathub remote repository during ISO build so that applications can be discovered without background daemon memory overhead.
              </p>
            </div>
          </div>
        )}

        {activeTab.url === 'conake://debian' && (
          <div className="max-w-3xl mx-auto bg-[#141d27] p-6 rounded-lg border border-[#223546] space-y-4">
            <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <Globe className="w-5 h-5" /> Debian Live Technology Stack
            </h2>
            <div className="text-xs text-zinc-300 space-y-3 leading-relaxed">
              <p>
                Debian supplies the Linux kernel, init system (systemd), and hardware drivers. XFCE 4.18 supplies the desktop session with Arc Dark styling and Papirus icons.
              </p>
              <p>
                The live image boots completely into RAM and compressed zRAM, allowing blazing-fast performance without writing anything to disk.
              </p>
            </div>
          </div>
        )}

        {activeTab.url.startsWith('https://search.conake.org/') && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="text-xs text-zinc-400">
              Showing simulated web results for query:
            </div>
            <div className="bg-[#141d27] p-4 rounded border border-[#223546] space-y-1">
              <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('conake://architecture'); }} className="text-[#68d5bb] font-semibold text-sm hover:underline">
                Conake OS: A lighter way to compute
              </a>
              <div className="text-[11px] text-zinc-400">https://conake.org/architecture</div>
              <p className="text-xs text-zinc-300">Debian-based live desktop prototype with dynamic RAM profiling and zRAM swap.</p>
            </div>
            <div className="bg-[#141d27] p-4 rounded border border-[#223546] space-y-1">
              <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('conake://flathub'); }} className="text-cyan-400 font-semibold text-sm hover:underline">
                Flathub Applications for Conake OS
              </a>
              <div className="text-[11px] text-zinc-400">https://flathub.org/conake</div>
              <p className="text-xs text-zinc-300">Browse sandboxed desktop tools running seamlessly in ultra-light and normal memory profiles.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
