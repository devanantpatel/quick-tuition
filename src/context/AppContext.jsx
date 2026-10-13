import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

// Pre-seeded accounts for testing
const SEED_USERS = [
  {
    id: 'u_teacher_1',
    name: 'Anant Patel',
    email: 'anant@tutor.com',
    role: 'teacher',
    phone: '7607765685',
    bio: 'Maths & Full-Stack Mentor',
    headline: 'IIT JEE & React Specialist (3+ yrs exp)'
  },
  {
    id: 'u_student_1',
    name: 'Rahul Verma',
    email: 'rahul@student.com',
    role: 'student',
    phone: '9876543210',
    bio: 'Class 12th PCM Student',
    headline: 'Preparing for JEE Main'
  }
];

export function AppProvider({ children }) {
  // 1. Session Persistence: Check localStorage on load
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('qt_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('qt_user');
      if (saved) {
        const u = JSON.parse(saved);
        return u.role === 'teacher' ? 'teacher' : 'student';
      }
    } catch {}
    return 'landing';
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState('student');

  // Teacher Online State
  const [isTeacherOnline, setIsTeacherOnline] = useState(true);

  // User Accounts Database (Saved in localStorage)
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('qt_users_db');
      return saved ? JSON.parse(saved) : SEED_USERS;
    } catch {
      return SEED_USERS;
    }
  });

  // Global Courses/Subjects
  const [teacherSubjects, setTeacherSubjects] = useState([
    {
      id: 1,
      title: 'Mathematics (Calculus & Vectors)',
      rate: 5,
      freeMins: 10,
      tutorName: 'Anant Patel',
      tutorExp: '3+ yrs exp • IIT JEE Specialist',
      tutorRating: '4.9',
      isOnline: true,
      chapters: [
        {
          id: 101,
          name: 'Differential Equations',
          topics: ['First Order ODE', 'Homogeneous Equations', 'Separation of Variables']
        },
        {
          id: 102,
          name: 'Linear Algebra',
          topics: ['Matrices & Determinants', 'Eigenvalues & Vectors']
        }
      ]
    },
    {
      id: 2,
      title: 'Full-Stack Web Development',
      rate: 8,
      freeMins: 10,
      tutorName: 'Rahul Sharma',
      tutorExp: 'Senior Frontend Dev • React/Node',
      tutorRating: '4.8',
      isOnline: true,
      chapters: [
        {
          id: 201,
          name: 'React.js State Architecture',
          topics: ['Hooks Lifecycle (useEffect/useMemo)', 'Zustand & Context API', 'Custom Hooks']
        }
      ]
    }
  ]);

  // Session Requests State
  const [requests, setRequests] = useState([
    {
      id: 1,
      studentName: 'Rahul Verma',
      subject: 'Mathematics (Calculus & Vectors)',
      topic: 'First Order ODE',
      time: '06:00 PM - 07:00 PM',
      status: 'pending'
    }
  ]);

  // Sync users to storage
  useEffect(() => {
    localStorage.setItem('qt_users_db', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  // Login handler
  const login = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('qt_user', JSON.stringify(userData));
    setActiveTab(userData.role === 'teacher' ? 'teacher' : 'student');
    setIsAuthModalOpen(false);
  };

  // Register handler
  const register = (newUserData) => {
    const user = {
      id: 'u_' + Date.now(),
      ...newUserData
    };
    setRegisteredUsers((prev) => [...prev, user]);
    login(user);
  };

  // Logout handler
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('qt_user');
    setActiveTab('landing');
  };

  // Open modal with pre-selected role
  const openAuthModal = (role = 'student') => {
    setAuthDefaultRole(role);
    setIsAuthModalOpen(true);
  };

  const addSubject = (newSub) => {
    setTeacherSubjects((prev) => [...prev, newSub]);
  };

  const addRequest = (newReq) => {
    setRequests((prev) => [newReq, ...prev]);
  };

  const updateRequestStatus = (id, status) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeTab,
        setActiveTab,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authDefaultRole,
        openAuthModal,
        registeredUsers,
        login,
        register,
        logout,
        isTeacherOnline,
        setIsTeacherOnline,
        teacherSubjects,
        setTeacherSubjects,
        addSubject,
        requests,
        addRequest,
        updateRequestStatus
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}