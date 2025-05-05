'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the AIWhiteboard component to avoid SSR issues with tldraw
const AIWhiteboard = dynamic(
  () => import('@/components/dashboard_pages/ai_whiteboard/ai_whiteboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gray-900 text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading Whiteboard...</p>
        </div>
      </div>
    )
  }
);

const WhiteboardPage = () => {
  return (
    <div className="h-[100vh] w-full">
      <AIWhiteboard />
    </div>
  );
};

export default WhiteboardPage;