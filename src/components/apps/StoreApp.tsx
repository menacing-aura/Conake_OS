import React, { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { ShoppingBag, Check, Download, AlertTriangle, Search, Filter } from 'lucide-react';
import { StorePackage } from '../../types/os';

export const StoreApp: React.FC = () => {
  const { systemPackages, installApp, uninstallApp, openApp, profile } = useOS();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['All', 'System', 'Accessories', 'Internet', 'Development', 'Media'];

  const filteredPackages = systemPackages.filter((pkg) => {
    const matchesCategory = selectedCategory === 'All' || pkg.category === selectedCategory;
    const matchesSearch =
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-full bg-[#131b24] text-[#f4f7f6] flex flex-col font-sans select-none overflow-hidden">
      {/* Header Bar */}
      <div className="bg-[#17222e] px-6 py-4 border-b border-[#233546] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#68d5bb]/15 rounded-lg border border-[#68d5bb]/30">
            <ShoppingBag className="w-5 h-5 text-[#68d5bb]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Conake Software Store</h1>
            <p className="text-xs text-zinc-400">GNOME Software & Flathub catalog integration</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search software..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e161f] border border-[#25394b] rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#68d5bb]"
          />
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-44 bg-[#0f1620] border-r border-[#203141] p-3 space-y-1 shrink-0 overflow-y-auto">
          <div className="text-[10px] uppercase font-bold text-zinc-400 px-3 py-1 tracking-wider">
            Categories
          </div>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition cursor-pointer flex items-center justify-between ${
                selectedCategory === cat
                  ? 'bg-[#68d5bb]/20 text-[#68d5bb] font-semibold border border-[#68d5bb]/30'
                  : 'text-zinc-300 hover:bg-[#16212e]'
              }`}
            >
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Package Grid */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[#131b24]">
          <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
            <span>Showing {filteredPackages.length} applications</span>
            <span className="text-[11px] text-zinc-400">
              Current RAM mode: <strong className="text-[#68d5bb] capitalize">{profile}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPackages.map((pkg) => {
              const isRecommended = pkg.recommendedFor.includes(profile);

              return (
                <div
                  key={pkg.id}
                  className="bg-[#182330] p-4 rounded-lg border border-[#233547] flex flex-col justify-between gap-3 hover:border-[#2f485e] transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-zinc-100">{pkg.name}</h3>
                        <span className="text-[10px] text-zinc-400 font-mono">v{pkg.version} • {pkg.category}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0f1620] border border-[#25394b] text-zinc-300">
                        {pkg.sizeMb} MB
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-snug">{pkg.summary}</p>

                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      <span className="text-zinc-400">RAM: ~{pkg.ramUsageMb} MB</span>
                      {!isRecommended && (
                        <span className="flex items-center gap-1 text-amber-400 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> Heavy for {profile}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#203141]">
                    <span className="text-[10px] text-zinc-400 font-mono">{pkg.executable}</span>
                    <div className="flex items-center gap-2">
                      {pkg.isInstalled ? (
                        <>
                          <button
                            onClick={() => openApp(pkg.id, { title: pkg.name })}
                            className="px-2.5 py-1 text-xs bg-[#68d5bb] hover:bg-[#8ce4d0] text-[#101820] font-semibold rounded cursor-pointer transition"
                          >
                            Launch
                          </button>
                          {pkg.id !== 'conake-welcome' && pkg.id !== 'memory-profiler' && (
                            <button
                              onClick={() => uninstallApp(pkg.id)}
                              className="px-2 py-1 text-[11px] bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded cursor-pointer transition"
                            >
                              Remove
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => installApp(pkg.id)}
                          className="flex items-center gap-1 px-3 py-1 text-xs bg-[#22394c] hover:bg-[#2c4a63] text-zinc-100 font-medium rounded border border-[#32526e] cursor-pointer transition"
                        >
                          <Download className="w-3 h-3" /> Install
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
