import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useClassroomSync(roomId = 'live_room_default') {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef(null);
  const listenersRef = useRef({});

  useEffect(() => {
    if (!roomId) return;

    const channelName = `room_${roomId}`;
    
    // Create Supabase channel with broadcast enabled
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
      },
    });

    // Listen to all broadcast events
    channel
      .on('broadcast', { event: '*' }, (message) => {
        const { event, payload } = message;
        if (listenersRef.current[event]) {
          listenersRef.current[event](payload);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId]);

  // Reliable broadcast sender
  const broadcast = useCallback((event, payload) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: event,
        payload: payload,
      });
    }
  }, []);

  // Event listener registry
  const registerListener = useCallback((event, callback) => {
    listenersRef.current[event] = callback;
  }, []);

  return { isConnected, broadcast, registerListener };
}