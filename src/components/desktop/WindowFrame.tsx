import React, { useState, useRef, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { AppWindow } from '../../types/os';
import { useOS } from '../../context/OSContext';
import { WelcomeApp } from '../apps/WelcomeApp';
import { MemoryProfilerApp } from '../apps/MemoryProfilerApp';
import { BrowserApp } from '../apps/BrowserApp';
import { StoreApp } from '../apps/StoreApp';
import { TerminalApp } from '../apps/TerminalApp';
import { FileManagerApp } from '../apps/FileManagerApp';
import { SettingsApp } from '../apps/SettingsApp';
import { IsoBuilderApp } from '../apps/IsoBuilderApp';
import { TaskManagerApp } from '../apps/TaskManagerApp';
import { UsbGuideApp } from '../apps/UsbGuideApp';

export const WindowFrame: React.FC<{ win: AppWindow }> = ({ win }) => {
  const {
    activeWindowId,
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximizeWindow,
    updateWindowPosition,
  } = useOS();

  const isFocused = activeWindowId === win.id;
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: win.position.x,
    initY: win.position.y,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    focusWindow(win.id);
  };

  const handleTitlebarMouseDown = (e: React.MouseEvent) => {
    if (win.isMaximized) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: win.position.x,
      initY: win.position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const newX = Math.max(0, Math.min(window.innerWidth - 100, dragStartRef.current.initX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 80, dragStartRef.current.initY + dy));
      updateWindowPosition(win.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, win.id, updateWindowPosition]);

  if (win.isMinimized) return null;

  const renderContent = () => {
    switch (win.appType) {
      case 'conake-welcome':
        return <WelcomeApp windowId={win.id} />;
      case 'memory-profiler':
        return <MemoryProfilerApp />;
      case 'conake-browser':
        return <BrowserApp />;
      case 'conake-store':
        return <StoreApp />;
      case 'xfce4-terminal':
        return <TerminalApp />;
      case 'thunar':
        return <FileManagerApp />;
      case 'settings':
        return <SettingsApp />;
      case 'iso-builder':
        return <IsoBuilderApp />;
      case 'usb-guide':
        return <UsbGuideApp />;
      case 'htop':
        return <TaskManagerApp />;
      case 'docs':
        return <BrowserApp />;
      default:
        return (
          <div className="p-6 text-zinc-300">
            <h2 className="text-lg font-bold">{win.title}</h2>
            <p className="text-xs text-zinc-400 mt-2">Application is active in the session.</p>
          </div>
        );
    }
  };

  const style: React.CSSProperties = win.isMaximized
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 36, // panel height
        zIndex: win.zIndex,
      }
    : {
        position: 'absolute',
        left: `${win.position.x}px`,
        top: `${win.position.y}px`,
        width: `${win.size.width}px`,
        height: `${win.size.height}px`,
        zIndex: win.zIndex,
      };

  return (
    <div
      style={style}
      onMouseDown={handleMouseDown}
      className={`flex flex-col rounded-t-md overflow-hidden shadow-2xl transition-shadow ${
        isFocused ? 'ring-1 ring-[#68d5bb]/40 shadow-black/70' : 'opacity-95 shadow-black/40'
      } border border-[#2b394a] bg-[#141b24]`}
    >
      {/* Arc-Dark Window Titlebar */}
      <div
        onMouseDown={handleTitlebarMouseDown}
        onDoubleClick={() => toggleMaximizeWindow(win.id)}
        className={`h-8 px-3 flex items-center justify-between cursor-move select-none border-b transition-colors ${
          isFocused
            ? 'bg-[#212c39] border-[#2b3a4a] text-zinc-100'
            : 'bg-[#18212c] border-[#1e2a36] text-zinc-400'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="w-2.5 h-2.5 rounded-full bg-[#68d5bb]/80 shrink-0" />
          <span className="text-xs font-semibold truncate tracking-wide">{win.title}</span>
        </div>

        {/* XFCE Window Controls */}
        <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => minimizeWindow(win.id)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#2c3d50] text-zinc-300 hover:text-white cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={() => toggleMaximizeWindow(win.id)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#2c3d50] text-zinc-300 hover:text-white cursor-pointer"
            title={win.isMaximized ? 'Restore' : 'Maximize'}
          >
            {win.isMaximized ? <Copy className="w-2.5 h-2.5" /> : <Square className="w-2.5 h-2.5" />}
          </button>
          <button
            onClick={() => closeWindow(win.id)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-rose-600 text-zinc-300 hover:text-white cursor-pointer transition-colors"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className="flex-1 overflow-hidden relative bg-[#121922]">{renderContent()}</div>
    </div>
  );
};
