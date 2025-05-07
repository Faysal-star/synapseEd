"use client";

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast, useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MicIcon, PauseIcon, SendIcon, ExternalLink } from "lucide-react";
import { AudioVisualizer } from "./AudioVisualizer";

interface Message {
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
  evaluation?: QuestionEvaluation;
}

interface QuestionEvaluation {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  question_number: number;
  total_questions: number;
  is_completed: boolean;
  final_report?: FinalReport;
}

interface FinalReport {
  grade: string;
  percentage: number;
  strengths: string[];
  areas_for_improvement: string[];
  overall_feedback: string;
  next_steps: string[];
  raw_score: number;
  max_score: number;
  calculated_percentage: number;
  questions: string[];
  answers: string[];
  question_scores: number[];
  question_feedback: string[];
}

// Backend URL - use the unified server URL instead of a separate VIVA URL
const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Constructs a proper audio URL based on the path
 * @param audioPath The audio path from the API
 * @returns A fully qualified URL that can be used in an audio element
 */
const buildAudioUrl = (audioPath: string): string => {
  if (!audioPath) return "";

  // If it's already a full URL, return it
  if (audioPath.startsWith("http")) {
    return audioPath;
  }

  // If it's a relative path to the API, construct the full URL
  if (audioPath.startsWith("/api/viva/audio/")) {
    return `${BACKEND_API_URL}${audioPath}`;
  }

  // If it's a full path on the backend, use it directly with the base URL
  if (audioPath.includes("/")) {
    return `${BACKEND_API_URL}${audioPath.startsWith("/") ? "" : "/"}${audioPath}`;
  }

  // If it's just a filename, assume it's in the audio directory
  return `${BACKEND_API_URL}/api/viva/audio/${audioPath}`;
};

