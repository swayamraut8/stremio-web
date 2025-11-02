import React, { useState, useEffect, useRef } from 'react';

interface Thumbnail {
  start: number;
  end: number;
  image: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ScrubberThumbnail: React.FC<{ videoElement: HTMLVideoElement | null }> = ({ videoElement }) => {
  const [thumbnail, setThumbnail] = useState<Thumbnail | null>(null);
  const [position, setPosition] = useState({ x: 0, visible: false });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoElement) return;

    // Load VTT
    fetch('/thumbnails/sample.vtt')
      .then(r => r.text())
      .then(parseVTT)
      .then(thumbs => {
        const onMouseMove = (e: MouseEvent) => {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          const time = percent * videoElement.duration;

          const thumb = thumbs.find(t => time >= t.start && time < t.end);
          if (thumb) {
            setThumbnail(thumb);
            setPosition({
              x: e.clientX,
              visible: true
            });
          } else {
            setPosition(p => ({ ...p, visible: false }));
          }
        };

        const progressBar = document.querySelector('.progress-bar') as HTMLElement;
        if (progressBar) {
          progressBar.addEventListener('mousemove', onMouseMove);
          progressBar.addEventListener('mouseleave', () => setPosition(p => ({ ...p, visible: false })));
        }

        return () => {
          progressBar?.removeEventListener('mousemove', onMouseMove);
        };
      });
  }, [videoElement]);

  if (!thumbnail || !position.visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: position.x - 80,
        bottom: '80px',
        pointerEvents: 'none',
        zIndex: 9999,
        transform: 'translateX(-50%)',
      }}
    >
      <div
        style={{
          width: 160,
          height: 90,
          backgroundImage: `url(${thumbnail.image})`,
          backgroundPosition: `-${thumbnail.x}px -${thumbnail.y}px`,
          backgroundSize: '800px 90px',
          border: '2px solid white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          imageRendering: 'pixelated'
        }}
      />
      <div style={{
        textAlign: 'center',
        color: 'white',
        fontSize: '12px',
        marginTop: '4px',
        textShadow: '0 0 4px black'
      }}>
        {formatTime(thumbnail.start)}
      </div>
    </div>
  );
};

function parseVTT(text: string): Thumbnail[] {
  const lines = text.split('\n');
  const thumbs: Thumbnail[] = [];
  let current: Partial<Thumbnail> = {};

  for (const line of lines) {
    if (line.includes('-->')) {
      const [start, end] = line.split('-->').map(s => s.trim());
      current.start = timeToSeconds(start);
      current.end = timeToSeconds(end);
    } else if (line.includes('#xywh=')) {
      const urlPart = line.split('#xywh=')[0].trim();
      const [x, y, w, h] = line.split('#xywh=')[1].split(',').map(Number);
      thumbs.push({
        start: current.start!,
        end: current.end!,
        image: urlPart,
        x, y, w, h
      });
    }
  }
  return thumbs;
}

function timeToSeconds(time: string): number {
  const [h, m, s] = time.split(':').map(parseFloat);
  return h * 3600 + m * 60 + s;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
