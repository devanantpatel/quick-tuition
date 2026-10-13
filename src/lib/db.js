import { supabase } from './supabase';

// 1. Profiles & User Data
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) console.error('getProfile error:', error);
  return data;
}

export async function upsertProfile(profile) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single();
  if (error) console.error('upsertProfile error:', error);
  return data;
}

// 2. Subjects / Courses
export async function fetchAllSubjects() {
  const { data, error } = await supabase
    .from('teacher_subjects')
    .select('*, profiles(name, headline, rate_per_min, is_online)');
  if (error) console.error('fetchSubjects error:', error);
  return data || [];
}

export async function createSubject(subjectData) {
  const { data, error } = await supabase
    .from('teacher_subjects')
    .insert(subjectData)
    .select()
    .single();
  if (error) console.error('createSubject error:', error);
  return data;
}

// 3. Bookings & Requests
export async function createBooking(bookingData) {
  const { data, error } = await supabase
    .from('session_bookings')
    .insert(bookingData)
    .select()
    .single();
  if (error) console.error('createBooking error:', error);
  return data;
}

export async function fetchUserBookings(userId, role) {
  const query = supabase.from('session_bookings').select('*');
  if (role === 'teacher') {
    query.eq('teacher_id', userId);
  } else {
    query.eq('student_id', userId);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) console.error('fetchBookings error:', error);
  return data || [];
}

export async function updateBookingStatus(bookingId, status) {
  const { data, error } = await supabase
    .from('session_bookings')
    .update({ status })
    .eq('id', bookingId)
    .select()
    .single();
  if (error) console.error('updateBooking error:', error);
  return data;
}

// 4. Invoices & Ratings
export async function saveSessionInvoice(invoiceData) {
  const { data, error } = await supabase
    .from('session_invoices')
    .insert(invoiceData)
    .select()
    .single();
  if (error) console.error('saveInvoice error:', error);
  return data;
}