"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { getAppointmentsForWeek } from "@/server/actions/appointments";
import { WeeklyCalendar } from "@/components/dashboard/weekly-calendar";

function getMonday(d: Date): string {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return dt.toISOString().split("T")[0];
}

export function CalendarView() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  const fetchWeek = useCallback((ws: string) => {
    startTransition(async () => {
      const data = await getAppointmentsForWeek(ws);
      setAppointments(data);
    });
  }, []);

  useEffect(() => {
    fetchWeek(weekStart);
  }, [weekStart, fetchWeek]);

  function handleWeekChange(newStart: string) {
    setWeekStart(newStart);
  }

  return (
    <div className="relative">
      {isPending && (
        <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      )}
      <WeeklyCalendar
        appointments={appointments}
        weekStart={new Date(weekStart)}
        onWeekChange={handleWeekChange}
      />
    </div>
  );
}
