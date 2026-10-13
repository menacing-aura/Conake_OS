import React, { useState } from 'react';
import { Folder, FileText, ChevronRight, HardDrive, ArrowLeft, Terminal, Cpu } from 'lucide-react';
import { useOS } from '../../context/OSContext';

interface VNode {
  name: string;
  type: 'dir' | 'file';
  path: string;
  size?: string;
  content?: string;
  children?: VNode[];
}

export const FileManagerApp: React.FC = () => {
  const { profile, zramPercent, openApp } = useOS();
  const [currentPath, setCurrentPath] = useState<string>('/system');
  const [selectedFile, setSelectedFile] = useState<VNode | null>(null);

  const fileSystem: Record<string, VNode[]> = {
    '/': [
      { name: 'apps', type: 'dir', path: '/apps' },
      { name: 'assets', type: 'dir', path: '/assets' },
      { name: 'boot', type: 'dir', path: '/boot' },
      { name: 'desktop', type: 'dir', path: '/desktop' },
      { name: 'docs', type: 'dir', path: '/docs' },
      { name: 'scripts', type: 'dir', path: '/scripts' },
      { name: 'system', type: 'dir', path: '/system' },
      { name: 'run', type: 'dir', path: '/run' },
      { name: 'README.md', type: 'file', path: '/README.md', size: '1.8 KB', content: `# Conake OS\n\nConake OS v0.1 is a Debian-based live desktop prototype. It uses Debian Live and XFCE rather than a custom kernel, with boot-time RAM profiling, zRAM, a small welcome screen, and a reproducible ISO build workflow.` },
    ],
    '/system': [
      { name: 'usr', type: 'dir', path: '/system/usr' },
      { name: 'etc', type: 'dir', path: '/system/etc' },
      { name: 'conake-memory-profile.service', type: 'file', path: '/system/conake-memory-profile.service', size: '420 B', content: `[Unit]\nDescription=Conake memory profiling and zRAM sizing\nBefore=zramswap.service\n\n[Service]\nType=oneshot\nExecStart=/usr/local/sbin/conake-memory-profile\nRemainAfterExit=yes\n\n[Install]\nWantedBy=basic.target` },
    ],
    '/system/usr': [
      { name: 'local', type: 'dir', path: '/system/usr/local' },
    ],
    '/system/usr/local': [
      { name: 'sbin', type: 'dir', path: '/system/usr/local/sbin' },
    ],
    '/system/usr/local/sbin': [
      { name: 'conake-memory-profile', type: 'file', path: '/system/usr/local/sbin/conake-memory-profile', size: '1.1 KB', content: `#!/bin/sh\nset -eu\n\ntotal_kb=$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo)\ntotal_mb=$((total_kb / 1024))\n\nif [ "$total_mb" -lt 2048 ]; then\n    profile=ultra-light\n    zram_percent=100\nelif [ "$total_mb" -lt 4096 ]; then\n    profile=lightweight\n    zram_percent=75\nelif [ "$total_mb" -lt 8192 ]; then\n    profile=normal\n    zram_percent=50\nelse\n    profile=full\n    zram_percent=25\nfi\n\ninstall -d -m 0755 /run/conake\nprintf '%s\\n' "$profile" > /run/conake/memory-profile` },
    ],
    '/system/etc': [
      { name: 'default', type: 'dir', path: '/system/etc/default' },
      { name: 'lightdm', type: 'dir', path: '/system/etc/lightdm' },
      { name: 'xdg', type: 'dir', path: '/system/etc/xdg' },
    ],
    '/system/etc/default': [
      { name: 'zramswap', type: 'file', path: '/system/etc/default/zramswap', size: '128 B', content: `ALGO=zstd\nPERCENT=${zramPercent}\nPRIORITY=100` },
    ],
    '/apps': [
      { name: 'browser', type: 'dir', path: '/apps/browser' },
      { name: 'store', type: 'dir', path: '/apps/store' },
      { name: 'welcome', type: 'dir', path: '/apps/welcome' },
    ],
    '/apps/welcome': [
      { name: 'conake-welcome.desktop', type: 'file', path: '/apps/welcome/conake-welcome.desktop', size: '210 B', content: `[Desktop Entry]\nType=Application\nName=Conake Welcome\nExec=/usr/local/bin/conake-welcome\nIcon=conake-logo\nCategories=System;` },
      { name: 'conake-welcome.py', type: 'file', path: '/apps/welcome/conake-welcome.py', size: '1.3 KB', content: `#!/usr/bin/python3\nimport tkinter as tk\nfrom pathlib import Path\n\nPROFILE_PATH = Path("/run/conake/memory-profile")\nprofile = PROFILE_PATH.read_text().strip() if PROFILE_PATH.exists() else "detecting"\n\nroot = tk.Tk()\nroot.title("Welcome to Conake OS")\nroot.geometry("520x340")` },
    ],
    '/run': [
      { name: 'conake', type: 'dir', path: '/run/conake' },
    ],
    '/run/conake': [
      { name: 'memory-profile', type: 'file', path: '/run/conake/memory-profile', size: '12 B', content: `${profile}\n` },
    ],
    '/docs': [
      { name: 'architecture.md', type: 'file', path: '/docs/architecture.md', size: '850 B', content: `# v0.1 architecture\n\nConake OS is assembled as a Debian Live system. boot/live-build/ describes the ISO package set, while the build script stages system/, apps/, and assets/ into the live root filesystem.\n\nAt boot, conake-memory-profile.service reads MemTotal and records the selected profile in /run/conake/memory-profile. It sets the zRAM percentage before zramswap.service starts.` },
      { name: 'development.md', type: 'file', path: '/docs/development.md', size: '640 B', content: `# Development workflow\n\nUse ./scripts/build.sh to build the live ISO image.\nUse ./scripts/run.sh to test using QEMU with VNC on port 6080.` },
    ],
  };

  const currentItems = fileSystem[currentPath] || [];

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
  };

  const handleGoUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parent = parts.length === 0 ? '/' : '/' + parts.join('/');
    setCurrentPath(parent);
    setSelectedFile(null);
  };

  return (
    <div className="h-full bg-[#121922] text-[#f4f7f6] flex flex-col font-sans select-none overflow-hidden">
      {/* Path Toolbar */}
      <div className="bg-[#182330] p-2 flex items-center gap-2 border-b border-[#243547] text-xs">
        <button
          onClick={handleGoUp}
          disabled={currentPath === '/'}
          className={`p-1.5 rounded transition ${
            currentPath === '/' ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-300 hover:bg-[#25394d] cursor-pointer'
          }`}
          title="Go to parent directory"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center bg-[#0d141d] px-3 py-1.5 rounded border border-[#233547] text-zinc-300 font-mono text-xs">
          <HardDrive className="w-3.5 h-3.5 text-[#68d5bb] mr-1.5" />
          <span>{currentPath}</span>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-40 bg-[#0e151e] border-r border-[#203142] p-2 space-y-1 text-xs shrink-0 overflow-y-auto">
          <div className="text-[10px] text-zinc-400 font-bold px-2 py-1 uppercase tracking-wider">Locations</div>
          <button
            onClick={() => handleNavigate('/')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition cursor-pointer ${
              currentPath === '/' ? 'bg-[#68d5bb]/20 text-[#68d5bb] font-semibold' : 'text-zinc-300 hover:bg-[#16212e]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" /> Root (/)
          </button>
          <button
            onClick={() => handleNavigate('/system')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition cursor-pointer ${
              currentPath.startsWith('/system') ? 'bg-[#68d5bb]/20 text-[#68d5bb] font-semibold' : 'text-zinc-300 hover:bg-[#16212e]'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-cyan-400" /> /system
          </button>
          <button
            onClick={() => handleNavigate('/apps')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition cursor-pointer ${
              currentPath.startsWith('/apps') ? 'bg-[#68d5bb]/20 text-[#68d5bb] font-semibold' : 'text-zinc-300 hover:bg-[#16212e]'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-emerald-400" /> /apps
          </button>
          <button
            onClick={() => handleNavigate('/run/conake')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition cursor-pointer ${
              currentPath.startsWith('/run') ? 'bg-[#68d5bb]/20 text-[#68d5bb] font-semibold' : 'text-zinc-300 hover:bg-[#16212e]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" /> /run/conake
          </button>
          <button
            onClick={() => handleNavigate('/docs')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition cursor-pointer ${
              currentPath.startsWith('/docs') ? 'bg-[#68d5bb]/20 text-[#68d5bb] font-semibold' : 'text-zinc-300 hover:bg-[#16212e]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" /> /docs
          </button>
        </div>

        {/* Directory Items & File Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#121922]">
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {currentItems.map((item) => (
                <div
                  key={item.name}
                  onClick={() => {
                    if (item.type === 'dir') {
                      handleNavigate(item.path);
                    } else {
                      setSelectedFile(item);
                    }
                  }}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center cursor-pointer transition ${
                    selectedFile?.name === item.name
                      ? 'bg-[#68d5bb]/20 border-[#68d5bb] text-white shadow-sm'
                      : 'bg-[#17222f] border-[#223547] text-zinc-300 hover:bg-[#1f2f40] hover:border-[#2f485e]'
                  }`}
                >
                  {item.type === 'dir' ? (
                    <Folder className="w-8 h-8 text-[#68d5bb] mb-1.5" />
                  ) : (
                    <FileText className="w-8 h-8 text-cyan-400 mb-1.5" />
                  )}
                  <span className="text-xs font-medium truncate max-w-full">{item.name}</span>
                  {item.size && <span className="text-[10px] text-zinc-400 mt-0.5">{item.size}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* File Preview Pane */}
          {selectedFile && selectedFile.content && (
            <div className="w-full md:w-80 bg-[#0d141d] border-t md:border-t-0 md:border-l border-[#203142] p-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-[#203142] text-xs">
                <span className="font-bold text-[#68d5bb] truncate">{selectedFile.name}</span>
                <span className="text-[10px] text-zinc-400">{selectedFile.size}</span>
              </div>
              <pre className="flex-1 overflow-auto text-[11px] font-mono text-zinc-300 bg-[#090e15] p-3 rounded mt-2 select-text border border-[#1b2a3a]">
                {selectedFile.content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
