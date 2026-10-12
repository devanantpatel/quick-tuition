import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import StudentFilters from './StudentFilters';
import TutorCard from './TutorCard';
import BookingModal from './BookingModal';
import StudentRequests from './StudentRequests';

export default function StudentDashboard() {
  const { 
    currentUser, 
    teacherSubjects, 
    requests, 
    addRequest, 
    setActiveTab 
  } = useApp();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [onlyFree, setOnlyFree] = useState(false);

  // Booking Modal State
  const [selectedCourseForBooking, setSelectedCourseForBooking] = useState(null);

  // Filter Logic
  const filteredCourses = teacherSubjects.filter((course) => {
    // 1. Search Query filter
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.chapters.some(ch => 
        ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.topics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );

    // 2. Category filter
    const matchesCategory = 
      selectedCategory === 'All' || 
      course.title.toLowerCase().includes(selectedCategory.toLowerCase());

    // 3. Free only filter
    const matchesFree = onlyFree ? course.rate === 0 : true;

    return matchesSearch && matchesCategory && matchesFree;
  });

  const handleConfirmBooking = (bookingData) => {
    addRequest({
      id: Date.now(),
      studentName: currentUser?.name || 'You',
      subject: bookingData.subject,
      topic: bookingData.topic,
      time: bookingData.time,
      status: 'pending'
    });
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6 w-full">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-xl md:text-2xl font-bold text-white">Student Dashboard</h2>
        <p className="text-slate-400 text-xs md:text-sm">Browse verified tutors, request instant doubts, and track live session status.</p>
      </div>

      {/* Search & Category Filter Bar */}
      <StudentFilters 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onlyFree={onlyFree}
        setOnlyFree={setOnlyFree}
      />

      {/* Main Grid: Tutors on Left, Requests on Right */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Left: Tutors / Subjects Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">
              Available Tutors & Courses ({filteredCourses.length})
            </h3>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs space-y-2">
              <p>No tutors match your search or filters.</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setOnlyFree(false); }}
                className="text-indigo-400 hover:underline text-xs"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredCourses.map((course) => (
                <TutorCard 
                  key={course.id}
                  course={course}
                  onSelectCourse={(c) => setSelectedCourseForBooking(c)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Active Bookings Queue */}
        <div className="space-y-4">
          <StudentRequests 
            requests={requests}
            onJoinLiveRoom={() => setActiveTab('classroom')}
          />
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal 
        course={selectedCourseForBooking}
        isOpen={Boolean(selectedCourseForBooking)}
        onClose={() => setSelectedCourseForBooking(null)}
        onConfirmBooking={handleConfirmBooking}
      />
    </main>
  );
}