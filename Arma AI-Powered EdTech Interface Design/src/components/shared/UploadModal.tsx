import React, { useState } from 'react';
import { X, Upload, Youtube, Link, FileText, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useBatchUpload } from '../../hooks/useApi';
import { FileInput } from '../upload/FileInput';

interface UploadModalProps {
  onClose: () => void;
  projectId?: string;
  onSuccess?: (projectId: string) => void;
}

interface FileObject {
  id: string;
  file: File;
}

export function UploadModal({ onClose, projectId, onSuccess }: UploadModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube' | 'link'>('upload');
  const [projectName, setProjectName] = useState('');
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([]);
  const [linkUrls, setLinkUrls] = useState<string[]>([]);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  
  const { uploadBatch, uploading } = useBatchUpload();
  const [materials, setMaterials] = useState<FileObject[]>([]);
  
  const MAX_FILES = 10;

  const isDuplicateFile = (a: File, b: File) =>
    a.name === b.name &&
    a.size === b.size &&
    a.lastModified === b.lastModified;

  const addMaterial = (file: File) => {
    const newFile: FileObject = {
      id: crypto.randomUUID(),
      file: file
    }
    setMaterials((prev) => {
      const alreadyExists = prev.some((item) =>
        isDuplicateFile(item.file, file)
      );
      if (alreadyExists) {
        toast.error("This file is already added");
        return prev;
      }
      if (prev.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed`);
        return prev;
      }
      return [...prev, newFile]
    })
  }

  const removeMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((f) => f.id !== id));
  }

  const addYoutubeUrl = () => {
    if (!youtubeInput.trim()) return;
    
    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeInput)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }
    
    if (youtubeUrls.length >= MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} URLs allowed`);
      return;
    }
    
    setYoutubeUrls([...youtubeUrls, youtubeInput]);
    setYoutubeInput('');
  };

  const removeYoutubeUrl = (index: number) => {
    setYoutubeUrls(youtubeUrls.filter((_, i) => i !== index));
  };

  const addLinkUrl = () => {
    if (!linkInput.trim()) return;
    
    // Validate URL
    try {
      new URL(linkInput);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }
    
    if (linkUrls.length >= MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} URLs allowed`);
      return;
    }
    
    setLinkUrls([...linkUrls, linkInput]);
    setLinkInput('');
  };

  const removeLinkUrl = (index: number) => {
    setLinkUrls(linkUrls.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const totalItems = materials.length + youtubeUrls.length + linkUrls.length;

    if (totalItems === 0) {
      toast.error('Please add at least one file or URL');
      return;
    }

    if (totalItems > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} items allowed`);
      return;
    }

    // Validate project name
    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      toast.success('Starting upload...');

      const result = await uploadBatch({
        project_id: projectId || undefined,  // Send if provided
        project_name: projectName.trim(),  // Always send project name
        files: materials.map(m => m.file),
        youtube_urls: youtubeUrls,
        link_urls: linkUrls,
      });

      toast.success(`Uploaded ${result.total_files} materials! Processing started.`);

      // Notify parent to refresh projects list
      window.dispatchEvent(new CustomEvent('project-created', { detail: { projectId: result.project_id } }));

      // Navigate to project page or callback
      if (onSuccess) {
        onSuccess(result.project_id);
      } else {
        navigate(`/dashboard/projects/${result.project_id}`);
      }
      
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload materials');
    }
  };

  const totalItems = materials.length + youtubeUrls.length + linkUrls.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-scroll" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#121215] border border-white/10 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div>
            <h2 className="text-sm font-medium text-white">Add materials to project</h2>
            <p className="text-xs text-white/40 mt-1">
              {totalItems}/{MAX_FILES} items selected (PDF, YouTube, Links)
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Project name input (only if no projectId provided) */}
        {!projectId && (
          <div className="p-4 border-b border-white/5">
            <div className="relative bg-[#0A0A0C]/90 backdrop-blur-xl border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary/70" />
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/40"
                  required
                />
              </div>
            </div>
            
          </div>
        )}

        <div className="p-4">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'upload' ? 'bg-primary text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <Upload size={14} /> Files
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'youtube' ? 'bg-primary text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <Youtube size={14} /> YouTube
            </button>
            <button
              onClick={() => setActiveTab('link')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'link' ? 'bg-primary text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <Link size={14} /> Link
            </button>
          </div>

          <div className="min-h-[300px]">
            {uploading ? (
              <div className="flex flex-col items-center justify-center text-center py-12">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-white/80 font-medium">Processing upload...</p>
                <p className="text-white/40 text-sm">Uploading and queueing for AI processing</p>
              </div>
            ) : (
              <>
                {/* Files Tab */}
                {activeTab === 'upload' && (
                  <div className="space-y-3">
                    <div className={`${
                      materials.length < 4 ? 'flex flex-col' : 'grid grid-cols-2 gap-2 max-h-64 overflow-y-auto'
                    }`}>
                      {materials.map((item) => (
                        <div
                          key={item.id}
                          className="relative group bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3"
                        >
                          <FileText className="w-5 h-5 text-primary/70 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-medium truncate">{item.file.name}</p>
                            <p className="text-[10px] text-white/40">
                              {(item.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            onClick={() => removeMaterial(item.id)}
                            className="p-1 text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      {materials.length < MAX_FILES && (
                        <FileInput onAdd={addMaterial} />
                      )}
                    </div>

                    {materials.length > 0 && (
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <p className="text-xs text-white/40">
                          {materials.length} file{materials.length !== 1 ? 's' : ''} selected
                        </p>
                        <button
                          onClick={handleUpload}
                          className="px-6 py-2 bg-primary text-black font-medium rounded-xl hover:bg-primary/90 transition-all cursor-pointer text-sm"
                        >
                          Upload {materials.length} File{materials.length !== 1 ? 's' : ''}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* YouTube Tab */}
                {activeTab === 'youtube' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={youtubeInput}
                        onChange={(e) => setYoutubeInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addYoutubeUrl()}
                        placeholder="https://youtube.com/watch?v=..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-primary/50 focus:outline-none transition-colors"
                      />
                      <button
                        onClick={addYoutubeUrl}
                        disabled={!youtubeInput}
                        className="px-4 py-3 bg-primary/20 text-primary font-medium rounded-xl hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
                      >
                        Add
                      </button>
                    </div>

                    {youtubeUrls.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {youtubeUrls.map((url, index) => (
                          <div
                            key={index}
                            className="relative group bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3"
                          >
                            <Youtube className="w-5 h-5 text-red-500/70 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white/80 truncate">{url}</p>
                            </div>
                            <button
                              onClick={() => removeYoutubeUrl(index)}
                              className="p-1 text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {youtubeUrls.length > 0 && (
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <p className="text-xs text-white/40">
                          {youtubeUrls.length} YouTube video{youtubeUrls.length !== 1 ? 's' : ''} added
                        </p>
                        <button
                          onClick={handleUpload}
                          className="px-6 py-2 bg-primary text-black font-medium rounded-xl hover:bg-primary/90 transition-all cursor-pointer text-sm"
                        >
                          Upload {youtubeUrls.length} Video{youtubeUrls.length !== 1 ? 's' : ''}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Link Tab */}
                {activeTab === 'link' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addLinkUrl()}
                        placeholder="https://example.com/article"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-primary/50 focus:outline-none transition-colors"
                      />
                      <button
                        onClick={addLinkUrl}
                        disabled={!linkInput}
                        className="px-4 py-3 bg-primary/20 text-primary font-medium rounded-xl hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
                      >
                        Add
                      </button>
                    </div>

                    {linkUrls.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {linkUrls.map((url, index) => (
                          <div
                            key={index}
                            className="relative group bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3"
                          >
                            <Link className="w-5 h-5 text-blue-500/70 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white/80 truncate">{url}</p>
                            </div>
                            <button
                              onClick={() => removeLinkUrl(index)}
                              className="p-1 text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {linkUrls.length > 0 && (
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <p className="text-xs text-white/40">
                          {linkUrls.length} link{linkUrls.length !== 1 ? 's' : ''} added
                        </p>
                        <button
                          onClick={handleUpload}
                          className="px-6 py-2 bg-primary text-black font-medium rounded-xl hover:bg-primary/90 transition-all cursor-pointer text-sm"
                        >
                          Upload {linkUrls.length} Link{linkUrls.length !== 1 ? 's' : ''}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Combined upload button */}
          {totalItems > 0 && activeTab !== 'upload' && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <button
                onClick={handleUpload}
                className="w-full py-3 bg-primary text-black font-medium rounded-xl hover:bg-primary/90 transition-all cursor-pointer"
              >
                Upload {totalItems} Item{totalItems !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
