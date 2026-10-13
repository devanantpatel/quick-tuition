import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useClassroomSync(roomId = 'quick_tuition_room_default') {
  const channelRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const listenersRef = useRef({
    boardStroke: null,
    boardClean: null,
    boardPage: null,
    codeUpdate: null,
    permissionsUpdate: null,
    chatMessage: null,
  });

  useEffect(() => {
    // Agar supabase configured nahi hai to crash hone se bachaye
    if (!supabase || typeof supabase.channel !== 'function') {
      return;
    }

    const channel = supabase.channel(`room_${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'board:stroke' }, ({ payload }) => {
        if (listenersRef.current.boardStroke) listenersRef.current.boardStroke(payload);
      })
      .on('broadcast', { event: 'board:clean' }, ({ payload }) => {
        if (listenersRef.current.boardClean) listenersRef.current.boardClean(payload);
      })
      .on('broadcast', { event: 'board:page' }, ({ payload }) => {
        if (listenersRef.current.boardPage) listenersRef.current.boardPage(payload);
      })
      .on('broadcast', { event: 'code:update' }, ({ payload }) => {
        if (listenersRef.current.codeUpdate) listenersRef.current.codeUpdate(payload);
      })
      .on('broadcast', { event: 'host:permissions' }, ({ payload }) => {
        if (listenersRef.current.permissionsUpdate) listenersRef.current.permissionsUpdate(payload);
      })
      .on('broadcast', { event: 'chat:message' }, ({ payload }) => {
        if (listenersRef.current.chatMessage) listenersRef.current.chatMessage(payload);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const broadcast = useCallback((event, payload) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  }, []);

  const registerListener = useCallback((eventName, callback) => {
    listenersRef.current[eventName] = callback;
  }, []);

  return {
    isConnected,
    broadcast,
    registerListener,
  };
}