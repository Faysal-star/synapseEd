'use client'
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('message') || 'An unknown error occurred'
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <h1 className="text-4xl font-bold mb-4">Error</h1>
        <p className="text-lg">{errorMessage}</p>
        <a href="/" className="mt-4 text-blue-500 hover:underline">
          Go back to Home
        </a>
        <a href="/login" className="mt-4 text-blue-500 hover:underline">
          Go back to Login
        </a>
      </div>
    </Suspense>
  )
}