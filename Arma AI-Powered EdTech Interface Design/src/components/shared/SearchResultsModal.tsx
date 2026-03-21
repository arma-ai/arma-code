import { useState, useEffect } from 'react';
import { X, FileText, Youtube, Globe, Loader2, Plus, ExternalLink, Search, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import type { SearchPhase, SearchResult, SearchResultType } from '../../types/api';

interface SearchResultsModalProps {
  query: string;
  results: SearchResult[];
  loading: boolean;
  refining?: boolean;
  phase?: SearchPhase;
  onClose: () => void;
  onSelectResult: (result: SearchResult) => Promise<boolean | void>;
  aiAnswer?: string;  // AI answer when no materials found
}

export function SearchResultsModal({
  query,
  results,
  loading,
  refining = false,
  phase = 'fast',
  onClose,
  onSelectResult,
  aiAnswer
}: SearchResultsModalProps) {
  const [activeTab, setActiveTab] = useState<SearchResultType | 'all'>('all');
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const filteredResults = activeTab === 'all'
    ? results
    : results.filter(r => r.type === activeTab);

  const pdfCount = results.filter(r => r.type === 'pdf').length;
  const youtubeCount = results.filter(r => r.type === 'youtube').length;
  const articleCount = results.filter(r => r.type === 'article').length;

  const handleAddResult = async (result: SearchResult) => {
    setAddingId(result.url);
    try {
      const response = await onSelectResult(result);
      // Only show success if the result was actually added (not rejected)
      if (response !== false) {
        toast.success(`Added "${result.title}" to your materials`);
      }
    } catch (error) {
      const detail =
        (error as any)?.response?.data?.detail ||
        (error as Error)?.message ||
        'Failed to add material';
      toast.error(typeof detail === 'string' ? detail : 'Failed to add material');
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
      case 'youtube': return 'VIDEO';
      case 'article': return 'ARTICLE';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99998]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-2 md:p-4 z-[99999] pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-full md:max-w-3xl max-h-[90vh] md:max-h-[80vh] bg-[#0D0D0F] border border-white/10 rounded-xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 md:p-4 border-b border-white/10 bg-[#0D0D0F] shrink-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center">
                <Search size={18} className="text-primary" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-semibold text-white">Search Results</h2>
                <p className="text-xs text-white/40 truncate max-w-[200px] md:max-w-none">"{query}"</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="p-2 md:p-4 border-b border-white/5 bg-[#0D0D0F] shrink-0">
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg md:rounded-xl">
              {[
                { key: 'all', label: `All (${results.length})`, mobileLabel: 'All', icon: null },
                { key: 'pdf', label: `PDF (${pdfCount})`, mobileLabel: 'PDF', icon: <FileText size={12} /> },
                { key: 'youtube', label: `Video (${youtubeCount})`, mobileLabel: 'Video', icon: <Youtube size={12} /> },
                { key: 'article', label: `Articles (${articleCount})`, mobileLabel: 'Web', icon: <Globe size={12} /> }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as SearchResultType | 'all')}
                  className={`flex-1 py-2 md:py-2.5 text-[11px] md:text-xs font-medium rounded-md md:rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary text-black'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span className="md:hidden">{tab.mobileLabel}</span>
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Results List */}
          <div className="p-2 md:p-4 flex-1 overflow-y-auto bg-[#0A0A0C]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-white/80 font-medium mt-4">
                  {phase === 'fast' ? 'Finding PDFs and videos...' : 'Searching the web...'}
                </p>
                <p className="text-white/40 text-sm">
                  {phase === 'fast'
                    ? 'Showing first-pass results as quickly as possible'
                    : 'Finding PDFs, videos, and articles'}
                </p>
              </div>
            ) : aiAnswer && filteredResults.length === 0 ? (
              <div className="p-4 md:p-8 rounded-xl md:rounded-2xl border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-semibold text-white/95">AI Answer</h3>
                    <p className="text-xs text-white/50">Generated answer when no materials found</p>
                  </div>
                </div>
                <div className="p-3 md:p-4 rounded-lg md:rounded-xl bg-black/20 text-sm leading-relaxed text-white/85 whitespace-pre-wrap">
                  {aiAnswer}
                </div>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Search size={24} className="text-white/20" />
                </div>
                <p className="text-white/60 font-medium">No results found</p>
                <p className="text-white/40 text-sm">
                  {refining ? 'Fast pass is empty. Refining and loading articles...' : 'Try a different search term'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 md:gap-3">
                {refining && (
                  <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-white/70">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span>Refining results and loading articles...</span>
                  </div>
                )}
                {filteredResults.map((result, index) => (
                  <motion.div
                    key={result.url}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                    className="p-3 md:p-4 rounded-lg md:rounded-xl border border-white/5 bg-white/[0.02]"
                  >
                    <div className="flex gap-3 md:gap-4">
                      {/* Thumbnail */}
                      {result.thumbnail_url ? (
                        <div className="w-16 h-12 md:w-28 md:h-20 rounded-lg overflow-hidden bg-white/5 shrink-0">
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
                        <div className={`w-12 h-12 md:w-20 md:h-20 rounded-lg flex items-center justify-center shrink-0 ${
                          result.type === 'pdf' ? 'bg-blue-500/10' :
                          result.type === 'youtube' ? 'bg-red-500/10' :
                          'bg-emerald-500/10'
                        }`}>
                          {getTypeIcon(result.type)}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-xs md:text-sm font-medium text-white/90 line-clamp-2">
                            {result.title}
                          </h3>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                            result.type === 'pdf' ? 'bg-blue-500/20 text-blue-400' :
                            result.type === 'youtube' ? 'bg-red-500/20 text-red-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {getTypeLabel(result.type)}
                          </span>
                        </div>

                        {result.description && (
                          <p className="text-[11px] md:text-xs text-white/40 line-clamp-2 flex-1 mb-2">
                            {result.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-[11px] md:text-xs text-white/30 truncate max-w-[120px] md:max-w-none">
                            {result.source}
                          </span>

                          <div className="flex items-center gap-1 md:gap-2">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 md:p-2 rounded-lg text-white/40 hover:text-white transition-colors"
                              title="Open in new tab"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button
                              onClick={() => handleAddResult(result)}
                              disabled={addingId === result.url}
                              className="flex items-center gap-1.5 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium disabled:opacity-50 hover:bg-primary/20 transition-colors"
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
            <div className="px-3 md:px-4 py-2 md:py-3 border-t border-white/5 bg-[#0D0D0F] shrink-0">
              <p className="text-xs text-white/30 text-center">
                Click "Add" to import a resource into your learning materials
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
