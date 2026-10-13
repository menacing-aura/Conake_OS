import React from 'react';
import { useOS } from '../../context/OSContext';
import { Image, Monitor, Sliders, Info, Check } from 'lucide-react';
import { WallpaperId } from '../../types/os';
import { SakuraWallpaper, MoonlitWallpaper, MinimalistWallpaper } from '../../assets/wallpapers';

export const SettingsApp: React.FC = () => {
  const { wallpaper, setWallpaper, profile, totalMemoryMB, zramPercent } = useOS();

  const wallpapers: { id: WallpaperId; title: string; desc: string; Component: React.FC }[] = [
    {
      id: 'sakura',
      title: 'Conake Sakura (Default)',
      desc: 'Anime-inspired sakura sunset over mountains',
      Component: SakuraWallpaper,
    },
    {
      id: 'moonlit',
      title: 'Conake Moonlit',
      desc: 'Nocturnal reflection with moonlit city shoreline',
      Component: MoonlitWallpaper,
    },
    {
      id: 'minimalist',
      title: 'Conake Minimalist',
      desc: 'Original geometric mountains and crescent moon',
      Component: MinimalistWallpaper,
    },
  ];

  return (
    <div className="h-full bg-[#131b25] text-[#f4f7f6] p-6 flex flex-col gap-6 overflow-y-auto font-sans select-none">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Monitor className="w-5 h-5 text-[#68d5bb]" /> Conake OS Settings Manager
        </h1>
        <p className="text-xs text-zinc-400">Desktop configuration, wallpapers, and environment theme</p>
      </div>

      {/* Wallpaper section */}
      <div className="bg-[#182330] p-5 rounded-lg border border-[#233547] space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Image className="w-4 h-4 text-[#68d5bb]" /> Desktop Wallpaper
        </div>
        <p className="text-xs text-zinc-400">
          Wallpapers installed in <code className="text-[#68d5bb] font-mono">/usr/share/backgrounds/conake/</code>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {wallpapers.map((wp) => (
            <div
              key={wp.id}
              onClick={() => setWallpaper(wp.id)}
              className={`rounded-lg border overflow-hidden cursor-pointer transition flex flex-col ${
                wallpaper === wp.id
                  ? 'border-[#68d5bb] ring-2 ring-[#68d5bb]/30'
                  : 'border-[#24374b] hover:border-[#334d67]'
              }`}
            >
              <div className="h-28 w-full relative bg-black/40 overflow-hidden">
                <wp.Component />
                {wallpaper === wp.id && (
                  <div className="absolute top-2 right-2 bg-[#68d5bb] text-[#101820] p-1 rounded-full shadow">
                    <Check className="w-3.5 h-3.5 font-bold" />
                  </div>
                )}
              </div>
              <div className="p-2.5 bg-[#121922] flex-1">
                <div className="font-semibold text-xs text-zinc-100">{wp.title}</div>
                <div className="text-[10px] text-zinc-400">{wp.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Theme information */}
      <div className="bg-[#182330] p-5 rounded-lg border border-[#233547] space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Sliders className="w-4 h-4 text-cyan-400" /> Desktop Environment (XFCE 4.18)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#101721] p-3 rounded border border-[#213549]">
            <div className="text-zinc-400 text-[11px]">GTK Theme</div>
            <div className="font-bold text-zinc-100">Arc-Dark</div>
            <div className="text-[10px] text-zinc-400">Config: xsettings.xml</div>
          </div>
          <div className="bg-[#101721] p-3 rounded border border-[#213549]">
            <div className="text-zinc-400 text-[11px]">Icon Theme</div>
            <div className="font-bold text-zinc-100">Papirus-Dark</div>
            <div className="text-[10px] text-zinc-400">Crisp vector icons</div>
          </div>
          <div className="bg-[#101721] p-3 rounded border border-[#213549]">
            <div className="text-zinc-400 text-[11px]">System Font</div>
            <div className="font-bold text-zinc-100">Noto Sans 10</div>
            <div className="text-[10px] text-zinc-400">Clean typography</div>
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="bg-[#182330] p-5 rounded-lg border border-[#233547] space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Info className="w-4 h-4 text-amber-400" /> System Specifications
        </div>
        <div className="text-xs text-zinc-300 space-y-1 font-mono">
          <div>OS: Conake OS v0.1 (Debian 12 Bookworm live)</div>
          <div>Kernel: Linux 6.1.0-28-amd64</div>
          <div>Memory: {totalMemoryMB} MiB RAM ({profile} profile)</div>
          <div>Swap: zRAM {zramPercent}% compressed swap (zstd)</div>
        </div>
      </div>
    </div>
  );
};
