import React, { useState } from 'react';
import { Folder, FileText, Clock, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { projectsApi } from '../../services/api';

interface ProjectCardProps {
  id: string;
  name: string;
  materialCount: number;
  createdAt: string;
  onClick?: (id: string) => void;
  onDelete?: () => void;
  onRefresh?: () => void;
}

export function ProjectCard({ id, name, materialCount, createdAt, onClick, onDelete, onRefresh }: ProjectCardProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleClick = () => {
    if (onClick) {
      onClick(id);
    } else {
      navigate(`/dashboard/projects/${id}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete project "${name}"? This will delete all materials in this project.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await projectsApi.delete(id);
      toast.success('Project deleted successfully');
      window.dispatchEvent(new CustomEvent('project-deleted', { detail: { projectId: id } }));
      onDelete?.();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 rounded-2xl p-6 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all duration-300 relative"
    >
      {/* Header with title and material count */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
          <Folder className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white group-hover:text-primary/80 transition-colors">
            {name}
          </h3>
          <p className="text-sm text-white/40">
            {materialCount} {materialCount === 1 ? 'material' : 'materials'}
          </p>
        </div>
      </div>

      {/* Footer with date and file count */}
      <div className="flex items-center gap-4 pt-4 border-t border-white/5 mb-3">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Clock className="w-3.5 h-3.5" />
          <span>Created {formatDate(createdAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <FileText className="w-3.5 h-3.5" />
          <span>{materialCount} files</span>
        </div>
      </div>

      {/* Delete button - full width at bottom */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 border border-transparent hover:border-red-500/20"
        title="Delete project"
      >
        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        <span className="text-xs font-medium">Delete Project</span>
      </button>

      {/* Chevron arrow - always visible on the right */}
      <ChevronRight className="absolute top-6 right-4 w-5 h-5 text-white/20 group-hover:text-primary/60 transition-colors" />
    </div>
  );
}
