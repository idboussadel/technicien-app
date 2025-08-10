import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale"; // Import French locale
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DatePickerWithRange({
  date,
  setDate,
  className,
}: React.HTMLAttributes<HTMLDivElement> & {
  date: DateRange | undefined;
  setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
}) {
  const handleClearFilter = () => {
    setDate(undefined);
  };

  return (
    <div className={cn("", className)}>
      <Popover>
        <PopoverTrigger>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start min-w-58  border-input text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd MMMM, y", { locale: fr })} -{" "}
                  {format(date.to, "dd MMMM, y", { locale: fr })}
                </>
              ) : (
                format(date.from, "dd MMMM, y", { locale: fr })
              )
            ) : (
              <span>Filtrer par date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
          {/* Clear Filter Button */}
          <div className="p-2 border-t">
            <Button variant="ghost" className="w-full justify-center" onClick={handleClearFilter}>
              Effacer le filtre
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
