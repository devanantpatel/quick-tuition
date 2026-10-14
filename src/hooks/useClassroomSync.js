import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useClassroomSync(roomId = 'live_room_default', userRole = 'student', userName = 'User') {
  const [isConnected, setIsConnected] = useState(false);
  const [peersInRoom, setPeersInRoom] = useState([]);
  const channelRef = useRef(null);
  const listenersRef = useRef({});

  useEffect(() => {
    if (!roomId) return;

    const channelName = `room_${roomId}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: userRole },
      },
    });

    // 1. Broadcast messages (Whiteboard, Code, Chat)
    channel
      .on('broadcast', { event: '*' }, (message) => {
        const { event, payload } = message;
        if (listenersRef.current[event]) {
          listenersRef.current[event](payload);
        }
      })
      // 2. Track Presence (Join / Leave)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeUsers = Object.keys(state).map((key) => ({
          role: key,
          info: state[key][0],
        }));
        setPeersInRoom(activeUsers);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log(`${key} joined the room`);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log(`${key} left the room`);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            name: userName,
            role: userRole,
            joinedAt: new Date().toISOString(),
          });
        } else {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, userRole, userName]);

  const broadcast = useCallback((event, payload) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: event,
        payload: payload,
      });
    }
  }, []);

  const registerListener = useCallback((event, callback) => {
    listenersRef.current[event] = callback;
  }, []);

  return { isConnected, broadcast, registerListener, peersInRoom };
}