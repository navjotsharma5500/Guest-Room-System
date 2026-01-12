// src/components/ScreenSaver.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Import your images from assets - adjust paths if needed
// These should match the exact filenames in your src/assets folder
const images = [
  require("../assets/Login2 (1).png"),
  require("../assets/Login2 (2).png"),
  require("../assets/Login2 (3).png"),
  require("../assets/Login2 (4).png"),
];

export default function ScreenSaver({ isActive, onDismiss }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  // Change image every 5 seconds
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Animate image position randomly
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setMousePosition({
        x: Math.random() * 80 + 10, // 10-90%
        y: Math.random() * 80 + 10,
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Handle any user interaction to dismiss
  useEffect(() => {
    if (!isActive) return;

    const handleInteraction = () => {
      onDismiss();
    };

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "wheel"];
    events.forEach((event) => {
      window.addEventListener(event, handleInteraction);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, [isActive, onDismiss]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black flex items-center justify-center cursor-pointer"
        onClick={onDismiss}
      >
        {/* Animated Background Gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-red-900"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Floating Image */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: `${mousePosition.x}%`,
            y: `${mousePosition.y}%`,
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            opacity: { duration: 1 },
            scale: { duration: 1 },
            x: { duration: 3, ease: "easeInOut" },
            y: { duration: 3, ease: "easeInOut" },
          }}
          className="absolute"
          style={{
            transform: "translate(-50%, -50%)",
          }}
        >
          <img
            src={images[currentIndex]}
            alt="Screen Saver"
            className="max-w-[70vw] max-h-[70vh] rounded-3xl shadow-2xl object-contain"
          />
        </motion.div>

        {/* Overlay Text */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-20 left-0 right-0 text-center z-10"
        >
          <h1 className="text-white text-4xl font-bold mb-4 drop-shadow-2xl">
            Thapar Guest Room Portal
          </h1>
          <p className="text-gray-300 text-xl drop-shadow-lg">
            Click anywhere or move your mouse to continue
          </p>
        </motion.div>

        {/* Floating Particles Effect */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-30"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        ))}

        {/* Time Display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="absolute top-10 right-10 text-white text-6xl font-light"
        >
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}