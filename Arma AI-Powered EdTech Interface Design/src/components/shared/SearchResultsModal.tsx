import { useState, useEffect } from 'react';
import { X, FileText, Youtube, Globe, Loader2, Plus, ExternalLink, Search, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import type { SearchResult, SearchResultType } from '../../types/api';

interface SearchResultsModalProps {
  query: string;
  results: SearchResult[];
  loading: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResult) => Promise<boolean | void>;
  aiAnswer?: string;  // AI answer when no materials found
}

export function SearchResultsModal({ 
  query, 
  results, 
  loading, 
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
      case 'youtube': return 'VIDEO';
      case 'article': return 'ARTICLE';
    }
  };

  return (
    <>
      {/* Backdrop - separate layer */}
      <div 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          zIndex: 99998
        }}
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 99999,
          pointerEvents: 'none'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '48rem',
            maxHeight: '80vh',
            backgroundColor: '#0D0D0F',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: '#0D0D0F',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Search size={18} style={{ color: '#f97316' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', margin: 0 }}>Search Results</h2>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>"{query}"</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              style={{
                padding: '0.5rem',
                color: 'rgba(255, 255, 255, 0.5)',
                background: 'transparent',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            backgroundColor: '#0D0D0F',
            flexShrink: 0
          }}>
            <div style={{
              display: 'flex',
              gap: '0.25rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '0.25rem',
              borderRadius: '0.75rem'
            }}>
              {[
                { key: 'all', label: `All (${results.length})`, icon: null },
                { key: 'pdf', label: `PDF (${pdfCount})`, icon: <FileText size={12} /> },
                { key: 'youtube', label: `Video (${youtubeCount})`, icon: <Youtube size={12} /> },
                { key: 'article', label: `Articles (${articleCount})`, icon: <Globe size={12} /> }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as SearchResultType | 'all')}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    backgroundColor: activeTab === tab.key ? '#f97316' : 'transparent',
                    color: activeTab === tab.key ? 'black' : 'rgba(255, 255, 255, 0.6)',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results List */}
          <div style={{
            padding: '1rem',
            flex: 1,
            overflowY: 'auto',
            backgroundColor: '#0A0A0C'
          }}>
            {loading ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '4rem 0',
                textAlign: 'center'
              }}>
                <Loader2 style={{ width: '2.5rem', height: '2.5rem', color: '#f97316' }} className="animate-spin" />
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500, marginTop: '1rem' }}>Searching the web...</p>
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.875rem' }}>Finding PDFs, videos, and articles</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '4rem 0',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '4rem',
                  height: '4rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  <Search size={24} style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>No results found</p>
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.875rem' }}>Try a different search term</p>
              </div>
            ) : aiAnswer ? (
              // Show AI answer when no materials found
              <div style={{
                padding: '2rem',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 138, 61, 0.2)',
                backgroundColor: 'rgba(255, 138, 61, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 138, 61, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Sparkles size={20} style={{ color: 'rgba(255, 138, 61, 1)' }} />
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.95)',
                      margin: 0
                    }}>AI Answer</h3>
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'rgba(255, 255, 255, 0.5)',
                      margin: 0
                    }}>Generated answer when no materials found</p>
                  </div>
                </div>
                <div style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  color: 'rgba(255, 255, 255, 0.85)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {aiAnswer}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredResults.map((result, index) => (
                  <motion.div
                    key={result.url}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                    style={{
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {/* Thumbnail */}
                      {result.thumbnail_url ? (
                        <div style={{
                          width: '7rem',
                          height: '5rem',
                          borderRadius: '0.5rem',
                          overflow: 'hidden',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          flexShrink: 0
                        }}>
                          <img 
                            src={result.thumbnail_url} 
                            alt={result.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          width: '5rem',
                          height: '5rem',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          backgroundColor: result.type === 'pdf' ? 'rgba(59, 130, 246, 0.1)' :
                            result.type === 'youtube' ? 'rgba(239, 68, 68, 0.1)' :
                            'rgba(16, 185, 129, 0.1)'
                        }}>
                          {getTypeIcon(result.type)}
                        </div>
                      )}

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <h3 style={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: 'rgba(255, 255, 255, 0.9)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {result.title}
                          </h3>
                          <span style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            flexShrink: 0,
                            backgroundColor: result.type === 'pdf' ? 'rgba(59, 130, 246, 0.2)' :
                              result.type === 'youtube' ? 'rgba(239, 68, 68, 0.2)' :
                              'rgba(16, 185, 129, 0.2)',
                            color: result.type === 'pdf' ? '#60a5fa' :
                              result.type === 'youtube' ? '#f87171' :
                              '#34d399'
                          }}>
                            {getTypeLabel(result.type)}
                          </span>
                        </div>

                        {result.description && (
                          <p style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.4)',
                            margin: '0 0 0.5rem 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            flex: 1
                          }}>
                            {result.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.3)' }}>
                            {result.source}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                color: 'rgba(255, 255, 255, 0.4)',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex'
                              }}
                              title="Open in new tab"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button
                              onClick={() => handleAddResult(result)}
                              disabled={addingId === result.url}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                                color: '#f97316',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                opacity: addingId === result.url ? 0.5 : 1
                              }}
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
            <div style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              backgroundColor: '#0D0D0F',
              flexShrink: 0
            }}>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.3)', textAlign: 'center', margin: 0 }}>
                Click "Add" to import a resource into your learning materials
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
