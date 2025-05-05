'use client';

import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  mediaRecorder: MediaRecorder;
}

export function AudioVisualizer({ mediaRecorder }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | undefined>(undefined);

  useEffect(() => {
    if (!mediaRecorder) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(mediaRecorder.stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#f87171'); // red-400
    gradient.addColorStop(1, '#ef4444'); // red-500

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];

        canvasCtx.fillStyle = gradient;
        const radius = 4;

        // Draw rounded bars
        const y = canvas.height - barHeight;
        const height = barHeight;
        const width = barWidth;
        const cornerRadius = radius;

        canvasCtx.beginPath();
        canvasCtx.moveTo(x + cornerRadius, y);
        canvasCtx.lineTo(x + width - cornerRadius, y);
        canvasCtx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
        canvasCtx.lineTo(x + width, y + height - cornerRadius);
        canvasCtx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
        canvasCtx.lineTo(x + cornerRadius, y + height);
        canvasCtx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
        canvasCtx.lineTo(x, y + cornerRadius);
        canvasCtx.quadraticCurveTo(x, y, x + cornerRadius, y);
        canvasCtx.closePath();
        canvasCtx.fill();

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }

      if (source) {
        source.disconnect();
      }

      if (audioContext) {
        audioContext.close().catch(err => console.error('Error closing AudioContext:', err));
      }

      analyserRef.current = undefined;
    };
  }, [mediaRecorder]);

  return (
    <div className="flex-1 h-24 bg-background p-2 mx-auto">
      <canvas
        ref={canvasRef}
        width={600}
        height={96}
        className="w-full h-full"
      />
    </div>
  );
}