export default function VivaPage() {
  // Form state
  const [subject, setSubject] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [voice, setVoice] = useState<string>("alloy");

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>("");

  // Audio state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(false);
  const [isAISpeaking, setIsAISpeaking] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);

  // New states
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [examCompleted, setExamCompleted] = useState<boolean>(false);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(0);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // Add a flag to track if we've received a socket response
  const [receivedSocketResponse, setReceivedSocketResponse] = useState<boolean>(false);

  // Add new state for socket connection status
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  // Add reconnection attempt counter
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;

  // Initialize socket connection
  useEffect(() => {
    const newSessionId = sessionId || crypto.randomUUID();
    if (!sessionId) {
      setSessionId(newSessionId);
    }

    // Connect to the unified server's namespace for VIVA
    socketRef.current = io(`${BACKEND_API_URL}`, {
      transports: ["websocket"],
      autoConnect: false,
      auth: { sessionId: newSessionId },
      path: "/socket.io" 
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to socket server");
      setSocketConnected(true);
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection

      // Join the session room after connecting
      socket.emit("join", { session_id: newSessionId });

      toast({
        title: "Connected",
        description: "Connected to VIVA server",
        duration: 3000,
      });
    });

    socket.on("join_status", (data) => {
      console.log("Join status:", data);
      if (data.status === "joined") {
        toast({
          title: "Joined Session",
          description: `Successfully joined session ${data.session_id.substring(
            0,
            8
          )}...`,
          duration: 2000,
        });
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setSocketConnected(false);
      toast({
        title: "Connection Error",
        description: "Failed to connect to VIVA server",
        variant: "destructive",
        duration: 5000,
      });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from socket server");
      setSocketConnected(false);

      // Try to reconnect automatically if we're in an active session
      if (messages.length > 0 && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(
          `Attempting to reconnect (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`
        );

        setTimeout(() => {
          if (!socket.connected) {
            socket.connect();

            toast({
              title: "Reconnecting...",
              description: `Attempt ${reconnectAttempts}/${maxReconnectAttempts} to reconnect to server`,
              duration: 2000,
            });
          }
        }, 2000 * reconnectAttempts); // Increasing backoff
      }
    });

    socket.on("ai_response", (data) => {
      console.log("Received AI response:", data);

      // Create full audio URL
      const audioUrl = data.audio_path ? buildAudioUrl(data.audio_path) : "";

      // Check if this is a repeat question response
      const isRepeatRequest = data.is_repeat === true;

      // Process evaluation data if this is not a repeat request
      if (!isRepeatRequest && data.evaluation) {
        setQuestionNumber(data.evaluation.question_number);
        setTotalQuestions(data.evaluation.total_questions);
        
        // Update current question if available
        if (data.evaluation.question_number < data.evaluation.total_questions) {
          setCurrentQuestion(data.evaluation.question);
        } else {
          setCurrentQuestion(null);
        }

        // Update score data
        if (data.evaluation.is_completed && data.evaluation.final_report) {
          setExamCompleted(true);
          setFinalReport(data.evaluation.final_report);
          setCurrentScore(data.evaluation.final_report.raw_score);
          setMaxScore(data.evaluation.final_report.max_score);
        }
      }

      // Add AI response to messages
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          audioUrl: audioUrl,
          evaluation: isRepeatRequest ? undefined : data.evaluation,
        },
      ]);

      // Mark that we've received a socket response to prevent duplicate messages
      setReceivedSocketResponse(true);

      setCurrentAudioUrl(audioUrl);
      setIsAISpeaking(true);
      setIsMicEnabled(false);
    });

    socket.on("mic_status", (data) => {
      console.log("Mic status update:", data);
      setIsMicEnabled(data.status === "enabled");
    });

    socket.on("user_presence_check", (data) => {
      toast({
        title: "Are you still there?",
        description: data.message,
        duration: 5000,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, toast]);

  // Play audio when URL changes
  useEffect(() => {
    if (currentAudioUrl && audioRef.current) {
      console.log("Playing audio:", currentAudioUrl);

      // Reset audio progress
      setAudioProgress(0);

      // Add cache-busting parameter
      const audioSrc = `${currentAudioUrl}${
        currentAudioUrl.includes("?") ? "&" : "?"
      }t=${Date.now()}`;

      // Set the audio source
      audioRef.current.src = audioSrc;

      // Play the audio
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
        toast({
          title: "Audio Playback Error",
          description:
            "Failed to play audio response. Check console for details.",
          variant: "destructive",
          duration: 3000,
        });

        // Even if audio fails, enable the mic
        setIsAISpeaking(false);
        setIsMicEnabled(true);
      });
    }
  }, [currentAudioUrl, toast]);

  // Update audio element onended event handler
  useEffect(() => {
    if (audioRef.current) {
      const audioElement = audioRef.current;

      // Update progress during playback
      const updateProgress = () => {
        if (audioElement.duration) {
          setAudioProgress(
            (audioElement.currentTime / audioElement.duration) * 100
          );
        }
      };

      // Handle audio ended event
      const handleEnded = () => {
        console.log("Audio playback ended");
        setIsAISpeaking(false);
        setIsMicEnabled(true);
        setAudioProgress(100);
        emitSocketEvent("audio_paused");
      };

      // Audio element event listeners
      audioElement.addEventListener("timeupdate", updateProgress);
      audioElement.addEventListener("ended", handleEnded);

      return () => {
        audioElement.removeEventListener("timeupdate", updateProgress);
        audioElement.removeEventListener("ended", handleEnded);
      };
    }
  }, [audioRef.current, sessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add health check effect
  useEffect(() => {
    // Check if backend is healthy
    const checkBackendHealth = async () => {
      try {
        // Use the appropriate health endpoint in the unified server
        const response = await fetch(`${BACKEND_API_URL}/api/viva/health`, {
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Backend server health:", data);
          
          // Check if the VIVA service is specifically healthy
          const vivaHealthy = data.services?.viva !== false;

          if (data.status === "healthy" && vivaHealthy) {
            console.log("Backend server and VIVA service are healthy");
          } else {
            console.warn("Backend server reported issues with VIVA service:", data);
            toast({
              title: "Backend Connection Issue",
              description:
                "The viva assistant service reported issues. Some features may not work correctly.",
              variant: "destructive",
              duration: 5000,
            });
          }
        } else {
          console.warn(
            "Backend server health check failed with status:",
            response.status
          );
          toast({
            title: "Backend Connection Issue",
            description:
              "The server appears to be offline. Please try again later.",
            variant: "destructive",
            duration: 5000,
          });
        }
      } catch (error) {
        console.error("Failed to check backend health:", error);
        toast({
          title: "Connection Error",
          description:
            "Unable to connect to the server. Please check your connection.",
          variant: "destructive",
          duration: 5000,
        });
      }
    };

    checkBackendHealth();
  }, [toast]);

  // Update startViva function to check health before starting
  const startViva = async () => {
    if (!subject) {
      toast({
        title: "Missing Information",
        description: "Please enter a subject for the VIVA",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check backend health directly
      try {
        // Use the health endpoint from the unified server
        const healthResponse = await fetch(`${BACKEND_API_URL}/api/viva/health`, {
          signal: AbortSignal.timeout(3000),
        });

        if (!healthResponse.ok) {
          throw new Error(
            `Backend server health check failed with status: ${healthResponse.status}`
          );
        }

        const healthData = await healthResponse.json();
        if (healthData.status !== "healthy") {
          throw new Error(
            `Backend server reported unhealthy status: ${healthData.message}`
          );
        }
      } catch (healthError: unknown) {
        console.error("Health check failed:", healthError);
        const errorMessage =
          healthError instanceof Error
            ? healthError.message
            : "Unknown error during health check";
        throw new Error(`Backend server health check failed: ${errorMessage}`);
      }

      // Now start the VIVA session using the unified server's endpoint
      const response = await fetch(`${BACKEND_API_URL}/api/viva/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId || "",
        },
        body: JSON.stringify({
          subject,
          topic,
          difficulty,
          voice,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "No error text");
        throw new Error(
          `Failed to start VIVA session: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("VIVA session started:", data);

      // Set the current question info
      if (data.current_question) {
        setCurrentQuestion(data.current_question.text);
        setQuestionNumber(data.current_question.number);
        setTotalQuestions(data.current_question.total);
      }

      // Create proper audio URL
      const audioUrl = data.audio_path ? buildAudioUrl(data.audio_path) : "";

      setMessages([
        {
          role: "assistant",
          content:
            data.greeting || data.text || "Hello! I am your VIVA examiner.",
          audioUrl: audioUrl,
        },
      ]);

      setCurrentAudioUrl(audioUrl);
      setIsAISpeaking(true);
      setIsMicEnabled(false);

      // Connect socket
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }

      toast({
        title: "VIVA Started",
        description: "VIVA examination has started successfully",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error starting VIVA session:", error);
      toast({
        title: "VIVA Start Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to start VIVA session",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Start audio recording
  const startRecording = async () => {
    if (!isMicEnabled) {
      toast({
        title: "Microphone Disabled",
        description: "Please wait for AI to finish speaking",
        duration: 2000,
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleAudioStop;

      mediaRecorder.start(100); // Collect data in 100ms chunks
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "Speak now. Click the mic button again to stop.",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Failed",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all audio tracks
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());

      toast({
        title: "Recording Stopped",
        description: "Processing your response...",
        duration: 2000,
      });
    }
  };

  // Handle audio recording completion
  const handleAudioStop = async () => {
    if (audioChunksRef.current.length > 0) {
      setIsLoading(true);

      try {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // Reset socket response flag when submitting new audio
        setReceivedSocketResponse(false);

        // Add user message immediately with "processing" indicator
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: "Processing your audio response...",
          },
        ]);

        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const base64Data = base64Audio.split(",")[1];

          // Update the last message to show that we're sending
          setMessages((prev) => {
            const newMessages = [...prev];
            if (
              newMessages.length > 0 &&
              newMessages[newMessages.length - 1].role === "user"
            ) {
              newMessages[newMessages.length - 1].content =
                "Sending your response...";
            }
            return newMessages;
          });

          try {
            // Use the unified server endpoint
            const response = await fetch(`${BACKEND_API_URL}/api/viva/chat`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Session-ID": sessionId || "",
              },
              body: JSON.stringify({
                thread_id: sessionId,
                audio_data: base64Data,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text().catch(() => "Unknown error");
              throw new Error(
                `API error: ${response.status} - ${errorText}`
              );
            }

            const data = await response.json();
            
            // Update the user message with the transcription
            setMessages((prev) => {
              const newMessages = [...prev];
              // Find the last user message
              const lastUserIdx = newMessages.findIndex(
                (msg, idx) => msg.role === "user" && idx === newMessages.length - 1
              );
              
              if (lastUserIdx !== -1) {
                newMessages[lastUserIdx].content = data?.transcription || 
                  "Audio response processed";
              }
              
              return newMessages;
            });
            
            console.log("Audio response processed:", data);

            // Create proper audio URL
            const audioUrl = data.audio_path
              ? buildAudioUrl(data.audio_path)
              : "";

            // Check if this is a repeat question response
            const isRepeatRequest = data.is_repeat === true;

            // Only add the AI response if we haven't already received it via socket
            if (!receivedSocketResponse) {
              // Add the AI response
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content:
                    data.response || data.text || "I received your message.",
                  audioUrl: audioUrl,
                  evaluation: isRepeatRequest ? undefined : data.evaluation,
                }
              ]);

              setCurrentAudioUrl(audioUrl);
              setIsAISpeaking(true);
              setIsMicEnabled(false);

              // Only update question progress if this was not a repeat request
              if (!isRepeatRequest && data.evaluation) {
                setQuestionNumber(data.evaluation.question_number);
                setCurrentQuestion(
                  data.evaluation.question_number <
                    data.evaluation.total_questions
                    ? data.evaluation.next_question || data.evaluation.question
                    : null
                );

                // Update score data if exam is completed
                if (
                  data.evaluation.is_completed &&
                  data.evaluation.final_report
                ) {
                  setExamCompleted(true);
                  setFinalReport(data.evaluation.final_report);
                  setCurrentScore(data.evaluation.final_report.raw_score);
                  setMaxScore(data.evaluation.final_report.max_score);
                }
              }
            }
          } catch (error) {
            console.error("Error processing audio:", error);

            // Update the user message to show the error
            setMessages((prev) => {
              const newMessages = [...prev];
              if (
                newMessages.length > 0 &&
                newMessages[newMessages.length - 1].role === "user"
              ) {
                newMessages[newMessages.length - 1].content = `Error: ${
                  error instanceof Error
                    ? error.message
                    : "Failed to process audio"
                }`;
              }
              return newMessages;
            });

            toast({
              title: "Audio Processing Failed",
              description:
                error instanceof Error
                  ? error.message
                  : "Failed to process your response",
              variant: "destructive",
              duration: 5000,
            });

            // Enable mic again after a short delay if processing failed
            setTimeout(() => {
              setIsMicEnabled(true);
            }, 1000);
          } finally {
            setIsLoading(false);
          }
        };

        reader.readAsDataURL(audioBlob);
      } catch (error) {
        console.error("Error preparing audio:", error);
        toast({
          title: "Audio Preparation Failed",
          description: "Failed to prepare audio for sending",
          variant: "destructive",
          duration: 3000,
        });
        setIsLoading(false);
      }
    }
  };

  // Send text response
  const sendTextResponse = async () => {
    if (!inputText.trim() || !sessionId) return;

    setIsLoading(true);

    try {
      // Reset socket response flag when sending new text
      setReceivedSocketResponse(false);

      // Add user message immediately
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: inputText,
        },
      ]);

      const response = await fetch(`${BACKEND_API_URL}/api/viva/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId,
        },
        body: JSON.stringify({
          thread_id: sessionId,
          text: inputText,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `API error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Text response processed:", data);

      // Create proper audio URL
      const audioUrl = data.audio_path ? buildAudioUrl(data.audio_path) : "";

      // Check if this is a repeat question response
      const isRepeatRequest = data.is_repeat === true;

      // Only add AI response if we haven't already received it via socket
      if (!receivedSocketResponse) {
        // Add AI response
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response || data.text || "I received your message.",
            audioUrl: audioUrl,
            evaluation: isRepeatRequest ? undefined : data.evaluation,
          },
        ]);

        setCurrentAudioUrl(audioUrl);
        setIsAISpeaking(true);
        setIsMicEnabled(false);

        // Only update question progress if this was not a repeat request
        if (!isRepeatRequest && data.evaluation) {
          setQuestionNumber(data.evaluation.question_number);
          setCurrentQuestion(
            data.evaluation.question_number < data.evaluation.total_questions
              ? data.evaluation.next_question || data.evaluation.question
              : null
          );

          // Update score data if exam is completed
          if (data.evaluation.is_completed && data.evaluation.final_report) {
            setExamCompleted(true);
            setFinalReport(data.evaluation.final_report);
            setCurrentScore(data.evaluation.final_report.raw_score);
            setMaxScore(data.evaluation.final_report.max_score);
          }
        }
      }

      setInputText("");
    } catch (error) {
      console.error("Error sending text response:", error);
      toast({
        title: "Text Response Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send your response",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Improved socket event emitter with better error handling
  const emitSocketEvent = (eventName: string, data?: any) => {
    if (!socketRef.current) {
      console.warn(`Socket not initialized when trying to emit ${eventName}`);
      return false;
    }

    if (!socketRef.current.connected) {
      console.warn(
        `Socket not connected when trying to emit ${eventName}, attempting to reconnect...`
      );
      // Try to reconnect
      socketRef.current.connect();

      // Add a small delay and check again
      setTimeout(() => {
        if (socketRef.current && socketRef.current.connected && sessionId) {
          console.log(`Reconnected socket, now emitting delayed ${eventName}`);
          socketRef.current.emit(eventName, data || { session_id: sessionId });
        } else {
          console.error(`Failed to reconnect socket for ${eventName}`);
        }
      }, 1000);

      return false;
    }

    if (!sessionId) {
      console.warn(`No session ID when trying to emit ${eventName}`);
      return false;
    }

    console.log(
      `Emitting socket event: ${eventName}`,
      data || { session_id: sessionId }
    );
    socketRef.current.emit(eventName, data || { session_id: sessionId });
    return true;
  };

  // Update replayAudio function
  const replayAudio = () => {
    if (!isAISpeaking && currentAudioUrl && audioRef.current) {
      setIsAISpeaking(true);
      setIsMicEnabled(false);

      emitSocketEvent("audio_resumed");

      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.error("Error replaying audio:", error);
        setIsAISpeaking(false);
        setIsMicEnabled(true);

        emitSocketEvent("audio_paused");

        toast({
          title: "Audio Replay Failed",
          description: "Failed to replay audio",
          variant: "destructive",
          duration: 3000,
        });
      });
    }
  };

  // Update playMessageAudio function
  const playMessageAudio = (audioUrl: string) => {
    if (!isAISpeaking && audioUrl) {
      setCurrentAudioUrl(audioUrl);
      setIsAISpeaking(true);
      setIsMicEnabled(false);

      emitSocketEvent("audio_resumed");
    }
  };

  // Reset the session
  const resetSession = () => {
    // First clean up the current session
    if (sessionId) {
      cleanupSession(sessionId);
    }

    // Stop any ongoing recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      mediaRecorderRef.current.stop();
    }

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Reset state
    setMessages([]);
    setCurrentAudioUrl(null);
    setIsMicEnabled(false);
    setIsAISpeaking(false);
    setIsRecording(false);
    setAudioProgress(0);
    setReceivedSocketResponse(false);
    setSocketConnected(false);

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Reset exam state
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setTotalQuestions(10);
    setExamCompleted(false);
    setFinalReport(null);
    setCurrentScore(0);
    setMaxScore(0);

    toast({
      title: "Session Ended",
      description: "VIVA session has been reset",
      duration: 3000,
    });
  };

  // Add this function to fetch progress
  const fetchProgress = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/viva/progress`, {
        headers: {
          "X-Session-ID": sessionId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch progress: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === "success") {
        const progress = data.progress;
        setQuestionNumber(progress.current_question_index);
        setTotalQuestions(progress.total_questions);
        setCurrentScore(progress.current_score);
        setMaxScore(progress.max_possible_score);

        if (progress.status === "completed") {
          setExamCompleted(true);
          if (progress.final_report) {
            setFinalReport(progress.final_report);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  };

  // Add function to manually reconnect
  const reconnectSocket = () => {
    if (socketRef.current) {
      if (socketRef.current.connected) {
        // Already connected, just re-join the room
        socketRef.current.emit("join", { session_id: sessionId });
        toast({
          title: "Already Connected",
          description: "Socket is already connected, re-joining session",
          duration: 2000,
        });
      } else {
        // Try to reconnect
        socketRef.current.connect();
        toast({
          title: "Reconnecting...",
          description: "Attempting to reconnect to VIVA server",
          duration: 2000,
        });
      }
    } else {
      toast({
        title: "Connection Error",
        description: "Socket not initialized",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Add cleanup function to delete audio files
  const cleanupSession = async (sessionIdToCleanup: string | null = null) => {
    const idToCleanup = sessionIdToCleanup || sessionId;
    if (!idToCleanup) return;

    try {
      console.log(`Cleaning up session ${idToCleanup}...`);
      await fetch(`${BACKEND_API_URL}/api/viva/cleanup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": idToCleanup,
        },
        body: JSON.stringify({
          session_id: idToCleanup,
        }),
      });
      console.log(`Cleanup request sent for session ${idToCleanup}`);
    } catch (error) {
      console.error("Error during session cleanup:", error);
    }
  };

  // Add beforeunload event listener to clean up when page is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId) {
        // Use a synchronous approach for beforeunload
        navigator.sendBeacon(
          `${BACKEND_API_URL}/api/viva/cleanup`,
          JSON.stringify({ session_id: sessionId })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Clean up when component unmounts
      if (sessionId) {
        cleanupSession(sessionId);
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionId]);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Voice VIVA Assistant</h1>

      <div className="grid grid-cols-1 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>VIVA Settings</CardTitle>
            <CardDescription>Configure your viva examination</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Computer Science"
                disabled={isLoading || messages.length > 0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic (optional)</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Artificial Intelligence"
                disabled={isLoading || messages.length > 0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={setDifficulty}
                disabled={isLoading || messages.length > 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice">Voice</Label>
              <Select
                value={voice}
                onValueChange={setVoice}
                disabled={isLoading || messages.length > 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alloy">Alloy</SelectItem>
                  <SelectItem value="echo">Echo</SelectItem>
                  <SelectItem value="fable">Fable</SelectItem>
                  <SelectItem value="onyx">Onyx</SelectItem>
                  <SelectItem value="nova">Nova</SelectItem>
                  <SelectItem value="shimmer">Shimmer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            {messages.length === 0 ? (
              <Button
                onClick={startViva}
                disabled={isLoading || !subject}
                className="w-full"
              >
                {isLoading ? "Starting..." : "Start VIVA"}
              </Button>
            ) : (
              <Button
                onClick={resetSession}
                variant="destructive"
                className="w-full"
              >
                End Session
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Progress Bar for Questions */}
        {messages.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Exam Progress</CardTitle>
                <Badge variant={examCompleted ? "default" : "default"}>
                  {examCompleted
                    ? "Completed"
                    : `Question ${questionNumber}/${totalQuestions}`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Questions Completed</span>
                  <span>
                    {questionNumber}/{totalQuestions}
                  </span>
                </div>
                <Progress
                  value={(questionNumber / totalQuestions) * 100}
                  className="h-2"
                />

                {currentScore > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Current Score</span>
                      <span>
                        {currentScore}/{maxScore} ({Math.round((currentScore / maxScore) * 100)}%)
                      </span>
                    </div>
                    <Progress
                      value={(currentScore / (maxScore || 1)) * 100}
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Interface */}
        <Card
          className={`${
            messages.length > 0 ? "min-h-[500px]" : "h-auto"
          } flex flex-col`}
        >
          <CardHeader>
            <CardTitle>VIVA Session</CardTitle>
            <CardDescription>
              {messages.length > 0
                ? examCompleted
                  ? "Exam completed"
                  : "Exam in progress"
                : "Start a session to begin"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {messages.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-col space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium">Current Question</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentQuestion || "No active question"}
                      </p>
                    </div>
                    {socketConnected ? (
                      <Badge variant="outline" className="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        Disconnected
                      </Badge>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {isAISpeaking 
                        ? "AI is speaking..." 
                        : isMicEnabled 
                        ? "Your turn to speak" 
                        : "Processing..."}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={reconnectSocket}
                      disabled={socketConnected}
                    >
                      Reconnect
                    </Button>
                  </div>

                  {currentAudioUrl && (
                    <div className="w-full">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Audio Progress</span>
                        <span>{Math.round(audioProgress)}%</span>
                      </div>
                      <Progress value={audioProgress} className="h-1" />
                    </div>
                  )}
                </div>
                <Separator className="my-4" />
              </div>
            )}

            <ScrollArea
              className={examCompleted ? "h-[300px] pr-4" : "h-[300px] pr-4"}
            >
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`rounded-lg p-3 max-w-[80%] ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-slate-800"
                      }`}
                    >
                      <div className="text-sm">
                        {message.content || "No content"}
                      </div>
                      {message.role === "assistant" && message.audioUrl && (
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 p-0 text-xs"
                            onClick={() => playMessageAudio(message.audioUrl!)}
                            disabled={isAISpeaking}
                          >
                            Play Audio
                          </Button>
                        </div>
                      )}
                      {message.evaluation && message.role === "assistant" && (
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {message.evaluation.score !== undefined && (
                            <span className="font-semibold">
                              Score: {message.evaluation.score}/10
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {finalReport && examCompleted && (
              <div className="mt-6 p-5 border rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Your Results</h3>
                  <Badge
                    variant={
                      finalReport.percentage >= 80
                        ? "default"
                        : finalReport.percentage >= 60
                        ? "default"
                        : "destructive"
                    }
                    className="text-base px-3 py-1"
                  >
                    {finalReport.grade} ({Math.round(finalReport.percentage)}%)
                  </Badge>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4 shadow-sm">
                  <h4 className="font-medium text-sm text-slate-500 dark:text-slate-400 mb-2">
                    Overall Feedback
                  </h4>
                  <p className="italic text-sm">
                    {finalReport.overall_feedback}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                    <h4 className="font-medium text-sm text-green-600 dark:text-green-400 mb-2">
                      Strengths
                    </h4>
                    <ul className="text-sm list-disc list-inside">
                      {finalReport.strengths.map((strength, idx) => (
                        <li key={`strength-${idx}`}>{strength}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                    <h4 className="font-medium text-sm text-amber-600 dark:text-amber-400 mb-2">
                      Areas for Improvement
                    </h4>
                    <ul className="text-sm list-disc list-inside">
                      {finalReport.areas_for_improvement.map((area, idx) => (
                        <li key={`improvement-${idx}`}>{area}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                  <h4 className="font-medium text-sm text-blue-600 dark:text-blue-400 mb-2">
                    Next Steps
                  </h4>
                  <ul className="text-sm list-disc list-inside">
                    {finalReport.next_steps.map((step, idx) => (
                      <li key={`step-${idx}`}>{step}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 text-center">
                  <Button onClick={resetSession} variant="outline">
                    Start New VIVA
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="space-y-4">
            <div className="flex items-center justify-center w-full flex-col max-w-[200px] mx-auto">
              {isRecording && mediaRecorderRef.current && (
                <div className="w-full">
                  <AudioVisualizer mediaRecorder={mediaRecorderRef.current} />
                </div>
              )}
              <Button
                className="w-16 h-16 rounded-full mb-2"
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={
                  isLoading ||
                  !messages.length ||
                  !isMicEnabled ||
                  isAISpeaking ||
                  examCompleted
                }
                title={isRecording ? "Stop Recording" : "Start Recording"}
              >
                {isRecording ? (
                  <PauseIcon className="h-6 w-6" />
                ) : (
                  <MicIcon className="h-6 w-6" />
                )}
              </Button>
              {messages.length > 0 && !examCompleted && (
                <p className="text-xs text-slate-500 mt-1 text-center mb-3">
                  You can ask the examiner to repeat or clarify the current
                  question
                </p>
              )}

              {/* Hidden audio element for playback */}
              <audio
                ref={audioRef}
                className="hidden"
                controls={false}
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error("Audio element error:", e);
                  toast({
                    title: "Audio Error",
                    description:
                      "Failed to load audio. The file may be missing or inaccessible.",
                    variant: "destructive",
                    duration: 3000,
                  });
                  setIsAISpeaking(false);
                  setIsMicEnabled(true);
                }}
              />
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}