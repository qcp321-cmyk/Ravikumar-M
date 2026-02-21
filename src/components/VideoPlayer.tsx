import { useEffect, useRef, useState, type MouseEvent, type FC } from 'react';
import { motion } from 'motion/react';

interface VideoPlayerProps {
  stream: MediaStream;
  label: string;
  isLocal?: boolean;
  onCursorMove?: (x: number, y: number) => void;
  remoteCursor?: { x: number; y: number; clientId: string };
}

export const VideoPlayer: FC<VideoPlayerProps> = ({ stream, label, isLocal, onCursorMove, remoteCursor }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleMouseMove = (e: MouseEvent) => {
    if (isLocal || !onCursorMove || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    onCursorMove(x, y);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-black rounded-2xl overflow-hidden border-4 border-blue-600 shadow-xl aspect-video group"
      ref={containerRef}
      onMouseMove={handleMouseMove}
    >
      <div className="absolute top-4 left-4 z-10 bg-yellow-400 text-black font-bold px-3 py-1 rounded-full uppercase tracking-wider text-xs shadow-md">
        {label} {isLocal && "(You)"}
      </div>
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Mute local to prevent feedback
        className="w-full h-full object-contain bg-neutral-900"
      />

      {/* Remote Cursor Overlay */}
      {remoteCursor && !isLocal && (
        <div 
            className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white pointer-events-none z-50 transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(255,0,0,0.8)]"
            style={{ 
                left: `${remoteCursor.x * 100}%`, 
                top: `${remoteCursor.y * 100}%`,
                transform: 'translate(-50%, -50%)'
            }}
        >
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-red-600 text-white text-[10px] px-1 rounded whitespace-nowrap">
                Remote
            </div>
        </div>
      )}
      
      {!isLocal && (
          <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors pointer-events-none flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-mono backdrop-blur-sm">
                  Interactive Mode Active
              </span>
          </div>
      )}
    </motion.div>
  );
};
