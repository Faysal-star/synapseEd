"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import prisma from "@/lib/prisma";

// Create a client-side context for user data
export const ClientUserContext = createContext<{
  user: any;
  role: string | null;
  courses: any[] | null;
  isLoading: boolean;
}>({
  user: null,
  role: null,
  courses: [],
  isLoading: true,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          // Get user profile data including role
          const response = await fetch("/api/user");
          if (!response.ok) {
            throw new Error("Failed to fetch user data from API");
          }

          const userData = await response.json();
          setUser(userData.user);
          setRole(userData.role);
          setCourses(userData.courses || []);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <ClientUserContext.Provider value={{ user, role, isLoading, courses }}>
      {children}
    </ClientUserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(ClientUserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
