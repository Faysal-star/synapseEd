'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import the AIAgentsPage component to enable code-splitting
const AIAgentsPage = dynamic(
  () => import('@/components/dashboard_pages/ai_agents'),
  {
    loading: () => (
      <div className="w-full h-[calc(100vh-64px)] flex flex-col p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        
        {/* Main content skeleton */}
        <div className="flex flex-1 gap-4">
          {/* Sidebar skeleton */}
          <div className="w-72 flex flex-col space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          
          {/* Chat area skeleton */}
          <div className="flex-1 flex flex-col space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="flex-1 space-y-4">
              <div className="flex justify-start">
                <Skeleton className="h-24 w-3/4 rounded-lg" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-16 w-2/3 rounded-lg" />
              </div>
              <div className="flex justify-start">
                <Skeleton className="h-32 w-3/4 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
);

export default function AiAgentsRoute() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AIAgentsPage />
    </Suspense>
  );
}