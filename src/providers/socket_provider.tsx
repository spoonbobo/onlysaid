"use client";

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
// import { User } from '@/types/user';

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const dispatch = useDispatch();
  const isSocketConnected = useSelector((state: RootState) => state.chat.isSocketConnected);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  useEffect(() => {
    // Add debugging logs
    // console.log("SocketProvider useEffect running with:", {
    //   sessionExists: !!session,
    //   isSocketConnected,
    //   currentUserExists: !!currentUser,
    //   currentUserId: currentUser?.id
    // });

    // Initialize socket when session is available
    if (session && currentUser) {
      // Always initialize on component mount, regardless of isSocketConnected state
      console.log("Initializing socket connection from SocketProvider");

      const user = {
        id: currentUser.id,
        username: currentUser?.username || "",
        email: currentUser?.email || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active_rooms: [],
        archived_rooms: [],
        avatar: currentUser?.avatar || "",
      };

      // console.log("Dispatching initializeSocket with user:", user);

      // Dispatch action to initialize socket
      dispatch({ type: 'chat/initializeSocket', payload: user });
    }

    // Clean up function for when the provider unmounts or session changes
    return () => {
      // Only disconnect if the session is gone (user logged out)
      if (!session && isSocketConnected) {
        console.log("Disconnecting socket due to session change");
        dispatch({ type: 'chat/disconnectSocket' });
      }
    };
  }, [session, dispatch, currentUser]);

  return <>{children}</>;
} 