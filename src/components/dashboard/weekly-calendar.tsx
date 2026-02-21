"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface AppointmentSlim {
  id: string;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  type?: string | null;
  patient: { id: string; firstName: string; lastName: string };
  dentistProfile?: {
    color?: string | null;
    clinicMember?: { user?: { name?: string | null } | null } | null;
  } | null;
}

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-slate-400",
  CONFIRMED: "bg-blue-500",
  ARRIVED: "bg-amber-500",
  IN_TREATMENT: "bg-orange-500",
  COMPLETED: "bg-green-500",
  NO_SHOW: "bg-red-400",
  CANCELLED: "bg-red-300",
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM – 8 PM

function getWeekDates(base: Date): Date[] {
  const monday = new Date(base);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function WeeklyCalendar({
  appointments,
  weekStart,
  onWeekChange,
}: {
  appointments: AppointmentSlim[];
  weekStart: Date;
  onWeekChange: (newStart: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const today = new Date();

  // Group appointments by day
  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentSlim[]>();
    for (const apt of appointments) {
      const d = new Date(apt.startTime);
      const key = formatDateKey(d);
      const list = map.get(key) ?? [];
      list.push(apt);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  function navigateWeek(delta: number) {
    const d = new Date(weekDates[0]);
    d.setDate(d.getDate() + delta * 7);
    onWeekChange(formatDateKey(d));
  }

  function goToday() {
    onWeekChange(formatDateKey(today));
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-sm font-semibold">
          {weekDates[0].toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          {" – "}
          {weekDates[6].toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </h2>
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day header row */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50">
          <div className="p-2 text-xs text-muted-foreground text-center border-r">
            Time
          </div>
          {weekDates.map((d) => {
            const isToday = isSameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  "p-2 text-center border-r last:border-r-0 text-xs",
                  isToday && "bg-primary/10 font-bold"
                )}
              >
                <div className="uppercase text-muted-foreground">
                  {d.toLocaleDateString("en-IN", { weekday: "short" })}
                </div>
                <div className={cn("text-lg", isToday && "text-primary")}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time rows */}
        <div className="max-h-[600px] overflow-y-auto">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0 min-h-[60px]"
            >
              <div className="p-1 text-[10px] text-muted-foreground text-right pr-2 border-r">
                {hour.toString().padStart(2, "0")}:00
              </div>
              {weekDates.map((d) => {
                const key = formatDateKey(d);
                const dayApts = byDay.get(key) ?? [];
                const hourApts = dayApts.filter((a) => {
                  const h = new Date(a.startTime).getHours();
                  return h === hour;
                });

                return (
                  <div
                    key={d.toISOString()}
                    className="border-r last:border-r-0 p-0.5 relative"
                  >
                    {hourApts.map((apt) => {
                      const start = new Date(apt.startTime);
                      const end = new Date(apt.endTime);
                      const mins = start.getMinutes();
                      const durationMin = Math.max(
                        15,
                        (end.getTime() - start.getTime()) / 60000
                      );
                      const color =
                        apt.dentistProfile?.color ?? "#3B82F6";

                      return (
                        <Link
                          key={apt.id}
                          href={`/dashboard/appointments/${apt.id}`}
                          className={cn(
                            "block rounded text-[10px] leading-tight px-1 py-0.5 mb-0.5 truncate border-l-2 transition-shadow",
                            hoveredId === apt.id && "shadow-md ring-1 ring-primary"
                          )}
                          style={{
                            borderLeftColor: color,
                            backgroundColor: `${color}15`,
                            marginTop: `${(mins / 60) * 100}%`,
                          }}
                          onMouseEnter={() => setHoveredId(apt.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          title={`${start.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} – ${end.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}\n${apt.patient.firstName} ${apt.patient.lastName}\n${apt.type ?? "General"}`}
                        >
                          <span className="font-medium">
                            {start.toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>{" "}
                          <span>
                            {apt.patient.firstName} {apt.patient.lastName.charAt(0)}.
                          </span>
                          <span
                            className={cn(
                              "inline-block w-1.5 h-1.5 rounded-full ml-1",
                              STATUS_DOT[apt.status] ?? "bg-gray-400"
                            )}
                          />
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] justify-center pt-1">
        {Object.entries(STATUS_DOT).map(([key, cls]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full inline-block", cls)} />
            <span className="capitalize text-muted-foreground">
              {key.replace("_", " ").toLowerCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
