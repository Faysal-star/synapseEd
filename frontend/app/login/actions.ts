'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

import { createClient } from '@/utils/supabase/server'
import { createClient as c } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Type casting with appropriate checks
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(`/error?message=${error.message}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const supabaseAdmin = c(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

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
    redirect(`/error?message=${"Signup error:" + signUpError?.message}`)
  }

  const user = signUpData.user
  let avatarUrl = ''

  // 2. Upload avatar if provided
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop()
    const filePath = `avatars/${uuidv4()}.${fileExt}` // Store avatar under 'avatars' folder

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars') // Ensure this is the correct bucket name
      .upload(filePath, avatarFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: avatarFile.type,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      redirect(`/error?message=${"Upload error: "+uploadError.message}`)
    }
    // Get the public URL of the uploaded avatar image
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath)

    if (!publicUrlData?.publicUrl) {
      console.error('Error getting file public URL')
      redirect(`/error?message=${"Error getting file public URL"}`)
    }
    avatarUrl = publicUrlData.publicUrl
  }

  // 3. Insert user profile data into the 'profiles' table
  const data = await prisma.profile.create({
    data: {
      id: user.id,
      email: email,
      name: name || null,
      role: role,
      avatarUrl: avatarUrl || null,
    },
  })

  if (!data) {
    //console.error('Insert profile error:', insertError)
    redirect(`/error?message=${"Insert Error): "+data}`)
  }

  // Optional: trigger revalidation (if you're using Next.js Incremental Static Regeneration)
//   revalidatePath('/', 'layout'); // Revalidate the root layout

  // Redirect the user to the homepage after successful sign up and profile creation
  return redirect('/')
}
