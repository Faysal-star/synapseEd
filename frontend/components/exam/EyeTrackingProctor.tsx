'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import '@tensorflow/tfjs';
import { toast } from 'sonner';

export interface EyeTrackingMetrics {
  isLookingAway: boolean;
  lookAwayCount: number;
  lookAwayDuration: number; // in seconds
  lastWarningTime: number;
  currentLookAwayDuration: number; // Current continuous duration in seconds
  deviceDetected?: boolean;
  deviceWarningIssued?: boolean;
}

interface EyeTrackingProctorProps {
  isActive: boolean;
  onCheatingDetected: (reason?: string) => void;
  warningThreshold?: number; // number of warnings before disqualification
  lookAwayThreshold?: number; // duration in seconds before considered cheating
  disqualificationThreshold?: number; // continuous duration in seconds before immediate disqualification
  showVideo?: boolean; // whether to show the webcam video
}

const EyeTrackingProctor: React.FC<EyeTrackingProctorProps> = ({
  isActive,
  onCheatingDetected,
  warningThreshold = 3,
  lookAwayThreshold = 2,
  disqualificationThreshold = 5, // Default to 5 seconds for immediate disqualification
  showVideo = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [metrics, setMetrics] = useState<EyeTrackingMetrics>({
    isLookingAway: false,
    lookAwayCount: 0,
    lookAwayDuration: 0,
    lastWarningTime: 0,
    currentLookAwayDuration: 0,
    deviceDetected: false,
    deviceWarningIssued: false,
  });

  // Store the time when user started looking away
  const lookAwayStartTime = useRef<number | null>(null);
  const framesWithFace = useRef<number>(0);
  const totalFrames = useRef<number>(0);
  const checkingRef = useRef<boolean>(false);
  const disqualifiedRef = useRef<boolean>(false);
  const lastFrameTime = useRef<number>(Date.now());

  // Device detection references
  const deviceDetectionCount = useRef<number>(0);
  const lastDeviceDetectionTime = useRef<number>(0);
  const deviceConfidenceThreshold = 0.7; // Threshold for considering a device detection confident

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';

      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL), // For additional behavioral analysis
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL), // Helps with device detection by analyzing hand positions
        ]);

        setModelsLoaded(true);
        console.log('Face API models loaded for eye tracking and device detection');
      } catch (error) {
        console.error('Error loading face-api models:', error);
        toast.error('Failed to load face detection models. Please refresh and try again.');
      }
    };

    loadModels();
  }, []);

  // Set up webcam stream
  useEffect(() => {
    if (!isActive || !modelsLoaded) return;

    let stream: MediaStream | null = null;

    const setupCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: 'user',
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
          toast.success('Webcam activated for assessment proctoring');
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast.error('Failed to access your webcam. Please check permissions and try again.');
      }
    };

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStreamActive(false);
      }
    };
  }, [isActive, modelsLoaded]);

  // Analyze video for eye tracking and device detection
  useEffect(() => {
    if (!streamActive || !isActive) return;

    const video = videoRef.current;
    if (!video || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    let animationFrameId: number;

    const analyzeVideo = async () => {
      if (checkingRef.current || disqualifiedRef.current) return;

      if (!video.paused && !video.ended && video.readyState >= 2) {
        checkingRef.current = true;
        totalFrames.current += 1;

        try {
          // Face detection with landmarks
          const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

          // Update time tracking
          const now = Date.now();
          const frameDeltaTime = (now - lastFrameTime.current) / 1000; // seconds
          lastFrameTime.current = now;

          // Process analysis results
          if (detections.length > 0) {
            framesWithFace.current += 1;
            const detection = detections[0]; // Focus on the first face found

            // Get eye landmarks
            const landmarks = detection.landmarks;
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();

            // Eye direction calculation (simplified)
            const leftEyeWidth = Math.abs(leftEye[3].x - leftEye[0].x);
            const leftEyeHeight = Math.abs(leftEye[4].y - leftEye[1].y);
            const leftEyeRatio = leftEyeHeight / leftEyeWidth;

            const rightEyeWidth = Math.abs(rightEye[3].x - rightEye[0].x);
            const rightEyeHeight = Math.abs(rightEye[4].y - rightEye[1].y);
            const rightEyeRatio = rightEyeHeight / rightEyeWidth;

            // Average eye ratio
            const avgEyeRatio = (leftEyeRatio + rightEyeRatio) / 2;

            // If eyes are too closed or person is looking sideways, consider them looking away
            const isLookingAway = avgEyeRatio < 0.24 || avgEyeRatio > 0.45;

            // Device detection logic - check for specific head and eye positions
            // that indicate looking down at a device
            const isLookingDown =
              detection.landmarks.getJawOutline()[8].y >
              detection.landmarks.getNose()[0].y + displaySize.height * 0.1;

            // Check if head is tilted down significantly (common when looking at a phone)
            const noseBasePos = detection.landmarks.getNose()[3];
            const foreheadPos = detection.landmarks.getJawOutline()[0];
            const verticalTilt =
              (noseBasePos.y - foreheadPos.y) / detection.detection.box.height;

            // Expression analysis - checking for "reading" expression (focused downward)
            const expressions = detection.expressions;
            const isConcentratingDown = expressions.neutral > 0.8 && isLookingDown;

            // Device detection confidence based on multiple factors
            const deviceDetectionConfidence =
              (isLookingDown ? 0.5 : 0) +
              (verticalTilt > 0.25 ? 0.3 : 0) +
              (isConcentratingDown ? 0.2 : 0);

            // Handle potential device detection
            const deviceDetected = deviceDetectionConfidence > deviceConfidenceThreshold;

            if (deviceDetected) {
              deviceDetectionCount.current += 1;

              // If we've detected a device for multiple consecutive frames
              if (deviceDetectionCount.current >= 15) {
                // Update metrics to reflect device detection
                const isNewDetection = !metrics.deviceDetected;
                if (isNewDetection) {
                  setMetrics((prev) => ({
                    ...prev,
                    deviceDetected: true,
                  }));

                  // Handle first-time warning vs. disqualification
                  if (!metrics.deviceWarningIssued) {
                    toast.warning(
                      'Warning: Electronic device suspected. Please keep only your face visible.',
                      {
                        duration: 5000,
                      }
                    );

                    setMetrics((prev) => ({
                      ...prev,
                      deviceWarningIssued: true,
                    }));

                    lastDeviceDetectionTime.current = now;
                  } else if (now - lastDeviceDetectionTime.current > 10000) {
                    disqualifiedRef.current = true;
                    onCheatingDetected('Electronic device usage detected');
                    toast.error(
                      'Disqualified: Electronic device detected after previous warning',
                      {
                        duration: 5000,
                      }
                    );
                  }
                }
              }
            } else {
              // Reset device detection counter if no device detected
              deviceDetectionCount.current = Math.max(0, deviceDetectionCount.current - 1);
            }

            // Handle looking away metrics
            if (isLookingAway && !metrics.isLookingAway) {
              lookAwayStartTime.current = now;

              setMetrics((prev) => ({
                ...prev,
                isLookingAway: true,
                lookAwayCount: prev.lookAwayCount + 1,
                currentLookAwayDuration: 0,
              }));
            } else if (!isLookingAway && metrics.isLookingAway) {
              if (lookAwayStartTime.current) {
                const duration = (now - lookAwayStartTime.current) / 1000; // in seconds
                lookAwayStartTime.current = null;

                setMetrics((prev) => ({
                  ...prev,
                  isLookingAway: false,
                  lookAwayDuration: prev.lookAwayDuration + duration,
                  currentLookAwayDuration: 0,
                }));
              }
            } else if (isLookingAway && metrics.isLookingAway) {
              const currentDuration = metrics.currentLookAwayDuration + frameDeltaTime;

              setMetrics((prev) => ({
                ...prev,
                currentLookAwayDuration: currentDuration,
              }));

              if (currentDuration >= disqualificationThreshold) {
                disqualifiedRef.current = true;
                onCheatingDetected();
                toast.error(
                  `Disqualified: Looking away for more than ${disqualificationThreshold} seconds`,
                  {
                    duration: 5000,
                  }
                );
              } else if (
                currentDuration >= lookAwayThreshold &&
                now - metrics.lastWarningTime > 3000
              ) {
                toast.warning(
                  `Warning: You've been looking away for ${currentDuration.toFixed(
                    1
                  )} seconds. Disqualification at ${disqualificationThreshold} seconds.`,
                  {
                    duration: 3000,
                  }
                );

                setMetrics((prev) => ({
                  ...prev,
                  lastWarningTime: now,
                }));
              }
            }

            // Debug visualization (if needed)
            if (showVideo) {
              const resizedDetections = faceapi.resizeResults(detections, displaySize);
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                faceapi.draw.drawDetections(canvas, resizedDetections);
                faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

                ctx.font = '16px Arial';
                ctx.fillStyle = isLookingAway ? 'red' : 'green';
                ctx.fillText(
                  isLookingAway
                    ? `Looking Away! (${metrics.currentLookAwayDuration.toFixed(
                        1
                      )}s / ${disqualificationThreshold}s)`
                    : 'Eyes on Screen',
                  10,
                  30
                );

                if (deviceDetectionCount.current > 5) {
                  ctx.fillStyle = 'red';
                  ctx.fillText(
                    `Device suspected! (${deviceDetectionCount.current}/15)`,
                    10,
                    60
                  );
                }
              }
            }
          } else {
            if (!metrics.isLookingAway) {
              lookAwayStartTime.current = now;

              setMetrics((prev) => ({
                ...prev,
                isLookingAway: true,
                lookAwayCount: prev.lookAwayCount + 1,
                currentLookAwayDuration: 0,
              }));
            } else {
              const currentDuration = metrics.currentLookAwayDuration + frameDeltaTime;

              setMetrics((prev) => ({
                ...prev,
                currentLookAwayDuration: currentDuration,
              }));

              if (currentDuration >= disqualificationThreshold) {
                disqualifiedRef.current = true;
                onCheatingDetected();
                toast.error(
                  `Disqualified: Face not detected for more than ${disqualificationThreshold} seconds`,
                  {
                    duration: 5000,
                  }
                );
              } else if (
                currentDuration >= lookAwayThreshold &&
                now - metrics.lastWarningTime > 3000
              ) {
                toast.warning(
                  `Warning: Face not detected for ${currentDuration.toFixed(
                    1
                  )} seconds. Disqualification at ${disqualificationThreshold} seconds.`,
                  {
                    duration: 3000,
                  }
                );

                setMetrics((prev) => ({
                  ...prev,
                  lastWarningTime: now,
                }));
              }
            }

            deviceDetectionCount.current = 0;

            if (showVideo) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.font = '16px Arial';
                ctx.fillStyle = 'red';
                ctx.fillText(
                  `Face not detected! (${metrics.currentLookAwayDuration.toFixed(
                    1
                  )}s / ${disqualificationThreshold}s)`,
                  10,
                  30
                );
              }
            }
          }
        } catch (error) {
          console.error('Error in eye tracking analysis:', error);
        }

        checkingRef.current = false;
      }

      if (!disqualifiedRef.current) {
        animationFrameId = requestAnimationFrame(analyzeVideo);
      }
    };

    analyzeVideo();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [
    streamActive,
    isActive,
    metrics,
    onCheatingDetected,
    warningThreshold,
    lookAwayThreshold,
    showVideo,
    disqualificationThreshold,
  ]);

  return (
    <div className={`relative ${showVideo ? 'block' : 'hidden'}`}>
      <div className="relative overflow-hidden rounded-xl border border-gray-700 shadow-xl">
        <video
          ref={videoRef}
          width="320"
          height="240"
          autoPlay
          muted
          playsInline
          className="rounded-xl"
        />
        <canvas
          ref={canvasRef}
          width="320"
          height="240"
          className="absolute top-0 left-0 rounded-xl"
        />

        {!streamActive && isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm text-white rounded-xl">
            <div className="flex flex-col items-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-3"></div>
              <span className="text-sm font-medium">Initializing webcam...</span>
            </div>
          </div>
        )}

        {showVideo && (
          <>
            <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg p-2 text-xs text-white">
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    metrics.isLookingAway
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {metrics.isLookingAway ? 'Looking Away' : 'Focused'}
                </span>
              </div>

              {metrics.deviceDetected && (
                <div className="mt-1 flex justify-between items-center">
                  <span>Device:</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-400">
                    {metrics.deviceWarningIssued ? 'Warning Issued' : 'Suspected'}
                  </span>
                </div>
              )}

              {metrics.isLookingAway && (
                <div className="mt-1.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-[10px]">Time:</span>
                    <span className="text-gray-300">
                      {metrics.currentLookAwayDuration.toFixed(1)}s /{' '}
                      {disqualificationThreshold}s
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div
                      className="bg-gradient-to-r from-yellow-500 to-red-500 h-1 rounded-full transition-all duration-100"
                      style={{
                        width: `${Math.min(
                          100,
                          (metrics.currentLookAwayDuration / disqualificationThreshold) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute top-3 right-3 flex items-center space-x-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
              <div
                className={`w-2 h-2 rounded-full ${
                  metrics.isLookingAway || metrics.deviceDetected
                    ? 'bg-red-500 animate-pulse'
                    : 'bg-green-500'
                }`}
              ></div>
              <span className="text-[10px] font-medium text-white">
                {metrics.isLookingAway
                  ? 'AWAY'
                  : metrics.deviceDetected
                  ? 'DEVICE'
                  : 'ACTIVE'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EyeTrackingProctor;