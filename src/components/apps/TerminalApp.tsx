import React, { useState, useRef, useEffect } from 'react';
import { useOS } from '../../context/OSContext';

interface TerminalLine {
  id: number;
  text: string;
  type: 'input' | 'output' | 'error' | 'success';
}

export const TerminalApp: React.FC = () => {
  const { profile, zramPercent, totalMemoryMB, cupsDisabled, openApp } = useOS();
  const [history, setHistory] = useState<TerminalLine[]>([
    { id: 1, text: 'Linux conake-live 6.1.0-28-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.119-1 x86_64', type: 'output' },
    { id: 2, text: `Conake OS v0.1 live session initialized. Memory profile: ${profile} (${totalMemoryMB} MiB RAM).`, type: 'success' },
    { id: 3, text: 'Type "help" to see available Conake system commands.', type: 'output' },
  ]);
  const [input, setInput] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;

    const newHistory: TerminalLine[] = [
      ...history,
      { id: Date.now(), text: `conake@conake-live:~$ ${cmd}`, type: 'input' },
    ];

    const args = cmd.split(' ');
    const mainCmd = args[0].toLowerCase();

    switch (mainCmd) {
      case 'help':
        newHistory.push({
          id: Date.now() + 1,
          text: `Available commands:
  conake-memory-profile  Run memory detection script and set zRAM percentage
  cat /run/conake/memory-profile   Inspect active runtime memory profile
  cat /etc/default/zramswap        Inspect zramswap service config
  free -m                          Display memory and swap statistics in MiB
  zramctl                          Show zRAM swap device status and compression
  neofetch / conake-fetch          Display system info & Conake ASCII logo
  uname -a                         Kernel and architecture information
  conake-welcome                   Launch Conake Welcome dialog
  ls [path]                        List directory contents
  ps aux                           List running processes
  clear                            Clear terminal screen`,
          type: 'output',
        });
        break;

      case 'conake-memory-profile':
      case '/system/usr/local/sbin/conake-memory-profile':
        newHistory.push({
          id: Date.now() + 1,
          text: `Detecting MemTotal from /proc/meminfo...
MemTotal: ${totalMemoryMB * 1024} kB (${totalMemoryMB} MiB)
Profile selected: ${profile}
zRAM target: ${zramPercent}%
Updating /etc/default/zramswap: PERCENT=${zramPercent}
${cupsDisabled ? 'Disabling optional print services (cups.service)...' : 'Print services active.'}
Conake memory profile: ${profile} (${totalMemoryMB} MiB RAM), zRAM: ${zramPercent}%`,
          type: 'success',
        });
        break;

      case 'cat':
        const target = args[1];
        if (target === '/run/conake/memory-profile') {
          newHistory.push({ id: Date.now() + 1, text: profile, type: 'output' });
        } else if (target === '/etc/default/zramswap') {
          newHistory.push({
            id: Date.now() + 1,
            text: `# /etc/default/zramswap - Conake OS policy\nALGO=zstd\nPERCENT=${zramPercent}\nPRIORITY=100`,
            type: 'output',
          });
        } else if (target === '/etc/default/earlyoom') {
          newHistory.push({
            id: Date.now() + 1,
            text: `EARLYOOM_ARGS="-m 5 -s 5"`,
            type: 'output',
          });
        } else if (target === '/etc/systemd/system/earlyoom.service.d/conake.conf') {
          newHistory.push({
            id: Date.now() + 1,
            text: `[Unit]\nAfter=conake-memory-profile.service zramswap.service`,
            type: 'output',
          });
        } else if (target === '/etc/issue') {
          newHistory.push({ id: Date.now() + 1, text: 'Conake OS v0.1 (Debian 12 Bookworm) \\n \\l', type: 'output' });
        } else {
          newHistory.push({ id: Date.now() + 1, text: `cat: ${target || ''}: No such file or directory`, type: 'error' });
        }
        break;

      case 'free':
        const used = Math.round(totalMemoryMB * 0.32);
        const free = totalMemoryMB - used;
        const zramSize = Math.round((totalMemoryMB * zramPercent) / 100);
        newHistory.push({
          id: Date.now() + 1,
          text: `               total        used        free      shared  buff/cache   available
Mem:            ${totalMemoryMB}         ${used}        ${free}          24         180        ${free + 120}
Swap:           ${zramSize}           0        ${zramSize}`,
          type: 'output',
        });
        break;

      case 'zramctl':
        const zSize = Math.round((totalMemoryMB * zramPercent) / 100);
        newHistory.push({
          id: Date.now() + 1,
          text: `NAME       ALGORITHM DISKSIZE  DATA  COMPR  TOTAL STREAMS MOUNTPOINT
/dev/zram0 zstd         ${zSize}M    0B     0B     4K       4 [SWAP]`,
          type: 'output',
        });
        break;

      case 'neofetch':
      case 'conake-fetch':
        newHistory.push({
          id: Date.now() + 1,
          text: `        /\\          conake@conake-live
       /  \\         ------------------
      / /\\ \\        OS: Conake OS v0.1 amd64 (Debian 12 live)
     / /  \\ \\       Host: QEMU / Hardware Live Environment
    / /____\\ \\      Kernel: 6.1.0-28-amd64
   /_/      \\_\\     Uptime: 24 mins
                    Packages: 842 (dpkg), 1 (flatpak)
                    Shell: bash 5.2.15
                    Resolution: 1920x1080
                    DE: XFCE 4.18
                    WM: Xfwm4
                    Theme: Arc-Dark [GTK2/3]
                    Icons: Papirus-Dark [GTK2/3]
                    Terminal: xfce4-terminal
                    CPU: x86_64 Virtual CPU (4) @ 2.400GHz
                    Memory: ${Math.round(totalMemoryMB * 0.32)}MiB / ${totalMemoryMB}MiB (${profile})
                    zRAM: ${zramPercent}% compressed swap (zstd)`,
          type: 'output',
        });
        break;

      case 'uname':
        newHistory.push({
          id: Date.now() + 1,
          text: 'Linux conake-live 6.1.0-28-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.119-1 x86_64 GNU/Linux',
          type: 'output',
        });
        break;

      case 'conake-welcome':
        openApp('conake-welcome');
        newHistory.push({ id: Date.now() + 1, text: 'Opening conake-welcome dialog...', type: 'output' });
        break;

      case 'ls':
        newHistory.push({
          id: Date.now() + 1,
          text: 'apps/  assets/  boot/  desktop/  docs/  installer/  scripts/  system/  dist/',
          type: 'output',
        });
        break;

      case 'ps':
        newHistory.push({
          id: Date.now() + 1,
          text: `PID TTY          TIME CMD
  1 ?        00:00:01 systemd
184 ?        00:00:00 conake-memory-profile
201 ?        00:00:00 zramswap
452 ?        00:00:02 xfce4-session
512 ?        00:00:01 xfwm4
520 ?        00:00:01 xfce4-panel
890 pts/0    00:00:00 xfce4-terminal
914 pts/0    00:00:00 bash`,
          type: 'output',
        });
        break;

      case 'clear':
        setHistory([]);
        setInput('');
        return;

      default:
        newHistory.push({
          id: Date.now() + 1,
          text: `bash: ${mainCmd}: command not found. Type "help" for valid commands.`,
          type: 'error',
        });
    }

    setHistory(newHistory);
    setInput('');
  };

  return (
    <div className="h-full bg-[#10141b] text-zinc-100 p-4 font-mono text-xs flex flex-col overflow-hidden select-text">
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {history.map((line) => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap leading-relaxed ${
              line.type === 'input'
                ? 'text-[#68d5bb] font-semibold'
                : line.type === 'error'
                ? 'text-rose-400'
                : line.type === 'success'
                ? 'text-[#68d5bb]'
                : 'text-zinc-300'
            }`}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <form onSubmit={handleCommand} className="flex items-center gap-1.5 pt-2 border-t border-[#1e2a38]">
        <span className="text-[#68d5bb] font-semibold shrink-0">conake@conake-live:~$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          className="flex-1 bg-transparent border-none outline-none text-zinc-100 font-mono text-xs caret-[#68d5bb]"
          placeholder="type a command..."
        />
      </form>
    </div>
  );
};
