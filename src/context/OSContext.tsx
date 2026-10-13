import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppWindow, MemoryProfile, WallpaperId, StorePackage } from '../types/os';

interface OSContextType {
  totalMemoryMB: number;
  setTotalMemoryMB: (mb: number) => void;
  profile: MemoryProfile;
  zramPercent: number;
  cupsDisabled: boolean;
  wallpaper: WallpaperId;
  setWallpaper: (wp: WallpaperId) => void;
  windows: AppWindow[];
  activeWindowId: string | null;
  openApp: (appType: string, options?: { title?: string; iconName?: string; params?: Record<string, any> }) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (id: string, pos: { x: number; y: number }) => void;
  updateWindowSize: (id: string, size: { width: number; height: number }) => void;
  isWhiskerOpen: boolean;
  setIsWhiskerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  activeWorkspace: number;
  setActiveWorkspace: (ws: number) => void;
  installedApps: string[];
  installApp: (id: string) => void;
  uninstallApp: (id: string) => void;
  systemPackages: StorePackage[];
  uptimeSeconds: number;
}

const OSContext = createContext<OSContextType | null>(null);

const DEFAULT_STORE_PACKAGES: StorePackage[] = [
  {
    id: 'conake-browser',
    name: 'Conake Browser (Firefox ESR)',
    version: '115.15.0esr',
    summary: 'Browse the web with privacy and performance optimizations',
    description: 'Firefox ESR packaged for Debian with lightweight telemetry-free defaults, efficient memory reclamation, and quick site loading.',
    category: 'Internet',
    icon: 'Globe',
    sizeMb: 142,
    ramUsageMb: 120,
    isInstalled: true,
    executable: 'firefox-esr',
    recommendedFor: ['lightweight', 'normal', 'full'],
  },
  {
    id: 'conake-welcome',
    name: 'Conake Welcome',
    version: '0.1.0',
    summary: 'First-boot welcome dialogue and profile inspection',
    description: 'Minimalist Tkinter-based start dialogue reporting memory mode and live system status.',
    category: 'System',
    icon: 'Sparkles',
    sizeMb: 1,
    ramUsageMb: 18,
    isInstalled: true,
    executable: 'conake-welcome',
    recommendedFor: ['ultra-light', 'lightweight', 'normal', 'full'],
  },
  {
    id: 'memory-profiler',
    name: 'Conake Memory Profiler',
    version: '0.1.0',
    summary: 'Dynamic RAM detection & zRAM compression controller',
    description: 'Real-time diagnostic controller demonstrating how Conake OS measures MemTotal and sets compression policies.',
    category: 'System',
    icon: 'Cpu',
    sizeMb: 2,
    ramUsageMb: 24,
    isInstalled: true,
    executable: 'conake-memory-profile',
    recommendedFor: ['ultra-light', 'lightweight', 'normal', 'full'],
  },
  {
    id: 'conake-store',
    name: 'Conake Software Store',
    version: '44.3',
    summary: 'Discover and install applications from Flathub',
    description: 'GNOME Software integration configured with Flathub remote hook for sandboxed application downloads.',
    category: 'System',
    icon: 'ShoppingBag',
    sizeMb: 85,
    ramUsageMb: 95,
    isInstalled: true,
    executable: 'gnome-software',
    recommendedFor: ['lightweight', 'normal', 'full'],
  },
  {
    id: 'xfce4-terminal',
    name: 'Conake Terminal',
    version: '1.0.4',
    summary: 'Standard XFCE terminal emulator with shell tools',
    description: 'High-speed command terminal supporting zramctl, memory-profile testing, live-build scripts, and Linux utilities.',
    category: 'System',
    icon: 'Terminal',
    sizeMb: 12,
    ramUsageMb: 32,
    isInstalled: true,
    executable: 'xfce4-terminal',
    recommendedFor: ['ultra-light', 'lightweight', 'normal', 'full'],
  },
  {
    id: 'thunar',
    name: 'Thunar File Manager',
    version: '4.18.6',
    summary: 'Fast and lightweight file manager for the XFCE Desktop',
    description: 'Clean file explorer with tab support, custom actions, and easy navigation across the Debian Live root.',
    category: 'Accessories',
    icon: 'Folder',
    sizeMb: 34,
    ramUsageMb: 45,
    isInstalled: true,
    executable: 'thunar',
    recommendedFor: ['ultra-light', 'lightweight', 'normal', 'full'],
  },
  {
    id: 'mousepad',
    name: 'Mousepad Text Editor',
    version: '0.6.1',
    summary: 'Simple and fast text editor for XFCE',
    description: 'Extremely lightweight text editor designed to be responsive even in ultra-light mode with syntax highlighting.',
    category: 'Accessories',
    icon: 'FileText',
    sizeMb: 16,
    ramUsageMb: 22,
    isInstalled: true,
    executable: 'mousepad',
    recommendedFor: ['ultra-light', 'lightweight', 'normal', 'full'],
  },
  {
    id: 'galculator',
    name: 'Galculator',
    version: '2.1.4',
    summary: 'GTK-based scientific calculator',
    description: 'Feature-rich calculator with basic, scientific, and paper modes requiring minimal memory.',
    category: 'Accessories',
    icon: 'Calculator',
    sizeMb: 4,
    ramUsageMb: 14,
    isInstalled: false,
    executable: 'galculator',
    recommendedFor: ['ultra-light', 'lightweight', 'normal', 'full'],
  },
  {
    id: 'htop',
    name: 'HTOP System Monitor',
    version: '3.2.2',
    summary: 'Interactive process viewer and system activity monitor',
    description: 'Real-time CPU bar graphs, swap meters, memory breakdown and thread management.',
    category: 'System',
    icon: 'Activity',
    sizeMb: 5,
    ramUsageMb: 15,
    isInstalled: true,
    executable: 'htop',
    recommendedFor: ['ultra-light', 'lightweight', 'normal', 'full'],
  },
  {
    id: 'iso-builder',
    name: 'Conake ISO Builder & Inspector',
    version: '0.1.0',
    summary: 'Debian live-build automation and image generator',
    description: 'Inspect live-build configs, package hooks, debootstrap stages, and execute reproducible ISO builds.',
    category: 'Development',
    icon: 'Disc',
    sizeMb: 8,
    ramUsageMb: 35,
    isInstalled: true,
    executable: 'build.sh',
    recommendedFor: ['normal', 'full'],
  },
  {
    id: 'ristretto',
    name: 'Ristretto Image Viewer',
    version: '0.13.1',
    summary: 'Fast and responsive image viewer for XFCE',
    description: 'Low-overhead picture viewer with thumbnail bar, wallpaper setting integration, and slideshow capabilities.',
    category: 'Media',
    icon: 'Image',
    sizeMb: 18,
    ramUsageMb: 28,
    isInstalled: false,
    executable: 'ristretto',
    recommendedFor: ['ultra-light', 'lightweight', 'normal', 'full'],
  },
  {
    id: 'vlc',
    name: 'VLC Media Player',
    version: '3.0.20',
    summary: 'Cross-platform multimedia player and framework',
    description: 'Plays most multimedia files as well as DVDs, Audio CDs, VCDs, and various streaming protocols.',
    category: 'Media',
    icon: 'PlaySquare',
    sizeMb: 110,
    ramUsageMb: 85,
    isInstalled: false,
    executable: 'vlc',
    recommendedFor: ['normal', 'full'],
  },
];

