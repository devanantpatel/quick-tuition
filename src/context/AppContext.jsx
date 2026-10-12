import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Navigation & Auth
  const [activeTab, setActiveTab] = useState('landing'); // 'landing' | 'classroom'
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);

  // Teacher State
  const [isTeacherOnline, setIsTeacherOnline] = useState(true);
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

  // Requests State
  const [requests, setRequests] = useState([
    {
      id: 101,
      studentName: 'Rahul Verma',
      subject: 'Full-Stack Web Development',
      topic: 'React useEffect infinite loop bug (Custom Doubt)',
      time: 'Today, 6:30 PM',
      status: 'pending'
    }
  ]);

const login = (userData) => {
    setCurrentUser(userData);
    // Student login par 'student', Teacher login par 'teacher'
    setActiveTab(userData.role === 'teacher' ? 'teacher' : 'student');
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveTab('landing');
  };

  const addSubject = (newSubject) => {
    setTeacherSubjects((prev) => [...prev, newSubject]);
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
        activeTab,
        setActiveTab,
        authModalOpen,
        setAuthModalOpen,
        authMode,
        setAuthMode,
        currentUser,
        login,
        logout,
        isTeacherOnline,
        setIsTeacherOnline,
        teacherSubjects,
        addSubject,
        requests,
        addRequest,
        updateRequestStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);