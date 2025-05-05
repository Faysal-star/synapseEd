'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)

  return (
    <div className="flex justify-center items-center min-h-[80vh] w-full px-4">
      <Card className="w-full max-w-md border-black dark:border-white bg-white dark:bg-zinc-900 my-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-black dark:text-white text-center">
            {isSignUp ? 'Create Account' : 'Log In'}
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400 text-center">
            {isSignUp
              ? 'Fill in your details to create an account'
              : 'Enter your credentials to log in'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            action={isSignUp ? signup : login}
          >
            {isSignUp && (
              <>
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-black dark:text-white">
                    Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    required
                    className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  />
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-black dark:text-white">
                    Role
                  </Label>
                  <select
                    title='Select Role'
                    id="role"
                    name="role"
                    required
                    className="w-full px-3 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-black dark:text-white"
                  >
                    <option value="">Select Role</option>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>

                {/* Profile Picture */}
                <div className="space-y-2">
                  <Label htmlFor="avatar" className="text-black dark:text-white">
                    Profile Picture
                  </Label>
                  <Input
                    id="avatar"
                    name="avatar"
                    type="file"
                    accept="image/*"
                    required
                    className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-black dark:text-white">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="hello@example.com"
                required
                className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-black dark:text-white">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div className="flex flex-col space-y-3 pt-3">
              <Button
                type="submit"
                className="w-full bg-black hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {isSignUp ? 'Create Account' : 'Log In'}
              </Button>

              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-center text-zinc-600 hover:underline dark:text-zinc-400"
              >
                {isSignUp
                  ? 'Already have an account? Log in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
