'use client';

import React, { useRef, type ComponentProps } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'motion/react';
import Logo from './Logo';
import HeroButton from './reactbits/HeroButton';
import dynamic from 'next/dynamic';

const DitherBackground = dynamic<ComponentProps<typeof import('./reactbits/backgrounds/Dither').default>>(
  () => import('./reactbits/backgrounds/Dither'),
  { ssr: false, loading: () => null }
);

const FadeInOnView: React.FC<React.PropsWithChildren<{ delay?: number; className?: string }>> = ({
  children,
  delay = 0,
  className,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { amount: 0.2, once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default function LandingContent() {
  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] font-sans selection:bg-black/10 relative overflow-hidden">
      
      {/* Soft animated background (non-WebGL) */}
      
      {/* Floating Navigation - Top Pill */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit">
        <div className="flex items-center gap-12 px-2 py-2 bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-sm rounded-full">
          <div className="pl-4 pr-2">
            <Logo size="sm" />
          </div>

          <div className="hidden md:flex items-center gap-1 bg-gray-100/50 p-1 rounded-full">
            <a href="#features" className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-white hover:text-black hover:shadow-sm transition-all">Features</a>
            <a href="#about" className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-white hover:text-black hover:shadow-sm transition-all">About arma</a>
            <a href="#pricing" className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-white hover:text-black hover:shadow-sm transition-all">Pricing</a>
          </div>

          <div className="pr-2">
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-black bg-white border border-gray-200 hover:bg-gray-50 transition-all"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-48 pb-32 text-center px-4">
        <div className="max-w-4xl mx-auto">
          <FadeInOnView>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-black mb-6 leading-tight flex flex-col items-center gap-4">
              <span>Unlock Your Best Learning</span>
              <span className="flex items-center relative translate-x-16 -translate-y-6">
                <span className="relative z-10 translate-x-10">With</span>
                <div className="relative -my-10 -ml-28 z-0">
                  <Logo width={600} height={225} className="text-black" />
                </div>
              </span>
            </h1>
          </FadeInOnView>

          <FadeInOnView delay={0.05}>
            <p className="text-gray-500 text-lg mb-10 max-w-2xl mx-auto">
              Your ultimate study helper. Learn your way with flashcards, quizzes, create podcasts and presentations powered by built-in AI.
            </p>
          </FadeInOnView>

          <FadeInOnView delay={0.1}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/login" className="min-w-[180px]">
                <HeroButton
                  label="Start Learning"
                  color="#111827"
                  speed="5s"
                  thickness={2}
                  hoverScale={1.05}
                  className="inline-block"
                />
              </Link>
              <a
                href="#how-it-works"
                className="px-8 py-3 rounded-full bg-white text-black font-semibold border border-gray-200 hover:bg-gray-50 transition-all min-w-[160px]"
              >
                Learn more
              </a>
            </div>
          </FadeInOnView>

          <FadeInOnView delay={0.15}>
            <div className="flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-white ${['bg-yellow-400', 'bg-blue-500', 'bg-green-500', 'bg-red-500'][i - 1]}`}></div>
                ))}
              </div>
              <p className="text-sm text-gray-400">Over 10,000 learners are already using arma</p>
            </div>
          </FadeInOnView>
        </div>
      </section>

      <div className="w-full h-px bg-gray-100 max-w-4xl mx-auto mb-20"></div>

      {/* How to use? - Simple */}
      <section id="how-it-works" className="py-20 max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-24">How to use? -Simple.</h2>

        {/* Step 1 */}
        <div className="flex flex-col md:flex-row items-center gap-16 mb-32">
          <FadeInOnView className="flex-1">
            {/* Mockup of Upload Modal */}
            <motion.div
              whileHover={{ scale: 1.02, rotateX: -2, rotateY: 2 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 will-change-transform"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">More Ways to Learn with <span className="text-purple-500">arma</span></h3>
              </div>
              <div className="flex gap-4 mb-4">
                <div className="flex-1 border rounded-xl p-4 bg-gray-50">
                  <div className="font-bold text-sm mb-1">Upload Files</div>
                  <div className="text-[10px] text-gray-400">Only PDF files allowed</div>
                </div>
                <div className="flex-1 border rounded-xl p-4">
                  <div className="font-bold text-sm mb-1">YouTube videos link</div>
                  <div className="text-[10px] text-gray-400">Paste the link</div>
                </div>
              </div>
              <div className="w-full h-10 border rounded-full bg-gray-50"></div>
            </motion.div>
          </FadeInOnView>
          <FadeInOnView delay={0.05} className="flex-1">
            <h3 className="text-2xl font-bold mb-4">Upload what you dont understand</h3>
            <p className="text-gray-500 text-lg leading-relaxed">
              Upload any type of documents or YouTube videos to let AI process them and give you all learning materials
            </p>
          </FadeInOnView>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-16 mb-32">
          <FadeInOnView className="flex-1">
            {/* Mockup of Processing */}
            <motion.div
              whileHover={{ scale: 1.015, rotateX: 1, rotateY: -2 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 will-change-transform"
            >
              <div className="mb-4 font-bold">Processing your video</div>
              <div className="w-full bg-gray-100 rounded-full h-4 mb-6 overflow-hidden">
                <div className="w-3/4 h-full bg-black rounded-full"></div>
              </div>
              <div className="aspect-video bg-gray-200 rounded-xl flex items-center justify-center relative overflow-hidden">
                <div className="w-12 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                </div>
              </div>
            </motion.div>
          </FadeInOnView>
          <FadeInOnView delay={0.05} className="flex-1">
            <h3 className="text-2xl font-bold mb-4">Let our AI process your material</h3>
            <p className="text-gray-500 text-lg leading-relaxed">
              After you upload your material our AI will start processing it and building your learning help
            </p>
          </FadeInOnView>
        </div>

        {/* Step 3 */}
        <FadeInOnView className="text-center mb-32">
          <h3 className="text-2xl font-bold mb-12">Take your ultimate study tools to work with</h3>
          <motion.div
            whileHover={{ scale: 1.01, rotateX: -1, rotateY: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 18 }}
            className="bg-white p-4 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden will-change-transform"
          >
            <div className="aspect-[16/9] bg-gray-50 rounded-[2rem] relative overflow-hidden">
              {/* Mock Dashboard UI */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b flex items-center px-8">
                <div className="font-bold">Self-made billionaire</div>
              </div>
              <div className="absolute top-20 left-8 bottom-8 w-[60%] bg-white rounded-2xl shadow-sm flex items-center justify-center">
                <div className="w-16 h-12 bg-red-600 rounded-xl"></div>
              </div>
              <div className="absolute top-20 right-8 bottom-8 left-[65%] bg-white rounded-2xl shadow-sm p-6">
                <div className="text-center mt-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl mx-auto mb-4"></div>
                  <div className="text-sm font-bold text-gray-400">Learn with AI Tutor</div>
                </div>
              </div>
            </div>
          </motion.div>
          <p className="text-gray-400 mt-8 max-w-3xl mx-auto">
            Get ready to work with a seamless interface, processed study material, and powerful learning tools right at your fingertips.
          </p>
        </FadeInOnView>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">Features</h2>

          <FadeInOnView>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {[
                { title: 'AI CHAT BOX', text: 'Ask anything about the material and our AI will get you an answer with explanation.' },
                { title: 'FLASHCARDS', text: 'Generate flashcards to learn new words and other information from material faster.' },
                { title: 'QUIZZES', text: 'Test your knowledge about the material with AI generated quizzes.' }
              ].map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  whileHover={{ y: -6 }}
                  className="bg-[#F5F5F7] p-8 rounded-3xl h-64 flex flex-col justify-between hover:bg-gray-100 transition-colors will-change-transform"
                >
                  <h3 className="text-xl font-bold uppercase tracking-wide">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </FadeInOnView>

          <FadeInOnView delay={0.05}>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: 'AI PODCASTS',
                  text: 'Generate ready-to-listen AI podcasts to better understand the material. Good for learning while you are doing other stuff.'
                },
                {
                  title: 'AUTO PRESENTATIONS',
                  text: 'Create high quality presentations with AI about the material and easily export it into PPTX or PDF formats.'
                }
              ].map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  whileHover={{ y: -6 }}
                  className="bg-[#F5F5F7] p-8 rounded-3xl h-48 flex flex-col justify-between hover:bg-gray-100 transition-colors will-change-transform"
                >
                  <h3 className="text-xl font-bold uppercase tracking-wide">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </FadeInOnView>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto bg-[#F5F5F7] rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-12 text-[#1D1D1F]">Try arma now for free</h2>
            <Link
              href="/login"
              className="inline-block px-12 py-4 rounded-full bg-[#D4D4D4] text-black font-bold hover:bg-[#C0C0C0] transition-all shadow-sm"
            >
              Get started
            </Link>
          </div>

          {/* Custom Logo Background */}
          <div className="absolute top-1/2 -translate-y-1/2 right-0 opacity-[0.05] pointer-events-none h-full w-1/2 flex items-center justify-end pr-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-[80%] h-[80%]">
              <path d="M4 6v10c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4V6" />
              <path d="M14 6v10c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4V6" />
            </svg>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Logo size="sm" />
        </div>
        <p className="text-gray-400 text-sm">© 2025 arma. All rights reserved.</p>
      </footer>
    </div>
  );
}
