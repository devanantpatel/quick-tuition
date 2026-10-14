import { supabase } from './supabase';

// --- Profiles & Payment Info ---
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

export async function updateTeacherPayoutDetails(userId, payoutDetails) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      upi_id: payoutDetails.upiId,
      bank_account_no: payoutDetails.bankDetails?.accountNumber || payoutDetails.accountNo,
      bank_ifsc: payoutDetails.bankDetails?.ifsc || payoutDetails.ifsc,
      bank_holder_name: payoutDetails.bankDetails?.accountName || payoutDetails.holderName,
      qr_code_url: payoutDetails.qrCodeUrl,
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTeacherOnlineStatus(userId, isOnline) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_online: isOnline })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Subjects CRUD ---
export async function fetchAllSubjects() {
  const { data, error } = await supabase
    .from('teacher_subjects')
    .select('*, profiles(name, headline, rate_per_min, is_online)');
  if (error) console.error('fetchAllSubjects error:', error);
  return data || [];
}

export async function fetchTeacherSubjects(teacherId) {
  let query = supabase.from('teacher_subjects').select('*');
  if (teacherId) {
    query = query.eq('teacher_id', teacherId);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) console.error('fetchTeacherSubjects error:', error);
  return data || [];
}

export async function createSubject(subjectData) {
  const { data, error } = await supabase
    .from('teacher_subjects')
    .insert(subjectData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubject(subjectId, updatedFields) {
  const { data, error } = await supabase
    .from('teacher_subjects')
    .update(updatedFields)
    .eq('id', subjectId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(subjectId) {
  const { error } = await supabase
    .from('teacher_subjects')
    .delete()
    .eq('id', subjectId);
  if (error) throw error;
  return true;
}

// --- Schedule Slots CRUD ---
export async function fetchTeacherSchedules(teacherId) {
  const { data, error } = await supabase
    .from('teacher_schedules')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: true });
  if (error) console.error('fetchSchedules error:', error);
  return data || [];
}

export async function addTeacherScheduleSlot(slotData) {
  const { data, error } = await supabase
    .from('teacher_schedules')
    .insert(slotData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTeacherScheduleSlot(slotId, slotData) {
  const { data, error } = await supabase
    .from('teacher_schedules')
    .update({
      day_of_week: Array.isArray(slotData.days) ? slotData.days[0] : slotData.days,
      start_time: slotData.startTime,
      end_time: slotData.endTime,
      is_active: slotData.isActive ?? true,
    })
    .eq('id', slotId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTeacherScheduleSlot(slotId) {
  const { error } = await supabase
    .from('teacher_schedules')
    .delete()
    .eq('id', slotId);
  if (error) throw error;
  return true;
}

// --- Bookings CRUD ---
export async function createBooking(bookingData) {
  const payload = {
    ...bookingData,
    start_time: bookingData.start_time || bookingData.slot_time || 'Flexible Timing',
    slot_time: bookingData.slot_time || bookingData.start_time || 'Flexible Timing'
  };

  const { data, error } = await supabase
    .from('session_bookings')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchUserBookings(userId, role) {
  let query = supabase.from('session_bookings').select('*');
  if (role === 'teacher') {
    query = query.eq('teacher_id', userId);
  } else {
    query = query.eq('student_id', userId);
  }
  
  const { data, error } = await query
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

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
  if (error) throw error;
  return data;
}

export async function cancelOrDeleteBooking(bookingId) {
  const { data, error } = await supabase
    .from('session_bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    const { error: delError } = await supabase
      .from('session_bookings')
      .delete()
      .eq('id', bookingId);
    if (delError) throw delError;
    return true;
  }
  return data;
}

// --- Invoices ---
export async function saveSessionInvoice(invoiceData) {
  const payload = {
    booking_id: invoiceData.booking_id,
    student_id: invoiceData.student_id,
    teacher_id: invoiceData.teacher_id,
    total_seconds: invoiceData.total_seconds || (invoiceData.duration_mins ? invoiceData.duration_mins * 60 : 0),
    billable_amount: invoiceData.billable_amount ?? invoiceData.total_amount ?? 0,
    rating: invoiceData.rating || 5,
    feedback: invoiceData.feedback || '',
    payment_status: invoiceData.payment_status || 'paid'
  };

  const { data, error } = await supabase
    .from('session_invoices')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('saveSessionInvoice error:', error);
    throw error;
  }
  return data;
}
// --- Room Lifecycle & Notes Helpers ---

// 1. Teacher creates/activates live room
export async function activateBookingRoom(bookingId) {
  const { data, error } = await supabase
    .from('session_bookings')
    .update({
      room_status: 'active',
      room_created_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    console.error('activateBookingRoom error:', error);
    throw error;
  }
  return data;
}

// 2. Teacher ends/destroys room
export async function destroyBookingRoom(bookingId) {
  const { data, error } = await supabase
    .from('session_bookings')
    .update({
      room_status: 'destroyed',
      room_destroyed_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    console.error('destroyBookingRoom error:', error);
    throw error;
  }
  return data;
}

// 3. Save Whiteboard & Code Notes to session record
export async function saveSessionNotes(bookingId, { whiteboardNotes, codeNotes }) {
  const { data, error } = await supabase
    .from('session_bookings')
    .update({
      whiteboard_notes: whiteboardNotes || null,
      code_notes: codeNotes || null
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    console.error('saveSessionNotes error:', error);
    throw error;
  }
  return data;
}

// 4. Update Payment Status & Send Reminder
export async function updateSessionPaymentStatus(bookingId, status) {
  const { data, error } = await supabase
    .from('session_bookings')
    .update({ payment_status: status })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function sendPaymentReminder(bookingId) {
  const { data, error } = await supabase
    .from('session_invoices')
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .select();

  if (error) {
    console.error('sendPaymentReminder error:', error);
  }
  return data;
}