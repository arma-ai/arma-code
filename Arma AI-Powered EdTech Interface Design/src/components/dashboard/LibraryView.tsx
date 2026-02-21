import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Grid, List, Plus, Filter, MoreHorizontal, FileText, Youtube, Link as LinkIcon, Download, Trash2, Archive, Folder, Check, Loader2 } from 'lucide-react';
import { useMaterials, useDeleteMaterial } from '../../hooks/useApi';
import type { Material } from '../../types/api';
import { toast } from 'sonner';

interface LibraryViewProps {
  onProjectClick: (id: string) => void;
  onUpload: () => void;
}

export function LibraryView({ onProjectClick, onUpload }: LibraryViewProps) {
  const { materials, loading, error, refetch } = useMaterials();
  const { deleteMaterial, deleting } = useDeleteMaterial();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Filter Logic
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesTab = true;
    if (activeTab === 'PDF') matchesTab = m.type === 'pdf';
    if (activeTab === 'YouTube') matchesTab = m.type === 'youtube';
    if (activeTab === 'Processing') matchesTab = m.processing_status === 'processing' || m.processing_status === 'queued';
    if (activeTab === 'Completed') matchesTab = m.processing_status === 'completed';

    return matchesSearch && matchesTab;
  });

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    try {
      await Promise.all(selectedItems.map(id => deleteMaterial(id)));
      toast.success(`Deleted ${selectedItems.length} materials`);
      setSelectedItems([]);
      refetch();
    } catch (err) {
      toast.error('Failed to delete materials');
    }
  };

  const handleBulkAction = (action: string) => {
    if (action === 'Delete') {
      handleBulkDelete();
    } else {
      toast.success(`${action} ${selectedItems.length} items`);
      setSelectedItems([]);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0C0C0F] relative">

      {/* HEADER */}
      <div className="flex flex-col gap-6 p-8 pb-4">
         <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Library</h1>
              <p className="text-white/40">Manage your materials and generated outputs.</p>
            </div>
            <button
              onClick={onUpload}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-sm font-bold hover:bg-white/90 transition-colors"
            >
              <Plus size={16} />
              <span>Add Material</span>
            </button>
         </div>

         <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white/60 transition-colors" />
               <input
                 type="text"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Search materials..."
                 className="w-full bg-[#1A1A1E] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-primary/30 focus:outline-none transition-colors"
               />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
               <div className="flex bg-[#1A1A1E] p-1 rounded-lg border border-white/5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                  >
                    <List size={16} />
                  </button>
               </div>
               <button
                 onClick={refetch}
                 className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1A1A1E] border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors text-xs font-medium"
               >
                  <span>Refresh</span>
               </button>
            </div>
         </div>

         {/* Tabs */}
         <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-white/5">
            {['All', 'PDF', 'YouTube', 'Processing', 'Completed'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-primary bg-primary/10 border border-primary/20'
                    : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
         </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
         {selectedItems.length > 0 && (
           <motion.div
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="sticky top-0 z-20 mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between backdrop-blur-md"
           >
              <span className="text-sm font-medium text-primary ml-2">{selectedItems.length} selected</span>
              <div className="flex items-center gap-2">
                 <button onClick={() => handleBulkAction('Archived')} className="p-2 hover:bg-primary/20 rounded-lg text-primary/80 hover:text-primary transition-colors" title="Archive"><Archive size={16} /></button>
                 <button onClick={() => handleBulkAction('Exported')} className="p-2 hover:bg-primary/20 rounded-lg text-primary/80 hover:text-primary transition-colors" title="Export"><Download size={16} /></button>
                 <button
                   onClick={() => handleBulkAction('Delete')}
                   disabled={deleting}
                   className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                   title="Delete"
                 >
                   {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                 </button>
                 <button onClick={() => setSelectedItems([])} className="px-3 py-1.5 ml-2 text-xs font-medium text-primary hover:bg-primary/20 rounded-lg">Cancel</button>
              </div>
           </motion.div>
         )}

         {loading ? (
           <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
           </div>
         ) : filteredMaterials.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                 <Filter className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-lg font-medium text-white/60 mb-2">No materials found</h3>
              <p className="text-sm text-white/30 mb-6">Try adjusting your filters or upload new content.</p>
              <div className="flex gap-3">
                 <button onClick={() => {setSearchQuery(''); setActiveTab('All');}} className="px-4 py-2 bg-white/5 text-white border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">Clear Filters</button>
                 <button onClick={onUpload} className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">Upload Material</button>
              </div>
           </div>
         ) : viewMode === 'grid' ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMaterials.map(material => (
                <GridCard
                  key={material.id}
                  material={material}
                  onClick={() => onProjectClick(material.id)}
                  selected={selectedItems.includes(material.id)}
                  onSelect={() => toggleSelection(material.id)}
                />
              ))}
           </div>
         ) : (
           <div className="space-y-1">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2 text-xs font-medium text-white/30 uppercase tracking-wider">
                 <div className="w-6"></div>
                 <div>Name</div>
                 <div>Type</div>
                 <div>Created</div>
                 <div>Status</div>
              </div>
              {filteredMaterials.map(material => (
                <ListRow
                  key={material.id}
                  material={material}
                  onClick={() => onProjectClick(material.id)}
                  selected={selectedItems.includes(material.id)}
                  onSelect={() => toggleSelection(material.id)}
                />
              ))}
           </div>
         )}
      </div>
    </div>
  );
}

