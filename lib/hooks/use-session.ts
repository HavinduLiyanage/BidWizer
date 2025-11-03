"use client";

import { useSession } from "next-auth/react";
import { Session } from "next-auth";

export function useUserSession() {
  const { data: session, status } = useSession();
  
  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    session,
  };
}

export function useUser() {
  const { user, isLoading, isAuthenticated } = useUserSession();
  
  return {
    user,
    isLoading,
    isAuthenticated,
    // Helper to get user initials for avatars
    initials: user?.name 
      ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
      : user?.email?.[0]?.toUpperCase() || 'U',
  };
}
