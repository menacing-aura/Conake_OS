import React, { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { Cpu, HardDrive, RefreshCw, CheckCircle2, AlertCircle, FileText, Activity, ShieldCheck, Laptop, Usb, Zap } from 'lucide-react';

export const MemoryProfilerApp: React.FC = () => {
  const { totalMemoryMB, setTotalMemoryMB, profile, zramPercent, cupsDisabled, openApp } = useOS();
  const [isSimulatingOom, setIsSimulatingOom] = useState<boolean>(false);
  const [oomLogs, setOomLogs] = useState<string[]>([]);

  const presets = [
    { label: 'Chromebook 4 GB (3.5G usable)', value: 3584, expected: 'lightweight' },
    { label: '512 MiB (Legacy/VM)', value: 512, expected: 'ultra-light' },
    { label: '1024 MiB (Ultra-Light)', value: 1024, expected: 'ultra-light' },
    { label: '2048 MiB (Lightweight)', value: 2048, expected: 'lightweight' },
    { label: '4096 MiB (Normal)', value: 4096, expected: 'normal' },
    { label: '8192 MiB (Full)', value: 8192, expected: 'full' },
  ];

  // Simulated live memory usage
  const usedRamMb = Math.round(
    profile === 'ultra-light'
      ? Math.min(totalMemoryMB * 0.45, 380)
      : profile === 'lightweight'
      ? Math.min(totalMemoryMB * 0.35, 750)
      : profile === 'normal'
      ? Math.min(totalMemoryMB * 0.28, 1400)
      : Math.min(totalMemoryMB * 0.22, 2200)
  );
  const freeRamMb = totalMemoryMB - usedRamMb;
  const zramCapacityMb = Math.round((totalMemoryMB * zramPercent) / 100);

  const simulateEarlyoomAction = () => {
    setIsSimulatingOom(true);
    setOomLogs(['[earlyoom] Memory pressure rising: available RAM: 4.8%, free swap: 3.9%']);
    setTimeout(() => {
      setOomLogs((prev) => [
        ...prev,
        '[earlyoom] Low-memory threshold breached (< 5% RAM and < 5% swap)!',
        '[earlyoom] Sending SIGTERM to highest memory consumer: runaway-tab (PID 1420, 480 MB)',
        '[earlyoom] Memory recovered: available RAM: 18.2%. Desktop remained completely responsive without freezing!',
      ]);
      setIsSimulatingOom(false);
    }, 1200);
  };

  return (
    <div className="h-full bg-[#131c26] text-[#f4f7f6] p-6 flex flex-col gap-5 overflow-y-auto font-sans select-none">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#213544] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#f4f7f6]">
              Conake Memory Profiler & Reliability
            </h1>
            <span className="text-xs bg-[#68d5bb]/15 text-[#68d5bb] font-mono px-2 py-0.5 rounded border border-[#68d5bb]/30">
              system/usr/local/sbin/conake-memory-profile
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Dynamic RAM sizing, zRAM compression policy, and earlyoom out-of-memory daemon
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openApp('usb-guide')}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#1a2d3c] hover:bg-[#233d52] text-[#68d5bb] rounded border border-[#2b4b63] text-xs font-semibold transition cursor-pointer"
          >
            <Usb className="w-3.5 h-3.5" /> USB / Chromebook Guide
          </button>
          <span className={`px-2.5 py-1 text-xs font-bold rounded uppercase tracking-wider ${
            profile === 'ultra-light'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : profile === 'lightweight'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : profile === 'normal'
              ? 'bg-[#68d5bb]/20 text-[#68d5bb] border border-[#68d5bb]/40'
              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
          }`}>
            {profile}
          </span>
        </div>
      </div>

      {/* Memory Simulator Slider & Presets */}
      <div className="bg-[#182635] p-5 rounded-lg border border-[#243e50] space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-[#68d5bb]" />
              Simulate Installed Physical RAM (MemTotal)
            </label>
            <p className="text-xs text-zinc-400">
              Adjust to test Conake's boot-time profile transitions & zRAM policies
            </p>
          </div>
          <div className="font-mono text-lg font-bold text-[#68d5bb] bg-[#101820] px-3 py-1 rounded border border-[#243e50]">
            {totalMemoryMB} MiB ({(totalMemoryMB / 1024).toFixed(totalMemoryMB % 1024 === 0 ? 0 : 2)} GiB)
          </div>
        </div>

        <input
          type="range"
          min="512"
          max="16384"
          step="256"
          value={totalMemoryMB}
          onChange={(e) => setTotalMemoryMB(Number(e.target.value))}
          className="w-full accent-[#68d5bb] cursor-pointer"
        />

        {/* Quick Presets */}
        <div>
          <div className="text-[11px] text-zinc-400 mb-2 uppercase tracking-wider font-semibold">
            Hardware Configurations:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => setTotalMemoryMB(p.value)}
                className={`px-3 py-2 text-xs rounded border text-left transition cursor-pointer ${
                  totalMemoryMB === p.value
                    ? 'bg-[#68d5bb]/20 border-[#68d5bb] text-white font-semibold shadow-sm ring-1 ring-[#68d5bb]/30'
                    : 'bg-[#121e2b] border-[#22394a] text-zinc-300 hover:bg-[#1a2d3e]'
                }`}
              >
                <div className="font-medium">{p.label}</div>
                <div className="text-[10px] text-zinc-400 capitalize">Mode: {p.expected}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Memory Breakdown & zRAM Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* RAM Usage Breakdown */}
        <div className="bg-[#182635] p-4 rounded-lg border border-[#243e50] space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 border-b border-[#243e50] pb-2">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#68d5bb]" /> Physical Memory Allocation
            </span>
            <span className="font-mono text-zinc-400">{usedRamMb} MiB / {totalMemoryMB} MiB</span>
          </div>

          <div className="h-4 w-full bg-[#101820] rounded-full overflow-hidden flex border border-[#243e50]">
            <div
              className="bg-[#68d5bb] transition-all duration-300"
              style={{ width: `${(usedRamMb / totalMemoryMB) * 100}%` }}
              title="Used RAM"
            />
            <div
              className="bg-zinc-700/60 transition-all duration-300"
              style={{ width: `${(freeRamMb / totalMemoryMB) * 100}%` }}
              title="Free RAM"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-[#101820]/70 p-2 rounded border border-[#243e50]/40">
              <div className="text-zinc-400 text-[11px]">Active Memory</div>
              <div className="font-bold text-[#68d5bb]">{usedRamMb} MiB</div>
              <div className="text-[10px] text-zinc-400">Desktop & Kernel</div>
            </div>
            <div className="bg-[#101820]/70 p-2 rounded border border-[#243e50]/40">
              <div className="text-zinc-400 text-[11px]">Available Free</div>
              <div className="font-bold text-zinc-200">{freeRamMb} MiB</div>
              <div className="text-[10px] text-zinc-400">For user tasks</div>
            </div>
          </div>
        </div>

        {/* zRAM Compression Block */}
        <div className="bg-[#182635] p-4 rounded-lg border border-[#243e50] space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 border-b border-[#243e50] pb-2">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-400" /> zRAM Swap Device (/dev/zram0)
            </span>
            <span className="font-mono text-cyan-400">{zramPercent}% Sizing</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Compressed Swap Pool</span>
              <span className="font-mono font-bold text-cyan-300">{zramCapacityMb} MiB</span>
            </div>
            <div className="h-4 w-full bg-[#101820] rounded-full overflow-hidden border border-[#243e50] p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-[#68d5bb] rounded-full transition-all duration-300"
                style={{ width: `${zramPercent}%` }}
              />
            </div>
          </div>

          <div className="text-[11px] text-zinc-300 bg-[#101820]/70 p-2.5 rounded border border-[#243e50]/40 flex items-center justify-between">
            <div>
              <span className="font-medium text-cyan-300">Algorithm:</span> zstd (fast, ~2.8x ratio)
            </div>
            <div className="text-zinc-400">
              Virtual Swap: ~{Math.round(zramCapacityMb * 2.8)} MiB
            </div>
          </div>
        </div>
      </div>

      {/* EarlyOOM Out-Of-Memory Guard Section */}
      <div className="bg-[#182635] p-5 rounded-lg border border-[#243e50] space-y-3">
        <div className="flex items-center justify-between border-b border-[#243e50] pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#68d5bb]" />
            <span className="font-bold text-sm text-zinc-100">earlyoom Out-Of-Memory Guard</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
              Active (-m 5 -s 5)
            </span>
          </div>

          <button
            onClick={simulateEarlyoomAction}
            disabled={isSimulatingOom}
            className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#243d52] hover:bg-[#2e4d66] text-white font-medium rounded border border-[#375e7d] cursor-pointer transition"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            {isSimulatingOom ? 'Testing...' : 'Simulate Low-RAM Pressure'}
          </button>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Configured in <code className="text-[#68d5bb] font-mono">system/etc/default/earlyoom</code> with triggers at <strong>5% RAM</strong> and <strong>5% swap</strong>. Ordered after <code className="text-cyan-400 font-mono">conake-memory-profile.service</code> and <code className="text-cyan-400 font-mono">zramswap.service</code>. Prevents system freezes on 4GB Chromebooks when heavy apps or tabs open!
        </p>

        {oomLogs.length > 0 && (
          <div className="bg-[#0b1017] p-3 rounded border border-[#1d2d3e] font-mono text-[11px] space-y-1 text-zinc-300">
            {oomLogs.map((log, i) => (
              <div key={i} className={log.includes('recovered') ? 'text-[#68d5bb] font-bold' : log.includes('SIGTERM') ? 'text-amber-400' : 'text-zinc-300'}>
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generated Configuration Files */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#68d5bb]" /> System Configuration Files
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          {/* /run/conake/memory-profile */}
          <div className="bg-[#0e161e] border border-[#203747] rounded-lg p-3 space-y-1">
            <div className="text-zinc-400 text-[11px] border-b border-[#203747] pb-1 font-sans flex items-center justify-between">
              <span>/run/conake/memory-profile</span>
            </div>
            <pre className="text-[#68d5bb] font-bold pt-1">
              {profile}
            </pre>
          </div>

          {/* /etc/default/zramswap */}
          <div className="bg-[#0e161e] border border-[#203747] rounded-lg p-3 space-y-1">
            <div className="text-zinc-400 text-[11px] border-b border-[#203747] pb-1 font-sans flex items-center justify-between">
              <span>/etc/default/zramswap</span>
            </div>
            <pre className="text-zinc-200 pt-1">
              ALGO=zstd{'\n'}
              <span className="text-cyan-400 font-bold">PERCENT={zramPercent}</span>{'\n'}
              PRIORITY=100
            </pre>
          </div>

          {/* /etc/default/earlyoom */}
          <div className="bg-[#0e161e] border border-[#203747] rounded-lg p-3 space-y-1">
            <div className="text-zinc-400 text-[11px] border-b border-[#203747] pb-1 font-sans flex items-center justify-between">
              <span>/etc/default/earlyoom</span>
            </div>
            <pre className="text-zinc-200 pt-1">
              <span className="text-[#68d5bb] font-bold">EARLYOOM_ARGS="-m 5 -s 5"</span>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
