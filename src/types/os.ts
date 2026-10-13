export type MemoryProfile = 'ultra-light' | 'lightweight' | 'normal' | 'full';

export type WallpaperId = 'sakura' | 'moonlit' | 'minimalist';

export interface AppWindow {
  id: string;
  appType: string;
  title: string;
  iconName: string;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  params?: Record<string, any>;
}

export interface StorePackage {
  id: string;
  name: string;
  version: string;
  summary: string;
  description: string;
  category: 'Accessories' | 'Internet' | 'System' | 'Development' | 'Media';
  icon: string;
  sizeMb: number;
  ramUsageMb: number;
  isInstalled: boolean;
  executable: string;
  recommendedFor: MemoryProfile[];
}

export interface SystemProcess {
  pid: number;
  user: string;
  name: string;
  command: string;
  cpu: number;
  memMb: number;
  status: 'running' | 'sleeping' | 'idle';
}
