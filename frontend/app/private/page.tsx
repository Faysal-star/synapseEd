import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

export default async function PrivatePage() {
  const supabase = await createClient()

  const { data: {user}, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }

  const { data, error:dbError } = await supabase
        .from("profiles")
        .select("role, avatar_url")
        .eq("id", user?.id)
        .single();
  
  // if (dbError) {
  //   console.error(dbError)
  //   return <div>Error loading user data: {JSON.stringify(dbError, null, 2)}</div>
  // }

  //show the user object
  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold">Private Page</h1>
      <p className="mt-4 text-lg">Welcome to the private page!</p>
      <pre className="mt-4 p-4 bg-gray-100 rounded-lg text-gray-800">
        {JSON.stringify(user, null, 2)}
      </pre>
      <pre className="mt-4 p-4 bg-gray-100 rounded-lg text-gray-800">
        {JSON.stringify(data, null, 2)}
      </pre>
      <a href="/api/logout" className="mt-4 text-blue-500 hover:underline">
        Logout
      </a>
    </div>
  )
}