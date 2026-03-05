import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Material, MaterialSummary } from '../../../types/api';

// Summary section interface
interface SummarySection {
    id: string;
    title: string;
    topics: string[];
    readTime: number;
    content: string;
    keyPoints: string[];
}

const MIN_READ_SPEED_WPM = 200;

export function parseSummaryIntoSections(summaryText: string): SummarySection[] {
    const paragraphs = summaryText.split(/\n\n+/).filter(p => p.trim());

    if (paragraphs.length === 0) {
        return [{
            id: 'overview',
            title: 'Overview',
            topics: ['General Summary'],
            readTime: Math.ceil(summaryText.split(' ').length / MIN_READ_SPEED_WPM),
            content: summaryText,
            keyPoints: []
        }];
    }

    const sections: SummarySection[] = [];
    let currentSection: SummarySection | null = null;

    paragraphs.forEach((para, index) => {
        const trimmed = para.trim();
        const wordCount = trimmed.split(' ').length;
        const readTime = Math.ceil(wordCount / MIN_READ_SPEED_WPM);

        const isHeader = wordCount < 10 && (
            /^[\d]+[\.)\s]/.test(trimmed) ||
            /^[A-ZА-Я].*:$/.test(trimmed) ||
            /^#+\s/.test(trimmed) ||
            (wordCount <= 5 && /^[A-ZА-Я]/.test(trimmed))
        );

        if (isHeader || index === 0) {
            if (currentSection) {
                sections.push(currentSection);
            }

            const title = trimmed.replace(/^[\d#]+[\.)\s]*/, '').replace(/:$/, '').trim();
            currentSection = {
                id: `section-${index}`,
                title: title || `Section ${sections.length + 1}`,
                topics: [],
                readTime: readTime,
                content: isHeader ? '' : trimmed,
                keyPoints: []
            };
        } else if (currentSection) {
            currentSection.content += (currentSection.content ? '\n\n' : '') + trimmed;
            currentSection.readTime += readTime;

            const bullets = trimmed.match(/^[-•*]\s.+$/gm);
            if (bullets) {
                currentSection.keyPoints.push(...bullets.map(b => b.replace(/^[-•*]\s/, '')));
            }
        }
    });

    if (currentSection) {
        sections.push(currentSection);
    }

    // If we only got one section, try to create a more structured view
    if (sections.length === 1 && sections[0].content.length > 500) {
        const content = sections[0].content;
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

        if (sentences.length >= 4) {
            const chunkSize = Math.ceil(sentences.length / 3);
            return [
                {
                    id: 'intro',
                    title: 'Introduction & Overview',
                    topics: ['Core Concepts', 'Background'],
                    readTime: Math.ceil(chunkSize * 15 / MIN_READ_SPEED_WPM),
                    content: sentences.slice(0, chunkSize).join('. ') + '.',
                    keyPoints: sentences.slice(0, 2).map(s => s.trim())
                },
                {
                    id: 'main',
                    title: 'Key Concepts & Analysis',
                    topics: ['Main Ideas', 'Details'],
                    readTime: Math.ceil(chunkSize * 15 / MIN_READ_SPEED_WPM),
                    content: sentences.slice(chunkSize, chunkSize * 2).join('. ') + '.',
                    keyPoints: sentences.slice(chunkSize, chunkSize + 2).map(s => s.trim())
                },
                {
                    id: 'conclusion',
                    title: 'Conclusions & Insights',
                    topics: ['Summary', 'Takeaways'],
                    readTime: Math.ceil((sentences.length - chunkSize * 2) * 15 / MIN_READ_SPEED_WPM),
                    content: sentences.slice(chunkSize * 2).join('. ') + '.',
                    keyPoints: sentences.slice(-2).map(s => s.trim())
                }
            ];
        }
    }

    return sections.length > 0 ? sections : [{
        id: 'overview',
        title: 'Overview',
        topics: ['General Summary'],
        readTime: Math.ceil(summaryText.split(' ').length / MIN_READ_SPEED_WPM),
        content: summaryText,
        keyPoints: []
    }];
}

export function TableOfContentsSummary({ summary }: { summary: string }) {
    const sections = parseSummaryIntoSections(summary);

    return (
        <div className="space-y-1">
            {sections.map((section) => (
                <button
                    key={section.id}
                    onClick={() => toast.info(`Focused on: ${section.title}`)}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-white/60 hover:text-white transition-colors group"
                >
                    <div className="flex items-start gap-2">
                        <span className="text-white/20 font-mono shrink-0 mt-0.5">#</span>
                        <div className="min-w-0">
                            <p className="truncate font-medium">{section.title}</p>
                            <p className="text-[10px] text-white/30 truncate">
                                {section.readTime} mins • {section.topics.join(', ')}
                            </p>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}

export interface SummaryTabProps {
    material: Material;
    summary: MaterialSummary | null;
    loading: boolean;
}

const MAX_KEY_POINTS = 4;
const KEY_POINT_MAX_LENGTH = 120;

export function SummaryTab({ summary, loading }: SummaryTabProps) {
    const navigate = useNavigate();

    const sections = summary ? parseSummaryIntoSections(summary.summary) : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-white/40">Loading summary...</p>
                </div>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-6">
                    <FileText size={40} />
                </div>
                <h2 className="text-2xl font-medium text-white mb-2">No Summary Yet</h2>
                <p className="text-white/40 max-w-md mb-8">
                    Summary has not been generated for this material yet.
                </p>
                <button
                    onClick={() => toast.info('Summary generation coming soon')}
                    className="px-6 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-all"
                >
                    Generate Summary
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-12 overflow-y-auto h-full scrollbar-hide">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-medium text-white">Executive Summary</h2>
                <div className="flex gap-2">
                    <button
                        className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                        title="Export PDF"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={() => navigate('../flashcards')}
                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                        Convert to Flashcards
                    </button>
                </div>
            </div>

            {/* Sections */}
            <div className="space-y-8">
                {sections.map((section) => (
                    <section
                        key={section.id}
                        className="relative pl-6 border-l border-white/10 hover:border-primary/50 transition-colors group"
                    >
                        {/* Timeline dot */}
                        <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-[#121215] border border-white/20 group-hover:border-primary group-hover:bg-primary transition-colors" />

                        {/* Section title with read time */}
                        <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-3">
                            {section.title}
                            <span className="text-xs font-normal text-white/30 px-2 py-0.5 rounded-full bg-white/5">
                                {section.readTime} min read
                            </span>
                        </h3>

                        {/* Section content */}
                        <p className="text-white/60 leading-relaxed font-light mb-4">
                            {section.content}
                        </p>

                        {/* Key Points box */}
                        {section.keyPoints.length > 0 && (
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Key Points</h4>
                                <ul className="space-y-2">
                                    {section.keyPoints.slice(0, MAX_KEY_POINTS).map((point, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-white/80">
                                            <span className="text-primary">•</span>
                                            {point.length > KEY_POINT_MAX_LENGTH ? point.substring(0, KEY_POINT_MAX_LENGTH) + '...' : point}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                ))}
            </div>
        </div>
    );
}
