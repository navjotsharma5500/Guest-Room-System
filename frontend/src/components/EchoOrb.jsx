// src/components/EchoOrb.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * EchoOrb / EchoAvatar Component
 * 
 * Modes:
 * - 'floating': The FAB button (fixed position, red orb)
 * - 'header': Small avatar for chat header (white background, red face)
 * - 'inline': Tiny avatar for chat messages (white background, red face)
 * - 'peek': Large peeking robot for chat background
 */
const EchoOrb = ({ mode = "floating", onClick, isThinking = false, className = "" }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  // Blinking logic
  useEffect(() => {
    const blinkLoop = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
      const nextBlink = Math.random() * 4000 + 2000;
      setTimeout(blinkLoop, nextBlink);
    };
    const timer = setTimeout(blinkLoop, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Talking/Tongue logic (Only for floating mode mostly, or random fun)
  useEffect(() => {
    if (mode !== 'floating' && mode !== 'peek') return;
    
    const talkLoop = () => {
      setIsTalking(true);
      setTimeout(() => setIsTalking(false), 2000);
      const nextTalk = Math.random() * 10000 + 8000;
      setTimeout(talkLoop, nextTalk);
    };
    const timer = setTimeout(talkLoop, 5000);
    return () => clearTimeout(timer);
  }, [mode]);

  // ─── RENDERERS ────────────────────────────────────────────────────────

  // 1. ROBOT FACE (New Design: Red Chat Bot with Headphones)
  const RobotFace = ({ eyeColor = "white", expression = "idle" }) => {
     // Colors
     const mainColor = "bg-red-500";
     const darkColor = "bg-red-600";
     const screenColor = "bg-white";
     const featureColor = "bg-red-500"; // Eyes/Mouth

     return (
       <div className="relative w-full h-full flex items-center justify-center">
          
          {/* Left Ear Muff (Headphone) */}
          <div className={`absolute left-[-15%] top-[25%] w-[15%] h-[50%] ${darkColor} rounded-l-md shadow-sm z-0`} />
          {/* Right Ear Muff (Headphone) */}
          <div className={`absolute right-[-15%] top-[25%] w-[15%] h-[50%] ${darkColor} rounded-r-md shadow-sm z-0`} />
          
          {/* Antennae */}
          <div className={`absolute -top-[18%] left-[20%] w-[8%] h-[25%] ${darkColor} rounded-t-full`} />
          <div className={`absolute -top-[18%] right-[20%] w-[8%] h-[25%] ${darkColor} rounded-t-full`} />

          {/* Main Head Shape (Rounded Chat Bubble) */}
          <div className={`relative w-full h-full ${mainColor} rounded-[45%] shadow-inner flex items-center justify-center z-10`}>
             
             {/* Chat Tail (Bottom Left) */}
             <div className={`absolute bottom-[5%] -left-[5%] w-[25%] h-[25%] ${mainColor} [clip-path:polygon(100%_0,0%_100%,100%_100%)] rotate-12 z-0 rounded-bl-lg`} />

             {/* Screen / Face Area */}
             <div className={`w-[75%] h-[55%] ${screenColor} rounded-[1rem] flex flex-col items-center justify-center relative shadow-sm overflow-hidden`}>
                
                {/* Eyes Container */}
                <div className="flex gap-[20%] mb-1 w-full justify-center items-center mt-1">
                    {/* Left Eye */}
                    <motion.div
                      animate={{ 
                        scaleY: isBlinking ? 0.1 : (expression === 'thinking' ? [1, 0.4, 1] : 1),
                        height: expression === 'happy' || expression === 'celebrate' ? "8px" : "10px", 
                      }}
                      transition={{ 
                        duration: expression === 'thinking' ? 1.5 : 0.1,
                        repeat: expression === 'thinking' ? Infinity : 0
                      }}
                      className={`w-[10px] h-[10px] rounded-full ${featureColor} ${expression === 'happy' || expression === 'celebrate' ? 'rounded-t-full h-[6px]' : ''}`}
                    />
                    {/* Right Eye */}
                    <motion.div
                       animate={{ 
                        scaleY: isBlinking ? 0.1 : (expression === 'thinking' ? [1, 0.4, 1] : 1),
                        height: expression === 'happy' || expression === 'celebrate' ? "8px" : "10px",
                      }}
                      transition={{ 
                        duration: expression === 'thinking' ? 1.5 : 0.1,
                        repeat: expression === 'thinking' ? Infinity : 0,
                        delay: expression === 'thinking' ? 0.2 : 0
                      }}
                      className={`w-[10px] h-[10px] rounded-full ${featureColor} ${expression === 'happy' || expression === 'celebrate' ? 'rounded-t-full h-[6px]' : ''}`}
                    />
                </div>

                {/* Mouth */}
                <div className="w-[30%] h-[4px] bg-red-100 rounded-full mt-0.5 flex justify-center overflow-visible relative">
                    <motion.div 
                        animate={{ width: isTalking ? "100%" : "50%" }}
                        className={`h-full ${featureColor} rounded-full`}
                    />
                    
                    {/* Tongue Animation */}
                    <AnimatePresence mode="wait">
                      {(isTalking || expression === 'celebrate') && (
                        <motion.div
                          key="tongue"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ 
                            height: "140%", 
                            opacity: 1,
                            rotate: expression === 'celebrate' ? [0, -10, 10, 0] : 0
                          }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full w-[60%] bg-pink-400 rounded-b-full"
                        />
                      )}
                    </AnimatePresence>
                </div>
             </div>
          </div>
          
          {/* Celebration Particles */}
          <AnimatePresence>
             {expression === 'celebrate' && (
                <div className="absolute -top-6 w-full flex justify-center pointer-events-none">
                   <motion.div 
                     animate={{ scale: [0, 1.2, 0], y: [-10, -30, -40], opacity: [0, 1, 0] }}
                     transition={{ repeat: Infinity, duration: 1 }}
                     className="text-yellow-400 text-xs absolute left-0"
                   >⭐</motion.div>
                   <motion.div 
                     animate={{ scale: [0, 1, 0], y: [-5, -25, -35], x: [10, 15, 20], opacity: [0, 1, 0] }}
                     transition={{ repeat: Infinity, duration: 1, delay: 0.3 }}
                     className="text-yellow-400 text-[10px] absolute right-0"
                   >✨</motion.div>
                </div>
             )}
          </AnimatePresence>
       </div>
     )
  }

  // 2. HEADER AVATAR (Small, White BG, Red Border)
  if (mode === "header") {
    return (
      <div className={`relative w-12 h-12 flex items-center justify-center ${className}`}>
        <div className="w-10 h-10">
           <RobotFace eyeColor="black" expression={isThinking ? "thinking" : "idle"} />
        </div>
        {/* Online Indicator */}
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full z-10 shadow-sm" />
      </div>
    );
  }

  // 3. INLINE AVATAR (Tiny, Transparent/White)
  if (mode === "inline") {
    const expression = isThinking ? "thinking" : (className.includes("success") ? "celebrate" : "idle");
    return (
      <div className={`relative w-9 h-9 flex items-center justify-center flex-shrink-0 ${className}`}>
        <div className="w-8 h-8">
           <RobotFace eyeColor="black" expression={expression} />
        </div>
      </div>
    );
  }

  // 4. PEEKING ROBOT (Large, Bottom of Chat)
  if (mode === "peek") {
    return (
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: "spring", damping: 12 }}
        className="absolute -bottom-10 -right-4 w-40 h-40 pointer-events-none opacity-20 z-0"
      >
         <div className="w-32 h-32 ml-4 mb-4">
             <RobotFace eyeColor="white" expression="celebrate" />
         </div>
      </motion.div>
    );
  }

  // 5. FLOATING FAB (Default Red Orb)
  return (
    <motion.button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 group cursor-pointer focus:outline-none ${className}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-16 h-16"
      >
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-red-500 blur-xl"
        />

        <div className="relative w-full h-full flex items-center justify-center">
          <div className="w-14 h-14">
             <RobotFace eyeColor="white" />
          </div>
        </div>

        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full z-20 shadow-sm animate-pulse" />
      </motion.div>
      
      <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-bold rounded-xl shadow-lg border border-white/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        Chat with Echo
      </div>
    </motion.button>
  );
};

export default EchoOrb;
