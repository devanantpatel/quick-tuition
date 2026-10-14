import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  getProfile, 
  upsertProfile, 
  fetchAllSubjects, 
  createSubject, 
  createBooking, 
  fetchUserBookings, 
  updateBookingStatus,
  cancelOrDeleteBooking
} from '../lib/db';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('landing');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState('student');
  const [isTeacherOnline, setIsTeacherOnline] = useState(true);

  // Active Live Classroom Session (Binds Teacher & Student to same dynamic Room ID)
  const [activeSession, setActiveSession] = useState(null);

  // Database Data States
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Check Active Session on Mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          if (profile) {
            setCurrentUser(profile);
            setActiveTab(profile.role === 'teacher' ? 'teacher' : 'student');
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        if (profile) {
          setCurrentUser(profile);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 2. Fetch Catalog Subjects
  const loadSubjects = async () => {
    const data = await fetchAllSubjects();
    if (data && data.length > 0) {
      const formatted = data.map((sub) => ({
        id: sub.id,
        title: sub.title,
        rate: Number(sub.rate) || 5,
        freeMins: sub.free_mins || 10,
        tutorName: sub.profiles?.name || 'Tutor',
        tutorExp: sub.profiles?.headline || 'Verified Mentor',
        tutorRating: '4.9',
        isOnline: sub.profiles?.is_online ?? true,
        chapters: sub.chapters || []
      }));
      setTeacherSubjects(formatted);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  // 3. Load Bookings for Active User & Listen for Realtime Changes
  useEffect(() => {
    if (!currentUser) return;

    const loadBookings = async () => {
      const bookings = await fetchUserBookings(currentUser.id, currentUser.role);
      setRequests(bookings);
    };

    loadBookings();

    const bookingChannel = supabase
      .channel('public:session_bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_bookings' },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
    };
  }, [currentUser]);

  // Auth Operations
  const loginUser = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    const profile = await getProfile(data.user.id);
    setCurrentUser(profile);
    setActiveTab(profile.role === 'teacher' ? 'teacher' : 'student');
    setIsAuthModalOpen(false);
    return profile;
  };

  const registerUser = async ({ email, password, name, role, headline }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('Registration failed');

    const profileData = {
      id: data.user.id,
      name,
      email,
      role,
      headline: headline || (role === 'teacher' ? 'Verified Mentor' : 'Student Learner'),
      is_online: true
    };

    const savedProfile = await upsertProfile(profileData);
    setCurrentUser(savedProfile);
    setActiveTab(role === 'teacher' ? 'teacher' : 'student');
    setIsAuthModalOpen(false);
    return savedProfile;
  };

  const logoutUser = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setActiveSession(null);
    setActiveTab('landing');
  };

  // Add Subject (Teacher)
  const addSubject = async (newSub) => {
    if (!currentUser) return;
    const inserted = await createSubject({
      teacher_id: currentUser.id,
      title: newSub.title,
      rate: newSub.rate,
      free_mins: newSub.freeMins || 10,
      chapters: newSub.chapters || []
    });
    await loadSubjects();
    return inserted;
  };

  // Book a Session (Student)
  const addRequest = async (newReq) => {
    if (!currentUser) return;
    const inserted = await createBooking({
      student_id: currentUser.id,
      teacher_id: newReq.teacherId || currentUser.id,
      subject_title: newReq.subject,
      topic: newReq.topic,
      slot_time: newReq.time,
      status: 'pending'
    });
    return inserted;
  };

  // Accept/Reject Booking (Teacher)
  const updateStatus = async (id, status) => {
    await updateBookingStatus(id, status);
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  // Cancel Booking (Student or Teacher)
  const cancelBooking = async (id) => {
    await cancelOrDeleteBooking(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  // Helper to Launch Live Classroom
  const startClassroomSession = (booking) => {
    setActiveSession(booking);
    setActiveTab('classroom');
  };

  const openAuthModal = (role = 'student') => {
    setAuthDefaultRole(role);
    setIsAuthModalOpen(true);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isLoading,
        activeTab,
        setActiveTab,
        activeSession,
        setActiveSession,
        startClassroomSession,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authDefaultRole,
        openAuthModal,
        login: loginUser,
        register: registerUser,
        logout: logoutUser,
        isTeacherOnline,
        setIsTeacherOnline,
        teacherSubjects,
        setTeacherSubjects,
        addSubject,
        requests,
        addRequest,
        updateRequestStatus: updateStatus,
        cancelBooking,
        loadSubjects
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}