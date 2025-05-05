"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

// Create a client-side context for user data
export const ClientUserContext = createContext<{
  user: any;
  role: string | null;
  isLoading: boolean;
}>({
  user: null,
  role: null,
  isLoading: true,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
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
          const { data } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", authUser.id)
            .single();

          setUser(authUser);
          setRole(data?.role || null);
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
    <ClientUserContext.Provider value={{ user, role, isLoading }}>
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
