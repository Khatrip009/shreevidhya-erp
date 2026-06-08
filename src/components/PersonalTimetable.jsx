import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import toast from "react-hot-toast";
import AdminLayout from "../layouts/AdminLayout";
import { supabase } from "../api/supabase";
import { useAuth } from "../context/AuthContext";

export default function PersonalTimetable() {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);

  // 1. Resolve teacher / student ID
  const { data: personId, isLoading: personLoading } = useQuery({
    queryKey: ["person-id", profile?.id, profile?.role],
    queryFn: async () => {
      if (!profile?.id) return null;
      if (profile.role === "Teacher") {
        const { data } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", profile.id)
          .maybeSingle();
        return data?.id ?? null;
      }
      if (profile.role === "Student") {
        const { data } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", profile.id)
          .maybeSingle();
        return data?.id ?? null;
      }
      return null;
    },
    enabled: !!profile?.id,
  });

  // 2. Fetch batches directly (teacher_id / student_batches)
  const {
    data: batches = [],
    isLoading: batchesLoading,
    error,
  } = useQuery({
    queryKey: ["timetable-batches", personId, profile?.role],
    queryFn: async () => {
      if (!personId) return [];

      

      if (profile.role === "Teacher") {
        // Query all active batches assigned to this teacher
        const { data, error } = await supabase
          .from("batches")
          .select(`id, batch_name, start_date, end_date, days, start_time, end_time, courses ( course_name )`)
          .eq("teacher_id", personId)
          .eq("status", "active");

        if (error) throw error;

        // Filter out batches without schedule days (client‑side – more reliable)
        const filtered = (data || []).filter((b) => b.days);
        
        return filtered;
      }

      if (profile.role === "Student") {
        // Student → via student_batches
        const { data: links, error } = await supabase
          .from("student_batches")
          .select(`batch_id, batches ( id, batch_name, start_date, end_date, days, start_time, end_time, courses ( course_name ) )`)
          .eq("student_id", personId)
          .eq("status", "active");

        if (error) throw error;

        const batches = (links || [])
          .map((l) => l.batches)
          .filter((b) => b && b.days);
        
        return batches;
      }

      return [];
    },
    enabled: !!personId,
  });

  // 3. Convert batches to FullCalendar events
  useEffect(() => {
  if (!batches.length) {
    setEvents([]);
    return;
  }

  const calendarEvents = [];
  const today = new Date();
  const futureLimit = new Date();
  futureLimit.setDate(today.getDate() + 56);

  const dayMap = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  };

  batches.forEach((batch) => {
    if (!batch.start_date || !batch.end_date || !batch.days) return;

    const startDateObj = new Date(batch.start_date);
    const endDateObj = new Date(batch.end_date);
    const effectiveEnd = endDateObj > futureLimit ? futureLimit : endDateObj;

    const daysOfWeek = batch.days
      .split(",")
      .map((d) => dayMap[d.trim().toLowerCase().substring(0, 3)])
      .filter((d) => d !== undefined);

    if (daysOfWeek.length === 0) return;

    const current = new Date(startDateObj);
    while (current <= effectiveEnd) {
      if (daysOfWeek.includes(current.getDay())) {
        const eventStart = new Date(current);
        const [startHour, startMinute] = (batch.start_time || "").split(":");
        eventStart.setHours(parseInt(startHour) || 0, parseInt(startMinute) || 0, 0);

        const eventEnd = new Date(current);
        const [endHour, endMinute] = (batch.end_time || "").split(":");
        eventEnd.setHours(parseInt(endHour) || 0, parseInt(endMinute) || 0, 0);

        calendarEvents.push({
          id: `${batch.id}-${current.toISOString().split("T")[0]}`,
          title: `${batch.batch_name} (${batch.courses?.course_name || "No course"})`,
          start: eventStart.toISOString(),
          end: eventEnd.toISOString(),
        });
      }
      current.setDate(current.getDate() + 1);
    }
  });
  setEvents(calendarEvents);
}, [batches]);

    
   

  const isLoading = personLoading || batchesLoading;

  if (error) toast.error("Failed to load timetable");

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">My Timetable</h1>
        <p className="text-sm text-secondary-dark font-montserrat mt-1">
          Your class schedule for the upcoming weeks
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden p-4 border border-secondary-light">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={40} className="text-primary animate-spin mb-3" />
            <p className="text-secondary-dark">Loading…</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-secondary">
            <CalendarIcon size={48} className="text-secondary-light mb-3" />
            <p className="text-lg font-medium">No classes scheduled yet</p>
            <p className="text-sm">You are not assigned to any batches with a fixed schedule.</p>
          </div>
        ) : (
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridWeek,timeGridDay",
            }}
            events={events}
            height="auto"
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            nowIndicator={true}
            editable={false}
            selectable={false}
            weekends={true}
            firstDay={1}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}