export const OSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // RAM default is 4096 MiB (Normal profile)
  const [totalMemoryMB, setTotalMemoryMB] = useState<number>(4096);
  const [wallpaper, setWallpaper] = useState<WallpaperId>('sakura');
  const [isWhiskerOpen, setIsWhiskerOpen] = useState<boolean>(false);
  const [activeWorkspace, setActiveWorkspace] = useState<number>(1);
  const [installedApps, setInstalledApps] = useState<string[]>([
    'conake-browser',
    'conake-welcome',
    'memory-profiler',
    'conake-store',
    'xfce4-terminal',
    'thunar',
    'mousepad',
    'htop',
    'iso-builder',
  ]);
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(142);

  // Derive memory profile exactly as system/usr/local/sbin/conake-memory-profile does
  let profile: MemoryProfile = 'normal';
  let zramPercent = 50;
  let cupsDisabled = false;

  if (totalMemoryMB < 2048) {
    profile = 'ultra-light';
    zramPercent = 100;
    cupsDisabled = true;
  } else if (totalMemoryMB < 4096) {
    profile = 'lightweight';
    zramPercent = 75;
    cupsDisabled = false;
  } else if (totalMemoryMB < 8192) {
    profile = 'normal';
    zramPercent = 50;
    cupsDisabled = false;
  } else {
    profile = 'full';
    zramPercent = 25;
    cupsDisabled = false;
  }

  // Windows state
  const [windows, setWindows] = useState<AppWindow[]>([
    {
      id: 'welcome-initial',
      appType: 'conake-welcome',
      title: 'Welcome to Conake OS',
      iconName: 'Sparkles',
      isMinimized: false,
      isMaximized: false,
      position: { x: 120, y: 70 },
      size: { width: 540, height: 380 },
      zIndex: 10,
    },
  ]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>('welcome-initial');

  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const openApp = (
    appType: string,
    options?: { title?: string; iconName?: string; params?: Record<string, any> }
  ) => {
    // If window already open, focus and unminimize it
    const existing = windows.find((w) => w.appType === appType);
    if (existing) {
      setWindows((prev) =>
        prev.map((w) =>
          w.id === existing.id
            ? { ...w, isMinimized: false, zIndex: Math.max(...prev.map((x) => x.zIndex), 0) + 1 }
            : w
        )
      );
      setActiveWindowId(existing.id);
      setIsWhiskerOpen(false);
      return;
    }

    const defaultDimensions: Record<string, { width: number; height: number; title: string; icon: string }> = {
      'conake-welcome': { width: 540, height: 380, title: 'Welcome to Conake OS', icon: 'Sparkles' },
      'memory-profiler': { width: 780, height: 560, title: 'Conake Memory Profiler', icon: 'Cpu' },
      'conake-browser': { width: 860, height: 580, title: 'Conake Browser', icon: 'Globe' },
      'conake-store': { width: 820, height: 560, title: 'Conake Store', icon: 'ShoppingBag' },
      'xfce4-terminal': { width: 720, height: 480, title: 'Terminal - conake@conake-live:~', icon: 'Terminal' },
      'thunar': { width: 740, height: 500, title: 'File Manager - Thunar', icon: 'Folder' },
      'settings': { width: 680, height: 500, title: 'Settings Manager', icon: 'Settings' },
      'iso-builder': { width: 820, height: 540, title: 'Conake ISO Build & Live Pipeline', icon: 'Disc' },
      'htop': { width: 740, height: 500, title: 'Task Manager (Htop)', icon: 'Activity' },
      'mousepad': { width: 640, height: 460, title: 'Mousepad - Untitled Document', icon: 'FileText' },
      'galculator': { width: 340, height: 440, title: 'Galculator', icon: 'Calculator' },
      'docs': { width: 780, height: 560, title: 'Conake OS Documentation', icon: 'BookOpen' },
    };

    const config = defaultDimensions[appType] || {
      width: 700,
      height: 500,
      title: options?.title || appType,
      icon: options?.iconName || 'AppWindow',
    };

    const newZ = Math.max(...windows.map((w) => w.zIndex), 0) + 1;
    // Calculate staggered position
    const offset = (windows.length % 6) * 30;
    const x = Math.min(window.innerWidth - config.width - 40, Math.max(40, 80 + offset));
    const y = Math.min(window.innerHeight - config.height - 80, Math.max(40, 50 + offset));

    const newWindow: AppWindow = {
      id: `${appType}-${Date.now()}`,
      appType,
      title: options?.title || config.title,
      iconName: options?.iconName || config.icon,
      isMinimized: false,
      isMaximized: false,
      position: { x, y },
      size: { width: config.width, height: config.height },
      zIndex: newZ,
      params: options?.params,
    };

    setWindows((prev) => [...prev, newWindow]);
    setActiveWindowId(newWindow.id);
    setIsWhiskerOpen(false);
  };

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    if (activeWindowId === id) {
      const remaining = windows.filter((w) => w.id !== id);
      if (remaining.length > 0) {
        const topWindow = remaining.reduce((max, w) => (w.zIndex > max.zIndex ? w : max), remaining[0]);
        setActiveWindowId(topWindow.id);
      } else {
        setActiveWindowId(null);
      }
    }
  };

  const minimizeWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === id) {
      const unminimized = windows.filter((w) => w.id !== id && !w.isMinimized);
      if (unminimized.length > 0) {
        const top = unminimized.reduce((max, w) => (w.zIndex > max.zIndex ? w : max), unminimized[0]);
        setActiveWindowId(top.id);
      } else {
        setActiveWindowId(null);
      }
    }
  };

  const toggleMaximizeWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  };

  const focusWindow = (id: string) => {
    setWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 0);
      return prev.map((w) =>
        w.id === id ? { ...w, zIndex: maxZ + 1, isMinimized: false } : w
      );
    });
    setActiveWindowId(id);
  };

  const updateWindowPosition = (id: string, pos: { x: number; y: number }) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, position: pos } : w))
    );
  };

  const updateWindowSize = (id: string, size: { width: number; height: number }) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, size } : w))
    );
  };

  const installApp = (id: string) => {
    if (!installedApps.includes(id)) {
      setInstalledApps((prev) => [...prev, id]);
    }
  };

  const uninstallApp = (id: string) => {
    setInstalledApps((prev) => prev.filter((a) => a !== id));
  };

  return (
    <OSContext.Provider
      value={{
        totalMemoryMB,
        setTotalMemoryMB,
        profile,
        zramPercent,
        cupsDisabled,
        wallpaper,
        setWallpaper,
        windows,
        activeWindowId,
        openApp,
        closeWindow,
        minimizeWindow,
        toggleMaximizeWindow,
        focusWindow,
        updateWindowPosition,
        updateWindowSize,
        isWhiskerOpen,
        setIsWhiskerOpen,
        activeWorkspace,
        setActiveWorkspace,
        installedApps,
        installApp,
        uninstallApp,
        systemPackages: DEFAULT_STORE_PACKAGES.map((pkg) => ({
          ...pkg,
          isInstalled: installedApps.includes(pkg.id),
        })),
        uptimeSeconds,
      }}
    >
      {children}
    </OSContext.Provider>
  );
};

export const useOS = (): OSContextType => {
  const context = useContext(OSContext);
  if (!context) {
    throw new Error('useOS must be used within an OSProvider');
  }
  return context;
};
