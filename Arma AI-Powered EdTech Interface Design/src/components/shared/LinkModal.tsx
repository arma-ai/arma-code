import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Youtube, Link, Check, ExternalLink } from 'lucide-react';

interface LinkModalProps {
  onClose: () => void;
  onLinkAdded: (type: 'YouTube' | 'Link', title: string) => void;
}

export function LinkModal({ onClose, onLinkAdded }: LinkModalProps) {
  const [url, setUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = () => {
    if (!url) return;
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      onLinkAdded(url.includes('youtube') ? 'YouTube' : 'Link', 'Imported Resource');
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#121215] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-sm font-medium text-white">Add Link</h2>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
           <div className="mb-6">
             <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">URL</label>
             <div className="relative">
               <input 
                 type="text" 
                 value={url}
                 onChange={(e) => setUrl(e.target.value)}
                 placeholder="https://..."
                 className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/20 focus:border-primary/50 focus:outline-none transition-colors"
               />
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                 <Link size={16} />
               </div>
             </div>
           </div>

           <button 
             onClick={handleSubmit}
             disabled={!url || isValidating}
             className="w-full py-3 bg-primary text-black font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
           >
             {isValidating ? 'Validating...' : 'Import'}
             {!isValidating && <ExternalLink size={16} />}
           </button>
        </div>
      </motion.div>
    </div>
  );
}
