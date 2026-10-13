import React from 'react';
import { useOS } from '../../context/OSContext';
import { Activity, Cpu, HardDrive, Server } from 'lucide-react';

export const TaskManagerApp: React.FC = () => {
  const { profile, totalMemoryMB, zramPercent, cupsDisabled } = useOS();

  const processes = [
    { pid: 1, user: 'root', cpu: 0.1, memMb: 12, name: 'systemd', state: 'S' },
    { pid: 120, user: 'root', cpu: 0.0, memMb: 4, name: 'conake-memory-profile', state: 'I' },
    { pid: 135, user: 'root', cpu: 0.0, memMb: 6, name: 'zramswap.service', state: 'S' },
    { pid: 480, user: 'conake', cpu: 0.8, memMb: 48, name: 'xfce4-session', state: 'S' },
    { pid: 512, user: 'conake', cpu: 0.4, memMb: 36, name: 'xfwm4', state: 'S' },
    { pid: 520, user: 'conake', cpu: 0.6, memMb: 42, name: 'xfce4-panel', state: 'S' },
    { pid: 610, user: 'conake', cpu: 0.2, memMb: 24, name: 'xfdesktop', state: 'S' },
    { pid: 820, user: 'conake', cpu: 0.1, memMb: 18, name: 'conake-welcome', state: 'S' },
    { pid: 900, user: 'conake', cpu: 1.2, memMb: 85, name: 'firefox-esr', state: 'S' },
    { pid: 1042, user: 'conake', cpu: 0.2, memMb: 14, name: 'xfce4-terminal', state: 'S' },
  ];

  const totalUsedMb = processes.reduce((acc, p) => acc + p.memMb, 0) + (cupsDisabled ? 0 : 32);

  return (
    <div className="h-full bg-[#111720] text-[#f4f7f6] p-4 flex flex-col gap-4 font-mono text-xs select-none overflow-hidden">
      {/* CPU & Memory Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#16212d] p-3 rounded-lg border border-[#213548]">
        <div className="space-y-1">
          <div className="flex justify-between text-zinc-300">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <Cpu className="w-3.5 h-3.5" /> CPU [||||||               ]
            </span>
            <span>4.2%</span>
          </div>
          <div className="flex justify-between text-zinc-400 text-[11px]">
            <span>Tasks: {processes.length} running</span>
            <span>Load: 0.14, 0.08, 0.02</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-zinc-300">
            <span className="flex items-center gap-1.5 font-bold text-[#68d5bb]">
              <HardDrive className="w-3.5 h-3.5" /> Mem [{Math.round((totalUsedMb / totalMemoryMB) * 100)}%]
            </span>
            <span>{totalUsedMb} MiB / {totalMemoryMB} MiB</span>
          </div>
          <div className="flex justify-between text-zinc-400 text-[11px]">
            <span>Swap (zRAM): 0 / {Math.round((totalMemoryMB * zramPercent) / 100)} MiB</span>
            <span className="capitalize text-[#68d5bb] font-semibold">{profile}</span>
          </div>
        </div>
      </div>

      {/* Process Table */}
      <div className="flex-1 bg-[#0d131a] rounded-lg border border-[#1e2d3d] overflow-y-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#15202c] text-zinc-400 sticky top-0 border-b border-[#203243]">
            <tr>
              <th className="p-2">PID</th>
              <th className="p-2">USER</th>
              <th className="p-2">CPU%</th>
              <th className="p-2">MEM (MiB)</th>
              <th className="p-2">STATE</th>
              <th className="p-2">COMMAND</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#172432]">
            {processes.map((proc) => (
              <tr key={proc.pid} className="hover:bg-[#152230] text-zinc-200">
                <td className="p-2 text-zinc-400">{proc.pid}</td>
                <td className="p-2 text-[#68d5bb]">{proc.user}</td>
                <td className="p-2">{proc.cpu.toFixed(1)}</td>
                <td className="p-2 font-bold">{proc.memMb}</td>
                <td className="p-2 text-zinc-400">{proc.state}</td>
                <td className="p-2 font-sans font-medium text-zinc-100">{proc.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
