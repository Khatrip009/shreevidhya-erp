import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { supabase } from "../api/supabase";
import AdminLayout from "../layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function CalendarPage() {
  const [events, setEvents] = useState([]);

  // Fetch batches with course and teacher info
  const { data: batches, isLoading } = useQuery({
    queryKey: ["calendar-batches"],
    queryFn: async () => {
      // 1. Fetch batches with course and teacher (via batch_teachers)
      const { data, error } = await supabase
        .from("batches")
        .select(`
          *,
          course:courses(id, course_name),
          batch_teachers(teacher:teachers(id, first_name, last_name))
        `)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  // Convert batches to FullCalendar events (handling repeat days)
  useEffect(() => {
    if (!batches) return;

    const calendarEvents = [];

    batches.forEach((batch) => {
      const { id, batch_name, start_date, end_date, days, start_time, end_time, course } = batch;
      if (!start_date || !end_date || !days) return;

      // Parse days of week (e.g., "Monday,Wednesday,Friday")
      const daysOfWeek = days.split(",").map((day) => {
        const dayMap = {
          Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
          Thursday: 4, Friday: 5, Saturday: 6,
        };
        return dayMap[day.trim()];
      }).filter(d => d !== undefined);

      if (daysOfWeek.length === 0) return;

      // Generate events for each occurrence between start_date and end_date
      const start = new Date(start_date);
      const end = new Date(end_date);
      const current = new Date(start);

      // Create a map of days in the range
      while (current <= end) {
        const dayOfWeek = current.getDay(); // 0 = Sunday
        if (daysOfWeek.includes(dayOfWeek)) {
          // Create event for this specific date
          const eventStart = new Date(current);
          const [startHour, startMinute] = start_time.split(":");
          eventStart.setHours(parseInt(startHour), parseInt(startMinute), 0);

          const eventEnd = new Date(current);
          const [endHour, endMinute] = end_time.split(":");
          eventEnd.setHours(parseInt(endHour), parseInt(endMinute), 0);

          // Teacher names
          const teachers = batch.batch_teachers?.map(bt => 
            `${bt.teacher.first_name} ${bt.teacher.last_name}`
          ).join(", ") || "No teacher";

          calendarEvents.push({
            id: `${id}-${current.toISOString().split("T")[0]}`,
            title: `${batch_name} (${course?.course_name || "No course"})`,
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
            extendedProps: {
              batch_id: id,
              teachers,
              start_time,
              end_time,
              days,
            },
          });
        }
        current.setDate(current.getDate() + 1);
      }
    });

    setEvents(calendarEvents);
  }, [batches]);

  const handleEventClick = (info) => {
    const { title, extendedProps } = info.event;
    toast(
      <div>
        <strong>{title}</strong><br />
        Teachers: {extendedProps.teachers}<br />
        Time: {extendedProps.start_time} - {extendedProps.end_time}<br />
        Days: {extendedProps.days}
      </div>,
      { duration: 5000 }
    );
  };

  return (
    <AdminLayout>
      <div className="p-4 bg-white rounded-xl shadow-sm">
        <h1 className="text-2xl font-righteous text-primary-dark mb-4">Class Calendar</h1>
        {isLoading ? (
          <div className="text-center py-10">Loading calendar...</div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            eventClick={handleEventClick}
            height="auto"
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            nowIndicator={true}
            editable={false}
            selectable={false}
          />
        )}
      </div>
    </AdminLayout>
  );
}