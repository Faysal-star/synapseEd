import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
            return NextResponse.json({
                user: null,
                role: null,
                courses: []
            })
        }

        // Get user profile from database
        const userProfile = await prisma.profile.findUnique({
            where: { email: authUser.email! },
            include: {
                courses: true, // Include courses relation
            },
        })

        // Return user data
        return NextResponse.json({
            user: authUser,
            role: userProfile?.role || null,
            courses: userProfile?.courses || []
        })
    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
}