import React, { useState } from 'react';
import { useOS } from '../../context/OSContext';
import {
  Search,
  Power,
  RotateCcw,
  Sparkles,
  Cpu,
  Globe,
  ShoppingBag,
  Terminal,
  Folder,
  Settings,
  Disc,
  Activity,
  BookOpen,
  Sliders,
  Usb,
} from 'lucide-react';

export const WhiskerMenu: React.FC = () => {
  const { openApp, setIsWhiskerOpen, profile, totalMemoryMB, systemPackages } = useOS();
  const [search, setSearch] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Favorites', 'Accessories', 'Internet', 'System', 'Development'];

  const allApps = [
    { id: 'conake-welcome', name: 'Conake Welcome', desc: 'First boot welcome screen', icon: Sparkles, cat: 'Favorites' },
    { id: 'memory-profiler', name: 'Memory Profiler', desc: 'Dynamic RAM detection & zRAM sizing', icon: Cpu, cat: 'System' },
    { id: 'conake-browser', name: 'Conake Browser', desc: 'Lightweight web browser (Firefox ESR)', icon: Globe, cat: 'Internet' },
    { id: 'conake-store', name: 'Conake Store', desc: 'Discover and install applications', icon: ShoppingBag, cat: 'System' },
    { id: 'xfce4-terminal', name: 'Terminal Emulator', desc: 'Command prompt and system shell', icon: Terminal, cat: 'System' },
    { id: 'thunar', name: 'File Manager', desc: 'Explore the live filesystem', icon: Folder, cat: 'Accessories' },
    { id: 'htop', name: 'Task Manager (Htop)', desc: 'Interactive system monitor', icon: Activity, cat: 'System' },
    { id: 'iso-builder', name: 'ISO Build Pipeline', desc: 'Debian live-build automation', icon: Disc, cat: 'Development' },
    { id: 'usb-guide', name: 'Live USB & Chromebook Guide', desc: 'Flash ISO & boot on hardware', icon: Usb, cat: 'System' },
    { id: 'settings', name: 'Settings Manager', desc: 'Desktop and wallpaper preferences', icon: Settings, cat: 'Accessories' },
    { id: 'docs', name: 'Documentation', desc: 'Conake OS architecture docs', icon: BookOpen, cat: 'Accessories' },
  ];

  const filteredApps = allApps.filter((app) => {
    const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) || app.desc.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === 'All' || app.cat === activeCategory || (activeCategory === 'Favorites' && (app.id === 'conake-welcome' || app.id === 'conake-browser' || app.id === 'memory-profiler'));
    return matchesSearch && matchesCat;
  });

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-10 left-1 w-96 max-h-[500px] bg-[#151e29] border border-[#273a4d] rounded-t-lg shadow-2xl flex flex-col font-sans select-none z-50 text-[#f4f7f6]"
    >
      {/* Search Header */}
      <div className="p-3 bg-[#1a2533] border-b border-[#253648] flex items-center gap-2">
        <Search className="w-4 h-4 text-zinc-400" />
        <input
          type="text"
          autoFocus
          placeholder="Search applications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none w-full text-xs text-white placeholder-zinc-400"
        />
      </div>

      {/* Categories & App List */}
      <div className="flex flex-1 overflow-hidden min-h-[300px]">
        {/* Category list */}
        <div className="w-28 bg-[#101721] p-1.5 border-r border-[#203040] space-y-0.5 text-xs">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`w-full text-left px-2 py-1.5 rounded transition cursor-pointer text-[11px] ${
                activeCategory === c
                  ? 'bg-[#68d5bb]/20 text-[#68d5bb] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#16212e]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Application List */}
        <div className="flex-1 p-2 overflow-y-auto space-y-1">
          {filteredApps.map((app) => (
            <button
              key={app.id}
              onClick={() => {
                openApp(app.id);
                setIsWhiskerOpen(false);
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded hover:bg-[#1d2a3a] transition text-left cursor-pointer group"
            >
              <div className="p-1.5 bg-[#0f1722] rounded border border-[#233446] group-hover:border-[#68d5bb]/50 text-[#68d5bb]">
                <app.icon className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                  {app.name}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">{app.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Session Tray */}
      <div className="bg-[#101721] px-3 py-2 border-t border-[#203040] flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#68d5bb]" />
          <span className="font-semibold text-zinc-300">conake</span>
          <span className="text-[10px] text-zinc-500 font-mono">({profile} • {totalMemoryMB}MB)</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => openApp('settings')}
            className="p-1.5 hover:bg-[#1a2533] rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title="Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              openApp('conake-welcome');
              setIsWhiskerOpen(false);
            }}
            className="p-1.5 hover:bg-[#1a2533] rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title="Welcome"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
