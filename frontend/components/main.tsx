import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createContext } from 'react';

// Create a context to share user data
export const UserContext = createContext<{
    user: any;
    role: string | null;
    avatar_url: string | null;
} | null>(null);

export default async function Main({children}: {children: React.ReactNode}) {
    const supabase = await createClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        redirect('/login');
    }

    // Get user profile data including role
    const { data, error: dbError} = await supabase
        .from("profiles")
        .select("role, avatar_url")
        .eq("id", user?.id)
        .single();
    
    if (dbError) {
        console.error("Error fetching user profile:", dbError);
    }
    
    // Create the context value with user data
    const userContextValue = {
        user,
        role: data?.role || null,
        avatar_url: data?.avatar_url || null
    };
    
    return (
        <UserContext.Provider value={userContextValue}>
            {children}
        </UserContext.Provider>
    );
}
