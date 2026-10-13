import React, { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { SakuraWallpaper, MoonlitWallpaper, MinimalistWallpaper } from '../../assets/wallpapers';
import { WindowFrame } from './WindowFrame';
import { Panel } from './Panel';
import { WhiskerMenu } from './WhiskerMenu';
import {
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
  Usb,
} from 'lucide-react';

export const Desktop: React.FC = () => {
  const {
    wallpaper,
    windows,
    openApp,
    isWhiskerOpen,
    setIsWhiskerOpen,
  } = useOS();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const desktopShortcuts = [
    { id: 'conake-welcome', title: 'Welcome', icon: Sparkles, color: 'text-[#68d5bb]' },
    { id: 'memory-profiler', title: 'RAM Profiler', icon: Cpu, color: 'text-[#68d5bb]' },
    { id: 'conake-browser', title: 'Browser', icon: Globe, color: 'text-cyan-400' },
    { id: 'conake-store', title: 'Software Store', icon: ShoppingBag, color: 'text-emerald-400' },
    { id: 'xfce4-terminal', title: 'Terminal', icon: Terminal, color: 'text-amber-400' },
    { id: 'thunar', title: 'File System', icon: Folder, color: 'text-blue-400' },
    { id: 'htop', title: 'Task Manager', icon: Activity, color: 'text-rose-400' },
    { id: 'iso-builder', title: 'ISO Builder', icon: Disc, color: 'text-purple-400' },
    { id: 'usb-guide', title: 'Live USB Guide', icon: Usb, color: 'text-[#68d5bb]' },
    { id: 'settings', title: 'Settings', icon: Settings, color: 'text-zinc-300' },
  ];

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDesktopClick = () => {
    if (isWhiskerOpen) setIsWhiskerOpen(false);
    if (contextMenu) setContextMenu(null);
  };

  return (
    <div
      onClick={handleDesktopClick}
      onContextMenu={handleContextMenu}
      className="relative w-screen h-screen overflow-hidden flex flex-col font-sans select-none bg-[#101820]"
    >
      {/* Background Wallpaper */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {wallpaper === 'sakura' && <SakuraWallpaper />}
        {wallpaper === 'moonlit' && <MoonlitWallpaper />}
        {wallpaper === 'minimalist' && <MinimalistWallpaper />}
      </div>

      {/* Desktop Workspace Area */}
      <div className="relative flex-1 overflow-hidden z-10 p-4">
        {/* Desktop Icons Grid */}
        <div className="grid grid-flow-col grid-rows-6 gap-3 w-fit">
          {desktopShortcuts.map((item) => (
            <button
              key={item.id}
              onDoubleClick={() => openApp(item.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-20 h-20 flex flex-col items-center justify-center p-2 rounded-lg hover:bg-black/40 focus:bg-[#68d5bb]/20 focus:ring-1 focus:ring-[#68d5bb] transition text-center cursor-pointer group"
            >
              <div className="p-2 bg-[#101820]/80 rounded-xl border border-white/10 group-hover:border-[#68d5bb]/50 shadow-md">
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <span className="text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-1.5 truncate max-w-full">
                {item.title}
              </span>
            </button>
          ))}
        </div>

        {/* Windows */}
        {windows.map((win) => (
          <WindowFrame key={win.id} win={win} />
        ))}
      </div>

      {/* Right-Click Desktop Context Menu */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="absolute z-50 bg-[#16212d] border border-[#263749] rounded-md shadow-2xl py-1 text-xs text-zinc-200 min-w-44 font-sans"
        >
          <button
            onClick={() => {
              openApp('xfce4-terminal');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#203244] flex items-center gap-2 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-[#68d5bb]" /> Open Terminal Here
          </button>
          <button
            onClick={() => {
              openApp('memory-profiler');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#203244] flex items-center gap-2 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-[#68d5bb]" /> RAM Profiler & zRAM...
          </button>
          <button
            onClick={() => {
              openApp('settings');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#203244] flex items-center gap-2 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" /> Desktop Settings...
          </button>
          <div className="border-t border-[#233547] my-1" />
          <button
            onClick={() => {
              openApp('conake-welcome');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#203244] flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Conake Welcome
          </button>
        </div>
      )}

      {/* Whisker Menu Dropdown */}
      {isWhiskerOpen && <WhiskerMenu />}

      {/* Bottom Panel */}
      <Panel />
    </div>
  );
};
