'use client';
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useDropzone } from 'react-dropzone';

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [llmProvider, setLlmProvider] = useState('openai');
  const [model, setModel] = useState('');
  const [questionsPerChunk, setQuestionsPerChunk] = useState(3);
  
  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
    });
    
    newSocket.on('status_update', (data) => {
      console.log('Status update:', data);
      setStatus(data.status);
      setMessage(data.message);
      if (data.progress) setProgress(data.progress);
      if (data.questions) setQuestions(data.questions);
    });
    
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  // Join the job room when jobId is set
  useEffect(() => {
    if (socket && jobId) {
      socket.emit('join', { job_id: jobId });
    }
  }, [socket, jobId]);
  
  // File upload handler with react-dropzone
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        uploadFile(acceptedFiles[0]);
      }
    }
  });
  
  // Upload the file to the server
  const uploadFile = async (file) => {
    setStatus('uploading');
    setMessage('Uploading file...');
    setProgress(0);
    setQuestions([]);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('llm_provider', llmProvider);
    formData.append('model', model);
    formData.append('questions_per_chunk', questionsPerChunk);
    
    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.job_id) {
        setJobId(data.job_id);
        setStatus('processing');
      } else {
        setStatus('error');
        setMessage('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('error');
      setMessage('Upload failed: ' + error.message);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          MCQ Question Generator
        </h1>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload PDF Document</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LLM Provider
            </label>
            <select
              value={llmProvider}
              onChange={(e) => setLlmProvider(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="openai">OpenAI</option>
              <option value="google">Google (Gemini)</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Name (optional)
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Leave empty for default model"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Questions Per Chunk
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={questionsPerChunk}
              onChange={(e) => setQuestionsPerChunk(parseInt(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div {...getRootProps()} className={`mt-6 border-2 border-dashed rounded-md p-6 text-center ${status === 'idle' || status === 'error' ? 'border-gray-300 hover:border-blue-500' : 'border-gray-200 bg-gray-50'}`}>
            <input {...getInputProps()} />
            {status === 'idle' || status === 'error' ? (
              <p className="text-gray-500">
                Drag &amp; drop a PDF file here, or click to select a file
              </p>
            ) : (
              <p className="text-gray-400">
                Processing in progress...
              </p>
            )}
          </div>
        </div>
        
        {status !== 'idle' && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Processing Status</h2>
            
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-gray-700">{message}</p>
            </div>
          </div>
        )}
        
        {questions.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Generated Questions ({questions.length})</h2>
            
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-2">
                    {index + 1}. {question.question}
                  </h3>
                  
                  <div className="ml-4 mb-4">
                    {Object.entries(question.options).map(([key, value]) => (
                      <div key={key} className={`flex items-start mb-1 ${question.answer === key ? 'text-green-600 font-medium' : ''}`}>
                        <span className="mr-2">{key}.</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-sm bg-gray-50 p-3 rounded mb-2">
                    <p className="font-medium mb-1">Correct Answer: {question.answer}</p>
                    <p className="font-medium mb-1">Difficulty: {question.difficulty}</p>
                  </div>
                  
                  <div className="text-sm">
                    <p className="font-medium mb-1">Hints:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      {question.hints.map((hint, i) => (
                        <li key={i}>{hint}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => {
                const json = JSON.stringify(questions, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const href = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = href;
                link.download = 'generated_questions.json';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="mt-6 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Download Questions (JSON)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}