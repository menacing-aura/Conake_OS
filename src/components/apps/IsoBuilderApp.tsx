import React, { useState } from 'react';
import { Disc, Play, CheckCircle2, Terminal, RefreshCw, Cpu, Layers } from 'lucide-react';

export const IsoBuilderApp: React.FC = () => {
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([
    'Conake OS Live ISO Build Subsystem ready.',
    'Configuration located at boot/live-build/config/',
    'Run script: scripts/build.sh -> Output: dist/conake-os-v0.1-amd64.iso',
  ]);
  const [progress, setProgress] = useState<number>(0);
  const [buildComplete, setBuildComplete] = useState<boolean>(false);

  const startBuild = () => {
    if (isBuilding) return;
    setIsBuilding(true);
    setProgress(5);
    setBuildComplete(false);
    setBuildLogs(['[1/5] Initializing live-build configuration (lb config)...']);

    const steps = [
      { p: 25, log: '[2/5] Staging Debian 12 Bookworm debootstrap chroot...' },
      { p: 45, log: '[3/5] Installing Conake package lists (xfce4, arc-theme, zram-tools, python3-tk)...' },
      { p: 70, log: '[4/5] Injecting Conake services, wallpapers, and 0900-flathub hook...' },
      { p: 90, log: '[5/5] Compressing squashfs filesystem and mastering bootable hybrid ISO...' },
      { p: 100, log: 'SUCCESS: Built dist/conake-os-v0.1-amd64.iso (1.4 GB bootable hybrid ISO)' },
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setProgress(step.p);
        setBuildLogs((prev) => [...prev, step.log]);
        if (idx === steps.length - 1) {
          setIsBuilding(false);
          setBuildComplete(true);
        }
      }, (idx + 1) * 800);
    });
  };

  return (
    <div className="h-full bg-[#121922] text-[#f4f7f6] p-6 flex flex-col gap-4 font-sans select-none overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#213547] gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Disc className="w-5 h-5 text-[#68d5bb]" /> Conake ISO Builder & Pipeline
          </h1>
          <p className="text-xs text-zinc-400">
            Reproducible Debian Live ISO build automation (<code className="text-[#68d5bb]">scripts/build.sh</code>)
          </p>
        </div>

        <button
          onClick={startBuild}
          disabled={isBuilding}
          className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition cursor-pointer ${
            isBuilding
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-[#68d5bb] hover:bg-[#8ce4d0] text-[#101820]'
          }`}
        >
          {isBuilding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {isBuilding ? 'Building ISO...' : 'Build Live ISO'}
        </button>
      </div>

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-300">
            <span>Build Progress</span>
            <span className="font-mono text-[#68d5bb]">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-[#0d141d] rounded-full overflow-hidden border border-[#233547]">
            <div
              className="h-full bg-[#68d5bb] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Pipeline Stage Architecture */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-[#182330] p-3 rounded border border-[#223547]">
          <div className="text-[10px] text-zinc-400 uppercase font-mono">Stage 1</div>
          <div className="font-bold text-zinc-200 mt-0.5">lb config</div>
          <div className="text-[11px] text-zinc-400">Archives & debian-security</div>
        </div>

        <div className="bg-[#182330] p-3 rounded border border-[#223547]">
          <div className="text-[10px] text-zinc-400 uppercase font-mono">Stage 2</div>
          <div className="font-bold text-zinc-200 mt-0.5">Packages</div>
          <div className="text-[11px] text-zinc-400">xfce4, arc-dark, zram-tools</div>
        </div>

        <div className="bg-[#182330] p-3 rounded border border-[#223547]">
          <div className="text-[10px] text-zinc-400 uppercase font-mono">Stage 3</div>
          <div className="font-bold text-zinc-200 mt-0.5">Hooks & Assets</div>
          <div className="text-[11px] text-zinc-400">0900-flathub & wallpapers</div>
        </div>

        <div className="bg-[#182330] p-3 rounded border border-[#223547]">
          <div className="text-[10px] text-zinc-400 uppercase font-mono">Stage 4</div>
          <div className="font-bold text-zinc-200 mt-0.5">QEMU & noVNC</div>
          <div className="text-[11px] text-zinc-400">Port 6080 live preview</div>
        </div>
      </div>

      {/* Live Build Terminal Log Output */}
      <div className="flex-1 bg-[#0b1017] p-4 rounded-lg border border-[#1e2e3f] font-mono text-xs flex flex-col min-h-48">
        <div className="flex items-center justify-between text-zinc-400 border-b border-[#1c2937] pb-2 mb-2">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#68d5bb]" /> Live-Build Execution Logs
          </span>
          {buildComplete && (
            <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> ISO Generated
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 select-text">
          {buildLogs.map((log, i) => (
            <div
              key={i}
              className={`${
                log.startsWith('SUCCESS')
                  ? 'text-[#68d5bb] font-bold'
                  : log.startsWith('[')
                  ? 'text-cyan-300'
                  : 'text-zinc-300'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
