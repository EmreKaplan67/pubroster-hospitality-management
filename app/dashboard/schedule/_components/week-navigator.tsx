"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  formatWeekRange,
  getPrevWeekStart,
  getNextWeekStart,
  getWeekStart,
  getMonthGrid,
} from "@/lib/schedule-week";
import { cn } from "@/lib/utils";

type WeekNavigatorProps = {
  weekStart: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekNavigator({ weekStart }: WeekNavigatorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const [y, m] = weekStart.split("-").map(Number);
    return { year: y ?? new Date().getFullYear(), month: (m ?? new Date().getMonth() + 1) - 1 };
  });

  useEffect(() => {
    if (open) {
      const [y, m] = weekStart.split("-").map(Number);
      setViewDate({ year: y!, month: m! - 1 });
    }
  }, [open, weekStart]);

  const prevWeek = getPrevWeekStart(weekStart);
  const nextWeek = getNextWeekStart(weekStart);
  const thisWeek = getWeekStart(new Date());
  const weekLabel = formatWeekRange(weekStart);

  const grid = getMonthGrid(viewDate.year, viewDate.month);

  function goPrevMonth() {
    setViewDate((v) =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }
    );
  }

  function goNextMonth() {
    setViewDate((v) =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }
    );
  }

  function selectWeek(iso: string) {
    router.push(`/dashboard/schedule?week=${iso}`);
    setOpen(false);
  }

  const monthLabel = new Date(viewDate.year, viewDate.month).toLocaleDateString(
    "en-GB",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous week"
        onClick={() => router.push(`/dashboard/schedule?week=${prevWeek}`)}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="min-w-48 font-medium tabular-nums justify-center gap-2"
          >
            <Calendar className="size-4" />
            {weekLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="icon" onClick={goPrevMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="font-semibold text-sm">{monthLabel}</span>
              <Button variant="ghost" size="icon" onClick={goNextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <div key={d} className="h-8 flex items-center justify-center">
                  {d}
                </div>
              ))}
              {grid.map(({ date, iso, isCurrentMonth }) => {
                const isSelected = iso === weekStart;
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => selectWeek(iso)}
                    className={cn(
                      "h-8 rounded-md text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isCurrentMonth ? "text-foreground" : "text-muted-foreground/60",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                router.push(`/dashboard/schedule?week=${thisWeek}`);
                setOpen(false);
              }}
            >
              Jump to this week
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        aria-label="Next week"
        onClick={() => router.push(`/dashboard/schedule?week=${nextWeek}`)}
      >
        <ChevronRight className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/dashboard/schedule?week=${thisWeek}`)}
        className="ml-2"
      >
        This week
      </Button>
    </div>
  );
}
