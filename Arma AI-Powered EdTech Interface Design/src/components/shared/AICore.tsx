import React from 'react';
import { motion } from 'motion/react';

export const AICore = ({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl", className?: string }) => {
  const sizeMap = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-64 h-64",
    xl: "w-96 h-96"
  };

  return (
    <div className={`relative flex items-center justify-center ${sizeMap[size]} ${className}`}>
      {/* Outer ambient glow - diffuse */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-[-20%] rounded-full bg-primary blur-[60px]"
      />
      
      {/* Secondary glow ring */}
      <motion.div 
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute inset-0 rounded-full bg-primary/10 blur-xl"
      />

      {/* Core sphere structure */}
      <div className="relative z-10 w-full h-full rounded-full overflow-hidden">
        {/* Glassy surface */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 mix-blend-overlay" />
        
        {/* Inner shadow/depth */}
        <div className="absolute inset-0 rounded-full shadow-[inset_-10px_-10px_30px_rgba(0,0,0,0.5),inset_5px_5px_20px_rgba(255,255,255,0.1)]" />
        
        {/* Main body gradient */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/30 to-transparent mix-blend-overlay" />

        {/* Inner nucleus */}
        <motion.div 
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[25%] left-[25%] w-[50%] h-[50%] rounded-full bg-[#FF8A3D] mix-blend-color-dodge blur-[15px]"
        />
        
        {/* Specular highlight */}
        <div className="absolute top-[15%] left-[20%] w-[30%] h-[20%] -rotate-12 rounded-[50%] bg-white/60 blur-[10px] mix-blend-overlay" />
      </div>
    </div>
  );
};
