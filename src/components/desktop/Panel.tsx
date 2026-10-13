import React, { useState, useEffect } from 'react';
import { useOS } from '../../context/OSContext';
import { ConakeLogoIcon } from '../../assets/wallpapers';
import {
  Volume2,
  Wifi,
  Cpu,
  HardDrive,
  Clock,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';

export const Panel: React.FC = () => {
  const {
    windows,
    activeWindowId,
    focusWindow,
    minimizeWindow,
    isWhiskerOpen,
    setIsWhiskerOpen,
    profile,
    totalMemoryMB,
    zramPercent,
    activeWorkspace,
    setActiveWorkspace,
    openApp,
  } = useOS();

  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-9 bg-[#121922] border-t border-[#1e2a38] flex items-center justify-between px-2 text-xs font-sans select-none z-40 relative">
      {/* Left: Whisker Menu Button + Taskbar Window Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto flex-1 mr-2">
        {/* Whisker Menu Launcher */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsWhiskerOpen((prev) => !prev);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer ${
            isWhiskerOpen
              ? 'bg-[#68d5bb] text-[#101820] font-bold shadow'
              : 'bg-[#182330] hover:bg-[#203040] text-zinc-200 border border-[#233547]'
          }`}
          title="Applications Menu"
        >
          <ConakeLogoIcon className="w-4 h-4 shrink-0" />
          <span className="font-bold text-xs tracking-wide">Applications</span>
        </button>

        {/* Window Items */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {windows.map((win) => {
            const isActive = activeWindowId === win.id && !win.isMinimized;
            return (
              <button
                key={win.id}
                onClick={() => {
                  if (isActive) {
                    minimizeWindow(win.id);
                  } else {
                    focusWindow(win.id);
                  }
                }}
                className={`max-w-44 truncate px-2.5 py-1 rounded text-[11px] flex items-center gap-1.5 transition cursor-pointer border ${
                  isActive
                    ? 'bg-[#223344] text-[#68d5bb] border-[#68d5bb]/40 font-semibold shadow-inner'
                    : win.isMinimized
                    ? 'bg-[#141b24] text-zinc-500 border-transparent hover:bg-[#18222e]'
                    : 'bg-[#182330] text-zinc-300 border-[#233547] hover:bg-[#1f2d3c]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#68d5bb]' : 'bg-zinc-500'}`} />
                <span className="truncate">{win.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Workspace Switcher + Tray */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Workspace Switcher */}
        <div className="hidden sm:flex items-center bg-[#0d141d] rounded p-0.5 border border-[#1e2a38]">
          <button
            onClick={() => setActiveWorkspace(1)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              activeWorkspace === 1 ? 'bg-[#68d5bb] text-[#101820]' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            1
          </button>
          <button
            onClick={() => setActiveWorkspace(2)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              activeWorkspace === 2 ? 'bg-[#68d5bb] text-[#101820]' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            2
          </button>
        </div>

        {/* Dynamic Memory Profile Badge (clickable to open profiler) */}
        <button
          onClick={() => openApp('memory-profiler')}
          className="flex items-center gap-1 px-2 py-1 bg-[#162230] hover:bg-[#1f2f42] rounded border border-[#233649] text-[11px] transition cursor-pointer"
          title="Click to inspect/adjust RAM and zRAM"
        >
          <Cpu className="w-3.5 h-3.5 text-[#68d5bb]" />
          <span className="text-[#68d5bb] font-bold uppercase text-[10px]">{profile}</span>
          <span className="text-zinc-400 text-[10px] hidden md:inline">({zramPercent}% zRAM)</span>
        </button>

        {/* System Status Indicators */}
        <div className="flex items-center gap-2 text-zinc-400 px-1">
          <span title="Connected to network"><Wifi className="w-3.5 h-3.5 text-zinc-300" /></span>
          <span title="Audio: 100%"><Volume2 className="w-3.5 h-3.5 text-zinc-300" /></span>
        </div>

        {/* Clock */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0e151e] rounded border border-[#1c2836] text-[11px] text-zinc-200 font-mono">
          <Clock className="w-3 h-3 text-[#68d5bb]" />
          <span>{timeStr || '18:30'}</span>
        </div>
      </div>
    </div>
  );
};