function GridCard({ material, onClick, selected, onSelect }: { material: Material, onClick: () => void, selected: boolean, onSelect: () => void }) {
  const getTypeIcon = () => {
    if (material.type === 'pdf') return <FileText size={20} />;
    if (material.type === 'youtube') return <Youtube size={20} />;
    return <LinkIcon size={20} />;
  };

  const getTypeColor = () => {
    if (material.type === 'pdf') return 'bg-blue-500/10 text-blue-400';
    if (material.type === 'youtube') return 'bg-red-500/10 text-red-400';
    return 'bg-purple-500/10 text-purple-400';
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`group relative p-5 rounded-2xl border transition-all cursor-pointer ${
        selected
          ? 'bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(255,138,61,0.1)]'
          : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 hover:shadow-lg'
      }`}
      onClick={onClick}
    >
      <div className="absolute top-4 right-4 z-10" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
         <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selected ? 'bg-primary border-primary text-black' : 'border-white/20 bg-black/20 text-transparent hover:border-white/40'}`}>
           <Check size={12} />
         </div>
      </div>

      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/5 mb-4 ${getTypeColor()}`}>
         {getTypeIcon()}
      </div>

      <h3 className="text-base font-medium text-white/90 mb-1 line-clamp-1 group-hover:text-white transition-colors">{material.title}</h3>
      <p className="text-xs text-white/40 mb-4">
        {material.type.toUpperCase()} • {new Date(material.created_at).toLocaleDateString()}
      </p>

      {material.processing_status === 'processing' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
            <span>Processing</span>
            <span>{material.processing_progress}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${material.processing_progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
         <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
           material.processing_status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
           material.processing_status === 'processing' || material.processing_status === 'queued' ? 'bg-amber-500/10 text-amber-500' :
           'bg-red-500/10 text-red-500'
         }`}>
           {material.processing_status}
         </span>
      </div>

      {/* Metallic Hover Glow */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}

function ListRow({ material, onClick, selected, onSelect }: { material: Material, onClick: () => void, selected: boolean, onSelect: () => void }) {
  const getTypeIcon = () => {
    if (material.type === 'pdf') return <FileText size={16} />;
    if (material.type === 'youtube') return <Youtube size={16} />;
    return <LinkIcon size={16} />;
  };

  const getTypeColor = () => {
    if (material.type === 'pdf') return 'text-blue-400';
    if (material.type === 'youtube') return 'text-red-400';
    return 'text-purple-400';
  };

  return (
    <div
      className={`group grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
        selected
          ? 'bg-primary/5 border-primary/20'
          : 'bg-transparent border-transparent hover:bg-white/[0.02] border-b-white/[0.02]'
      }`}
      onClick={onClick}
    >
       <div onClick={(e) => { e.stopPropagation(); onSelect(); }}>
         <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected ? 'bg-primary border-primary text-black' : 'border-white/20 text-transparent hover:border-white/40'}`}>
           <Check size={10} />
         </div>
       </div>

       <div className="flex items-center gap-3 min-w-0">
          <div className={`p-1.5 rounded flex items-center justify-center ${getTypeColor()}`}>
            {getTypeIcon()}
          </div>
          <span className="text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">{material.title}</span>
       </div>

       <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/40 uppercase">{material.type}</span>

       <span className="text-xs text-white/30">{new Date(material.created_at).toLocaleDateString()}</span>

       <div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
             material.processing_status === 'completed' ? 'bg-emerald-500/5 text-emerald-500' :
             material.processing_status === 'processing' || material.processing_status === 'queued' ? 'bg-amber-500/5 text-amber-500' :
             'bg-red-500/5 text-red-500'
          }`}>
            {material.processing_status}
          </span>
       </div>
    </div>
  );
}
