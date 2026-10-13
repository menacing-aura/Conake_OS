import React, { useState } from 'react';
import { useOS } from '../../context/OSContext';
import {
  Usb,
  Laptop,
  CheckCircle2,
  Download,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Disc,
  Terminal,
  HelpCircle
} from 'lucide-react';

export const UsbGuideApp: React.FC = () => {
  const [targetDevice, setTargetDevice] = useState<'chromebook' | 'pc'>('chromebook');
  const [selectedMethod, setSelectedMethod] = useState<'ventoy' | 'etcher' | 'chrome-recovery'>('ventoy');

  return (
    <div className="h-full bg-[#121922] text-[#f4f7f6] p-6 flex flex-col gap-5 overflow-y-auto font-sans select-none">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#213547] gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Usb className="w-5 h-5 text-[#68d5bb]" /> Live USB Creation & Chromebook Boot Guide
          </h1>
          <p className="text-xs text-zinc-400">
            Step-by-step instructions for flashing Conake OS and booting on 4GB Chromebooks or PCs
          </p>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center bg-[#0d141d] p-1 rounded-lg border border-[#213547]">
          <button
            onClick={() => setTargetDevice('chromebook')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
              targetDevice === 'chromebook'
                ? 'bg-[#68d5bb] text-[#101820]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" /> 4GB Chromebook
          </button>
          <button
            onClick={() => setTargetDevice('pc')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
              targetDevice === 'pc'
                ? 'bg-[#68d5bb] text-[#101820]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Disc className="w-3.5 h-3.5" /> Standard PC / Laptop
          </button>
        </div>
      </div>

      {/* Step 1: Download ISO from GitHub */}
      <div className="bg-[#182330] p-4 rounded-lg border border-[#233547] space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <span className="w-5 h-5 rounded-full bg-[#68d5bb] text-[#101820] flex items-center justify-center text-xs font-bold">1</span>
          <span>Get the Bootable ISO (Without Local Compiling)</span>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Because compiling a full Debian Live ISO requires 8GB+ RAM and root container privileges, let GitHub's free cloud servers build it for you:
        </p>
        <div className="bg-[#0f1620] p-3 rounded border border-[#213548] text-xs font-mono space-y-1">
          <div className="text-zinc-300">1. Go to repository: <strong className="text-[#68d5bb]">GitHub &rarr; Actions tab</strong></div>
          <div className="text-zinc-300">2. Select <strong className="text-cyan-400">"Build Conake OS ISO"</strong> &rarr; Click <strong className="text-white">Run workflow</strong></div>
          <div className="text-zinc-300">3. Download <strong className="text-emerald-400">conake-os-iso</strong> from the Artifacts list (creates <code className="text-[#68d5bb]">conake-os-v0.1-amd64.iso</code>)</div>
        </div>
      </div>

      {/* Step 2: Choose Flashing Method */}
      <div className="bg-[#182330] p-4 rounded-lg border border-[#233547] space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <span className="w-5 h-5 rounded-full bg-[#68d5bb] text-[#101820] flex items-center justify-center text-xs font-bold">2</span>
          <span>Prepare Your USB Drive (Recommended Tools)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedMethod('ventoy')}
            className={`p-3 rounded-lg border text-left cursor-pointer transition ${
              selectedMethod === 'ventoy'
                ? 'bg-[#68d5bb]/20 border-[#68d5bb] text-white'
                : 'bg-[#101721] border-[#24374b] text-zinc-300 hover:bg-[#16212e]'
            }`}
          >
            <div className="font-bold text-xs flex items-center justify-between">
              <span>Ventoy (Best)</span>
              {selectedMethod === 'ventoy' && <CheckCircle2 className="w-3.5 h-3.5 text-[#68d5bb]" />}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              Format USB once, then just drag & drop ISO files directly!
            </div>
          </button>

          <button
            onClick={() => setSelectedMethod('chrome-recovery')}
            className={`p-3 rounded-lg border text-left cursor-pointer transition ${
              selectedMethod === 'chrome-recovery'
                ? 'bg-[#68d5bb]/20 border-[#68d5bb] text-white'
                : 'bg-[#101721] border-[#24374b] text-zinc-300 hover:bg-[#16212e]'
            }`}
          >
            <div className="font-bold text-xs flex items-center justify-between">
              <span>Chromebook Recovery App</span>
              {selectedMethod === 'chrome-recovery' && <CheckCircle2 className="w-3.5 h-3.5 text-[#68d5bb]" />}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              Official Chrome extension; rename ISO to .bin to flash directly on ChromeOS.
            </div>
          </button>

          <button
            onClick={() => setSelectedMethod('etcher')}
            className={`p-3 rounded-lg border text-left cursor-pointer transition ${
              selectedMethod === 'etcher'
                ? 'bg-[#68d5bb]/20 border-[#68d5bb] text-white'
                : 'bg-[#101721] border-[#24374b] text-zinc-300 hover:bg-[#16212e]'
            }`}
          >
            <div className="font-bold text-xs flex items-center justify-between">
              <span>BalenaEtcher / Rufus</span>
              {selectedMethod === 'etcher' && <CheckCircle2 className="w-3.5 h-3.5 text-[#68d5bb]" />}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              Classic 1-click write tool for Windows, macOS, and Linux.
            </div>
          </button>
        </div>

        {/* Method details */}
        {selectedMethod === 'chrome-recovery' && (
          <div className="bg-[#0f1621] p-3 rounded border border-[#24374b] text-xs text-zinc-300 space-y-2">
            <div className="font-semibold text-cyan-300">How to flash on a Chromebook without extra software:</div>
            <ol className="list-decimal pl-5 space-y-1 text-[11px] leading-relaxed">
              <li>Open Chrome and install the free <strong>Chromebook Recovery Utility</strong> extension.</li>
              <li>Rename your downloaded <code className="text-[#68d5bb]">conake-os-v0.1-amd64.iso</code> to <code className="text-[#68d5bb]">conake-os.bin</code>.</li>
              <li>Launch Recovery Utility &rarr; Click the Gear icon (&ldquo;Use local image&rdquo;) &rarr; Select <code className="text-[#68d5bb]">conake-os.bin</code>.</li>
              <li>Select your USB drive (at least 4 GB) and click <strong>Create now</strong>.</li>
            </ol>
          </div>
        )}

        {selectedMethod === 'ventoy' && (
          <div className="bg-[#0f1621] p-3 rounded border border-[#24374b] text-xs text-zinc-300 space-y-2">
            <div className="font-semibold text-[#68d5bb]">Why Ventoy is the gold standard for testing distros:</div>
            <p className="text-[11px] leading-relaxed">
              Install Ventoy onto any USB stick. It turns the USB into a bootable multi-boot drive. You can simply drag <code className="text-[#68d5bb]">conake-os-v0.1-amd64.iso</code> into the drive in your file manager — no re-flashing or formatting ever needed!
            </p>
          </div>
        )}
      </div>

      {/* Step 3: Booting on the target hardware */}
      <div className="bg-[#182330] p-4 rounded-lg border border-[#233547] space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <span className="w-5 h-5 rounded-full bg-[#68d5bb] text-[#101820] flex items-center justify-center text-xs font-bold">3</span>
          <span>{targetDevice === 'chromebook' ? 'Booting on your 4GB Chromebook' : 'Booting on your PC / Laptop'}</span>
        </div>

        {targetDevice === 'chromebook' ? (
          <div className="space-y-3 text-xs text-zinc-300">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Chromebook Booting Requirements:
              </div>
              <p className="text-[11px] leading-relaxed">
                Chromebooks ship with Google ChromeOS verified boot firmware by default. To boot a standard Linux Live USB, you typically need to enable <strong>Developer Mode</strong> and install <strong>MrChromebox UEFI Full ROM or RW_LEGACY firmware</strong> (see mrchromebox.tech).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-[#0f1620] p-3 rounded border border-[#203446]">
                <div className="font-bold text-[#68d5bb] text-xs">Method A: RW_LEGACY (Dual Boot)</div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Keeps ChromeOS intact. Press <kbd className="bg-black/50 px-1 py-0.5 rounded text-white">Ctrl + L</kbd> at the white developer screen to boot directly from your Conake USB!
                </div>
              </div>

              <div className="bg-[#0f1620] p-3 rounded border border-[#203446]">
                <div className="font-bold text-cyan-400 text-xs">Method B: Full UEFI ROM</div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Turns your Chromebook into a standard laptop PC. Press <kbd className="bg-black/50 px-1 py-0.5 rounded text-white">Esc</kbd> or <kbd className="bg-black/50 px-1 py-0.5 rounded text-white">F12</kbd> on startup to open the boot menu.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-zinc-300 space-y-2">
            <p className="text-[11px]">
              Insert the USB drive into your powered-off PC, turn it on, and immediately tap your boot menu key:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="bg-[#0f1620] p-2 rounded border border-[#203446]"><strong className="text-[#68d5bb]">Dell / Lenovo</strong>: F12</div>
              <div className="bg-[#0f1620] p-2 rounded border border-[#203446]"><strong className="text-cyan-400">HP</strong>: F9 or Esc</div>
              <div className="bg-[#0f1620] p-2 rounded border border-[#203446]"><strong className="text-amber-400">Asus / Acer</strong>: F8 or F12</div>
              <div className="bg-[#0f1620] p-2 rounded border border-[#203446]"><strong className="text-purple-400">Mac</strong>: Hold Option/Alt</div>
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div className="p-3 bg-[#101820] border border-[#233547] rounded-lg text-xs flex items-center justify-between text-zinc-400">
        <span className="flex items-center gap-1.5 text-zinc-300">
          <ShieldCheck className="w-4 h-4 text-[#68d5bb]" />
          <strong>100% Safe Live Trial:</strong> Conake OS runs entirely in RAM. Your internal hard drive / ChromeOS partition is not touched unless you explicitly install!
        </span>
      </div>
    </div>
  );
};
