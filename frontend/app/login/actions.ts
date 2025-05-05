'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Type casting with appropriate checks
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Type casting with proper null checks
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const role = formData.get('role') as string
  const avatarFile = formData.get('avatar') as File | null

  // 1. Sign up the user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (signUpError || !signUpData.user) {
    console.error('Sign up error:', signUpError)
    return redirect('/error')
  }

  const user = signUpData.user
  let avatarUrl = ''

  // 2. Upload avatar if provided
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop()
    const filePath = `avatars/${uuidv4()}.${fileExt}` // Store avatar under 'avatars' folder

    const { error: uploadError } = await supabase.storage
      .from('avatars') // Ensure this is the correct bucket name
      .upload(filePath, avatarFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: avatarFile.type,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return redirect('/error')
    }
    // Get the public URL of the uploaded avatar image
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    if (!publicUrlData?.publicUrl) {
      console.error('Error getting file public URL')
      return redirect('/error')
    }
    avatarUrl = publicUrlData.publicUrl
  }

  // 3. Insert user profile data into the 'profiles' table
  const { error: insertError } = await supabase.from('profiles').insert({
    id: user.id, // Ensure the 'id' is set to the user's authenticated ID
    name,
    email,
    role,
    avatar_url: avatarUrl, // The URL of the uploaded avatar
  })

  if (insertError) {
    console.error('Insert profile error:', insertError)
    return redirect('/error')
  }

  // Optional: trigger revalidation (if you're using Next.js Incremental Static Regeneration)
//   revalidatePath('/', 'layout'); // Revalidate the root layout

  // Redirect the user to the homepage after successful sign up and profile creation
  return redirect('/')
}
