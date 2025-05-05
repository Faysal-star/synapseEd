'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  PauseIcon,
  PlayIcon,
  SendIcon,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function VivaPage() {
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [voice, setVoice] = useState<string>('alloy');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  }, [audioUrl]);

  const startViva = async () => {
    if (!subject) {
      alert('Please enter a subject for the VIVA');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('action', 'start');
      formData.append('subject', subject);
      if (topic) formData.append('topic', topic);
      formData.append('difficulty', difficulty);
      formData.append('voice', voice);
      
      const response = await fetch('/api/viva', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to start VIVA session');
      }
      
      const data = await response.json();
      
      setSessionId(data.session_id);
      setMessages([{ role: 'assistant', content: data.text }]);
      setAudioUrl(data.audio_url);
    } catch (error) {
      console.error('Error starting VIVA session:', error);
      alert('Failed to start VIVA session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = handleAudioStop;
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please check your microphone permissions.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleAudioStop = async () => {
    if (audioChunksRef.current.length > 0) {
      setIsLoading(true);
      
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Send the audio to the server
        const formData = new FormData();
        formData.append('action', 'respond');
        formData.append('session_id', sessionId || '');
        formData.append('audio', audioBlob, 'recording.webm');
        
        const response = await fetch('/api/viva', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to process audio response');
        }
        
        const data = await response.json();
        
        // Update messages and play audio response
        setMessages(prev => [...prev, 
          { role: 'user', content: 'Audio response sent...' },
          { role: 'assistant', content: data.text }
        ]);
        setAudioUrl(data.audio_url);
      } catch (error) {
        console.error('Error processing audio:', error);
        alert('Failed to process your response. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const sendTextResponse = async () => {
    if (!inputText.trim() || !sessionId) return;
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('action', 'respond');
      formData.append('session_id', sessionId);
      formData.append('text', inputText);
      
      const response = await fetch('/api/viva', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to send text response');
      }
      
      const data = await response.json();
      
      // Update messages and play audio response
      setMessages(prev => [...prev, 
        { role: 'user', content: inputText },
        { role: 'assistant', content: data.text }
      ]);
      setAudioUrl(data.audio_url);
      setInputText('');
    } catch (error) {
      console.error('Error sending text response:', error);
      alert('Failed to send your response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  };
  
  const resetSession = () => {
    setSessionId(null);
    setMessages([]);
    setAudioUrl(null);
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Voice VIVA Assistant</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="md:col-span-1">
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
                  disabled={!!sessionId}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="topic">Topic (optional)</Label>
                <Input 
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Artificial Intelligence"
                  disabled={!!sessionId}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select 
                  value={difficulty} 
                  onValueChange={setDifficulty}
                  disabled={!!sessionId}
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
                  disabled={!!sessionId}
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
              {!sessionId ? (
                <Button 
                  onClick={startViva} 
                  disabled={!subject || isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Starting...' : 'Start VIVA'}
                </Button>
              ) : (
                <Button 
                  onClick={resetSession} 
                  variant="outline" 
                  className="w-full"
                >
                  Reset Session
                </Button>
              )}
            </CardFooter>
          </Card>
          
          {sessionId && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Audio Controls</CardTitle>
              </CardHeader>
              <CardContent>
                {audioUrl && (
                  <div className="flex flex-col space-y-2">
                    <audio ref={audioRef} src={audioUrl} className="w-full" controls />
                    <Button onClick={playAudio} size="sm" className="w-full">
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Replay Response
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* VIVA Conversation Area */}
        <div className="md:col-span-2">
          <Card className="h-[650px] flex flex-col">
            <CardHeader>
              <CardTitle>
                {sessionId 
                  ? `VIVA Session: ${subject}${topic ? ` - ${topic}` : ''}`
                  : 'Start a session to begin'
                }
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-grow overflow-hidden">
              {sessionId ? (
                <ScrollArea className="h-[450px] pr-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div 
                        key={index} 
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Configure your settings and start a VIVA session
                </div>
              )}
            </CardContent>
            
            <Separator />
            
            <CardFooter className="p-4">
              {sessionId && (
                <Tabs defaultValue="voice" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="voice">Voice Response</TabsTrigger>
                    <TabsTrigger value="text">Text Response</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="voice" className="mt-4">
                    <div className="flex justify-center">
                      <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isLoading}
                        size="lg"
                        variant={isRecording ? "destructive" : "default"}
                        className="rounded-full h-16 w-16"
                      >
                        {/* {isRecording ? (
                          < className="h-6 w-6" />
                        ) : (
                          < className="h-6 w-6" />
                        )} */}
                      </Button>
                    </div>
                    <p className="text-center mt-2 text-sm text-muted-foreground">
                      {isRecording 
                        ? 'Recording... Click to stop' 
                        : 'Click to start recording your answer'
                      }
                    </p>
                  </TabsContent>
                  
                  <TabsContent value="text" className="mt-4">
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="Type your response..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <Button 
                        onClick={sendTextResponse}
                        disabled={!inputText.trim() || isLoading}
                        className="self-end"
                      >
                        <SendIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

