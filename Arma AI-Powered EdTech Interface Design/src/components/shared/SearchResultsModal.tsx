import React, { useState } from 'react';
import { X, FileText, Youtube, Globe, Loader2, Plus, ExternalLink, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import type { SearchResult, SearchResultType } from '../../types/api';

interface SearchResultsModalProps {
  query: string;
  results: SearchResult[];
  loading: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResult) => void;
}

export function SearchResultsModal({ 
  query, 
  results, 
  loading, 
  onClose, 
  onSelectResult 
}: SearchResultsModalProps) {
  const [activeTab, setActiveTab] = useState<SearchResultType | 'all'>('all');
  const [addingId, setAddingId] = useState<string | null>(null);

  // Filter results by type
  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter(r => r.type === activeTab);

  // Count results by type
  const pdfCount = results.filter(r => r.type === 'pdf').length;
  const youtubeCount = results.filter(r => r.type === 'youtube').length;
  const articleCount = results.filter(r => r.type === 'article').length;

  const handleAddResult = async (result: SearchResult) => {
    setAddingId(result.url);
    try {
      await onSelectResult(result);
      toast.success(`Added "${result.title}" to your materials`);
    } catch (error) {
      toast.error('Failed to add material');
    } finally {
      setAddingId(null);
    }
  };

  const getTypeIcon = (type: SearchResultType) => {
    switch (type) {
      case 'pdf':
        return <FileText size={16} className="text-blue-400" />;
      case 'youtube':
        return <Youtube size={16} className="text-red-400" />;
      case 'article':
        return <Globe size={16} className="text-emerald-400" />;
    }
  };

  const getTypeLabel = (type: SearchResultType) => {
    switch (type) {
      case 'pdf': return 'PDF';
      case 'youtube': return 'Video';
      case 'article': return 'Article';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl max-h-[80vh] bg-[#121215] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-white">Search Results</h2>
              <p className="text-xs text-white/40">"{query}"</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-4">
          <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'all' ? 'bg-primary text-black' : 'text-white/60 hover:text-white'}`}
            >
              All ({results.length})
            </button>
            <button 
              onClick={() => setActiveTab('pdf')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'pdf' ? 'bg-primary text-black' : 'text-white/60 hover:text-white'}`}
            >
              <FileText size={12} /> PDF ({pdfCount})
            </button>
            <button 
              onClick={() => setActiveTab('youtube')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'youtube' ? 'bg-primary text-black' : 'text-white/60 hover:text-white'}`}
            >
              <Youtube size={12} /> Video ({youtubeCount})
            </button>
            <button 
              onClick={() => setActiveTab('article')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'article' ? 'bg-primary text-black' : 'text-white/60 hover:text-white'}`}
            >
              <Globe size={12} /> Articles ({articleCount})
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-white/80 font-medium">Searching the web...</p>
              <p className="text-white/40 text-sm">Finding PDFs, videos, and articles</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Search size={24} className="text-white/20" />
              </div>
              <p className="text-white/60 font-medium mb-1">No results found</p>
              <p className="text-white/40 text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((result, index) => (
                <motion.div
                  key={result.url}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all"
                >
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    {result.thumbnail_url ? (
                      <div className="w-24 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                        <img 
                          src={result.thumbnail_url} 
                          alt={result.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        result.type === 'pdf' ? 'bg-blue-500/10' :
                        result.type === 'youtube' ? 'bg-red-500/10' :
                        'bg-emerald-500/10'
                      }`}>
                        {getTypeIcon(result.type)}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-medium text-white/90 line-clamp-1 group-hover:text-white transition-colors">
                          {result.title}
                        </h3>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md flex-shrink-0 ${
                          result.type === 'pdf' ? 'bg-blue-500/10 text-blue-400' :
                          result.type === 'youtube' ? 'bg-red-500/10 text-red-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {getTypeLabel(result.type)}
                        </span>
                      </div>

                      {result.description && (
                        <p className="text-xs text-white/40 line-clamp-2 mb-2">
                          {result.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-white/30">
                          {result.source && <span>{result.source}</span>}
                          {result.published_date && (
                            <>
                              <span>•</span>
                              <span>{result.published_date}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            title="Open in new tab"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            onClick={() => handleAddResult(result)}
                            disabled={addingId === result.url}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors text-xs font-medium"
                          >
                            {addingId === result.url ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && filteredResults.length > 0 && (
          <div className="px-4 py-3 border-t border-white/5 bg-white/[0.02]">
            <p className="text-xs text-white/30 text-center">
              Click "Add" to import a resource into your learning materials
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

