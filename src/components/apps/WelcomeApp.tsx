import React from 'react';
import { useOS } from '../../context/OSContext';
import { Cpu, ShoppingBag, Terminal, BookOpen, Layers, Usb } from 'lucide-react';

export const WelcomeApp: React.FC<{ windowId: string }> = ({ windowId }) => {
  const { profile, zramPercent, totalMemoryMB, cupsDisabled, closeWindow, openApp } = useOS();

  return (
    <div className="h-full bg-[#101820] text-[#f4f7f6] p-7 flex flex-col justify-between overflow-y-auto font-sans select-none">
      <div className="space-y-4">
        {/* Tkinter recreated header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[#68d5bb] font-bold tracking-wider text-xs uppercase bg-[#68d5bb]/10 px-2 py-0.5 rounded border border-[#68d5bb]/20">
              Debian Live v0.1
            </span>
            <span className="text-xs text-zinc-400 font-mono">XFCE 4.18 + Arc-Dark</span>
          </div>
          <h2 className="text-[#68d5bb] font-bold text-sm tracking-widest uppercase">
            CONAKE OS
          </h2>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f4f7f6] tracking-tight">
            A lighter way to compute.
          </h1>
        </div>

        {/* Tkinter text description */}
        <p className="text-[#c5d0d0] text-sm leading-relaxed">
          Conake OS v0.1 is ready. Your system is running in{' '}
          <strong className="text-[#68d5bb] font-semibold">{profile}</strong> mode.
        </p>

        {/* Dynamic Diagnostics Pill Card */}
        <div className="bg-[#182530] border border-[#203a45] rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-[#203a45] pb-2">
            <span className="flex items-center gap-1.5 font-medium text-zinc-300">
              <Cpu className="w-3.5 h-3.5 text-[#68d5bb]" /> Boot-time RAM Profiler
            </span>
            <span className="font-mono text-[#68d5bb]">
              {totalMemoryMB} MiB RAM detected
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#101820]/70 p-2 rounded border border-[#203a45]/50">
              <div className="text-zinc-400 text-[11px]">zRAM Allocation</div>
              <div className="text-sm font-bold text-[#68d5bb]">
                {zramPercent}% of RAM
              </div>
              <div className="text-[10px] text-zinc-400">
                Compressed swap with zstd
              </div>
            </div>

            <div className="bg-[#101820]/70 p-2 rounded border border-[#203a45]/50">
              <div className="text-zinc-400 text-[11px]">Service Profile</div>
              <div className="text-sm font-bold text-zinc-200 capitalize">
                {profile}
              </div>
              <div className="text-[10px] text-zinc-400">
                {cupsDisabled ? 'CUPS print service disabled' : 'Standard desktop services'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Launch Shortcuts */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => openApp('memory-profiler')}
            className="flex items-center gap-2 px-3 py-2 text-xs bg-[#172b35] hover:bg-[#1e3845] text-zinc-200 rounded border border-[#234552] transition cursor-pointer text-left"
          >
            <Cpu className="w-4 h-4 text-[#68d5bb] shrink-0" />
            <div>
              <div className="font-medium">Test RAM Profiler</div>
              <div className="text-[10px] text-zinc-400">Simulate different memory sizes</div>
            </div>
          </button>

          <button
            onClick={() => openApp('conake-store')}
            className="flex items-center gap-2 px-3 py-2 text-xs bg-[#172b35] hover:bg-[#1e3845] text-zinc-200 rounded border border-[#234552] transition cursor-pointer text-left"
          >
            <ShoppingBag className="w-4 h-4 text-[#68d5bb] shrink-0" />
            <div>
              <div className="font-medium">Flathub Store</div>
              <div className="text-[10px] text-zinc-400">Browse lightweight software</div>
            </div>
          </button>

          <button
            onClick={() => openApp('xfce4-terminal')}
            className="flex items-center gap-2 px-3 py-2 text-xs bg-[#172b35] hover:bg-[#1e3845] text-zinc-200 rounded border border-[#234552] transition cursor-pointer text-left"
          >
            <Terminal className="w-4 h-4 text-[#68d5bb] shrink-0" />
            <div>
              <div className="font-medium">Open Terminal</div>
              <div className="text-[10px] text-zinc-400">Run zramctl & sys tools</div>
            </div>
          </button>

          <button
            onClick={() => openApp('usb-guide')}
            className="flex items-center gap-2 px-3 py-2 text-xs bg-[#172b35] hover:bg-[#1e3845] text-zinc-200 rounded border border-[#234552] transition cursor-pointer text-left"
          >
            <Usb className="w-4 h-4 text-[#68d5bb] shrink-0" />
            <div>
              <div className="font-medium">Flash Live USB</div>
              <div className="text-[10px] text-zinc-400">Chromebook & Ventoy boot guide</div>
            </div>
          </button>

          <button
            onClick={() => openApp('docs')}
            className="flex items-center gap-2 px-3 py-2 text-xs bg-[#172b35] hover:bg-[#1e3845] text-zinc-200 rounded border border-[#234552] transition cursor-pointer text-left"
          >
            <BookOpen className="w-4 h-4 text-[#68d5bb] shrink-0" />
            <div>
              <div className="font-medium">Architecture Docs</div>
              <div className="text-[10px] text-zinc-400">earlyoom & RAM design</div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer Close Button matching original Tkinter look */}
      <div className="flex items-center justify-between pt-4 border-t border-[#203a45]/60 mt-4">
        <span className="text-[11px] text-zinc-400 font-mono">
          /run/conake/memory-profile: {profile}
        </span>
        <button
          onClick={() => closeWindow(windowId)}
          className="bg-[#68d5bb] hover:bg-[#8ce4d0] active:bg-[#5bc4aa] text-[#101820] font-bold text-xs px-5 py-2 rounded transition cursor-pointer shadow-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
};
