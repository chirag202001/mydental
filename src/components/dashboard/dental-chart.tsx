"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// FDI tooth numbering – upper right, upper left, lower left, lower right
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

const CONDITION_COLORS: Record<string, string> = {
  healthy: "bg-green-100 border-green-400 text-green-800 dark:bg-green-950 dark:border-green-600 dark:text-green-300",
  cavity: "bg-red-100 border-red-400 text-red-800 dark:bg-red-950 dark:border-red-600 dark:text-red-300",
  filling: "bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-300",
  crown: "bg-purple-100 border-purple-400 text-purple-800 dark:bg-purple-950 dark:border-purple-600 dark:text-purple-300",
  root_canal: "bg-orange-100 border-orange-400 text-orange-800 dark:bg-orange-950 dark:border-orange-600 dark:text-orange-300",
  extraction: "bg-gray-200 border-gray-400 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400",
  implant: "bg-cyan-100 border-cyan-400 text-cyan-800 dark:bg-cyan-950 dark:border-cyan-600 dark:text-cyan-300",
  bridge: "bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-600 dark:text-yellow-300",
  missing: "bg-gray-100 border-dashed border-gray-300 text-gray-400 dark:bg-gray-900 dark:border-gray-700",
};

// Tooth shape — simplified SVG-like rendering using CSS
function toothIsIncisor(num: number): boolean {
  const unit = num % 10;
  return unit === 1 || unit === 2 || unit === 3;
}

function toothIsPremolar(num: number): boolean {
  const unit = num % 10;
  return unit === 4 || unit === 5;
}

interface ToothCondition {
  id: string;
  toothNum: number;
  condition: string;
  surface?: string | null;
  notes?: string | null;
}

interface DentalChartProps {
  conditions: ToothCondition[];
  readonly?: boolean;
  onToothClick?: (toothNum: number) => void;
}

function ToothCell({
  num,
  condition,
  isSelected,
  onClick,
  readonly,
}: {
  num: number;
  condition?: ToothCondition;
  isSelected: boolean;
  onClick?: () => void;
  readonly?: boolean;
}) {
  const conditionClass = condition
    ? CONDITION_COLORS[condition.condition] ?? "bg-muted border-border"
    : "bg-background border-border hover:bg-muted/50";

  const isIncisor = toothIsIncisor(num);
  const isPremolar = toothIsPremolar(num);

  return (
    <button
      type="button"
      onClick={readonly ? undefined : onClick}
      disabled={readonly}
      className={cn(
        "relative flex flex-col items-center justify-center border-2 transition-all text-xs font-medium",
        isIncisor ? "w-9 h-10 rounded-md" : isPremolar ? "w-10 h-10 rounded-lg" : "w-11 h-10 rounded-lg",
        conditionClass,
        isSelected && "ring-2 ring-primary ring-offset-2",
        !readonly && "cursor-pointer"
      )}
      title={condition ? `#${num}: ${condition.condition}${condition.surface ? ` (${condition.surface})` : ""}${condition.notes ? ` – ${condition.notes}` : ""}` : `Tooth #${num}`}
    >
      <span className="text-[10px] font-bold leading-none">{num}</span>
      {condition && (
        <span className="text-[8px] leading-none mt-0.5 capitalize truncate max-w-full px-0.5">
          {condition.condition.replace("_", " ")}
        </span>
      )}
    </button>
  );
}

export function DentalChart({
  conditions,
  readonly = false,
  onToothClick,
}: DentalChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  const conditionMap = new Map<number, ToothCondition>();
  conditions.forEach((c) => conditionMap.set(c.toothNum, c));

  function handleClick(num: number) {
    setSelectedTooth(selectedTooth === num ? null : num);
    onToothClick?.(num);
  }

  const selectedCondition = selectedTooth ? conditionMap.get(selectedTooth) : null;

  return (
    <div className="space-y-4">
      {/* Upper jaw */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
          Upper Jaw (Maxillary)
        </p>
        <div className="flex justify-center gap-1">
          {/* Upper Right */}
          <div className="flex gap-0.5">
            {UPPER_RIGHT.map((num) => (
              <ToothCell
                key={num}
                num={num}
                condition={conditionMap.get(num)}
                isSelected={selectedTooth === num}
                onClick={() => handleClick(num)}
                readonly={readonly}
              />
            ))}
          </div>
          <div className="w-px bg-border mx-1" />
          {/* Upper Left */}
          <div className="flex gap-0.5">
            {UPPER_LEFT.map((num) => (
              <ToothCell
                key={num}
                num={num}
                condition={conditionMap.get(num)}
                isSelected={selectedTooth === num}
                onClick={() => handleClick(num)}
                readonly={readonly}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Midline */}
      <div className="border-t border-dashed border-border" />

      {/* Lower jaw */}
      <div className="text-center">
        <div className="flex justify-center gap-1">
          {/* Lower Right */}
          <div className="flex gap-0.5">
            {LOWER_RIGHT.map((num) => (
              <ToothCell
                key={num}
                num={num}
                condition={conditionMap.get(num)}
                isSelected={selectedTooth === num}
                onClick={() => handleClick(num)}
                readonly={readonly}
              />
            ))}
          </div>
          <div className="w-px bg-border mx-1" />
          {/* Lower Left */}
          <div className="flex gap-0.5">
            {LOWER_LEFT.map((num) => (
              <ToothCell
                key={num}
                num={num}
                condition={conditionMap.get(num)}
                isSelected={selectedTooth === num}
                onClick={() => handleClick(num)}
                readonly={readonly}
              />
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-medium uppercase tracking-wider">
          Lower Jaw (Mandibular)
        </p>
      </div>

      {/* Selected tooth detail – only show built-in panel when no external handler */}
      {selectedTooth && !onToothClick && (
        <div className="mt-4 p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Tooth #{selectedTooth}</p>
            <button
              type="button"
              onClick={() => setSelectedTooth(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          {selectedCondition ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Condition:</span>{" "}
                <span className="capitalize font-medium">
                  {selectedCondition.condition.replace("_", " ")}
                </span>
              </p>
              {selectedCondition.surface && (
                <p>
                  <span className="text-muted-foreground">Surface:</span>{" "}
                  {selectedCondition.surface}
                </p>
              )}
              {selectedCondition.notes && (
                <p>
                  <span className="text-muted-foreground">Notes:</span>{" "}
                  {selectedCondition.notes}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              No conditions recorded for this tooth.
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center pt-2">
        {Object.entries(CONDITION_COLORS).map(([key, cls]) => (
          <div key={key} className="flex items-center gap-1 text-[10px]">
            <div className={cn("w-3 h-3 rounded-sm border", cls)} />
            <span className="capitalize text-muted-foreground">
              {key.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
