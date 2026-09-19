"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Transaction } from "@/lib/db";
import { formatCurrency, getTodayISODate } from "@/lib/utils";

type Timeframe = "day" | "week" | "month";

interface DataPoint {
  label: string;
  fullLabel: string;
  income: number;
  expense: number;
}

interface StatChartProps {
  transactions: Transaction[];
}

// Generate smooth monotonic SVG path that never dips below baseline or overshoots
function createSmoothPath(points: { x: number; y: number }[], baselineY: number): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // If both points are at baseline (0), draw a straight line along the baseline
    if (Math.abs(p1.y - baselineY) < 1 && Math.abs(p2.y - baselineY) < 1) {
      d += ` L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      continue;
    }

    // Monotonic bezier transition that never dips below baseline
    const midX = (p1.x + p2.x) / 2;
    const cp1y = Math.min(baselineY, p1.y);
    const cp2y = Math.min(baselineY, p2.y);
    d += ` C ${midX.toFixed(1)} ${cp1y.toFixed(1)}, ${midX.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

export default function StatChart({ transactions }: StatChartProps) {
  // Default timeframe is now "day" or "week", let's default to "day" as first button
  const [timeframe, setTimeframe] = useState<Timeframe>("day");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [timeframe]);

  // Compute aggregated data points based on timeframe and transactions (100% REAL DATA)
  const data: DataPoint[] = useMemo(() => {
    const anchorDateStr =
      transactions.length > 0 && transactions[0].date
        ? transactions[0].date
        : getTodayISODate();

    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const fullThaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

    if (timeframe === "day") {
      const [year, month, day] = anchorDateStr.split("-").map(Number);
      const anchor = new Date(year, month - 1, day);
      
      const arr: DataPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const cur = new Date(anchor);
        cur.setDate(anchor.getDate() - i);
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;

        const dayIncome = transactions
          .filter((t) => (t.type === "income" || t.type === "fund") && t.date === dateStr)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const dayExpense = transactions
          .filter((t) => t.type === "expense" && t.date === dateStr)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        arr.push({
          label: `${cur.getDate()} ${thaiMonths[cur.getMonth()]}`,
          fullLabel: `${cur.getDate()} ${fullThaiMonths[cur.getMonth()]}`,
          income: dayIncome,
          expense: dayExpense,
        });
      }
      return arr;
    } else if (timeframe === "week") {
      const [year, month] = anchorDateStr.split("-").map(Number);
      const arr: DataPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const mDate = new Date(year, month - 1 - i, 1);
        const mY = mDate.getFullYear();
        const mM = String(mDate.getMonth() + 1).padStart(2, "0");
        const mStr = `${mY}-${mM}`;
        const mName = thaiMonths[mDate.getMonth()];
        const fullMName = fullThaiMonths[mDate.getMonth()];

        const weeksConfig = [
          { label: "W1", full: "สัปดาห์ที่ 1 (1-7)", start: 1, end: 7 },
          { label: "W2", full: "สัปดาห์ที่ 2 (8-14)", start: 8, end: 14 },
          { label: "W3", full: "สัปดาห์ที่ 3 (15-21)", start: 15, end: 21 },
          { label: "W4", full: "สัปดาห์ที่ 4 (22+)", start: 22, end: 31 },
        ];

        for (const cfg of weeksConfig) {
          const weekTxs = transactions.filter((t) => {
            if (!t.date.startsWith(mStr)) return false;
            const dayNum = parseInt(t.date.split("-")[2], 10);
            return dayNum >= cfg.start && dayNum <= cfg.end;
          });

          const weekIncome = weekTxs
            .filter((t) => t.type === "income" || t.type === "fund")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

          const weekExpense = weekTxs
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

          arr.push({
            label: `${cfg.label} ${mName}`,
            fullLabel: `${cfg.full} ${fullMName}`,
            income: weekIncome,
            expense: weekExpense,
          });
        }
      }
      return arr;
    } else {
      const [year, month] = anchorDateStr.split("-").map(Number);
      const arr: DataPoint[] = [];
      for (let i = 11; i >= 0; i--) {
        const mDate = new Date(year, month - 1 - i, 1);
        const mY = mDate.getFullYear();
        const mM = String(mDate.getMonth() + 1).padStart(2, "0");
        const mStr = `${mY}-${mM}`;

        const monthTxs = transactions.filter((t) => t.date.startsWith(mStr));

        const monthIncome = monthTxs
          .filter((t) => t.type === "income" || t.type === "fund")
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const monthExpense = monthTxs
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const mName = thaiMonths[mDate.getMonth()];
        const fullMName = fullThaiMonths[mDate.getMonth()];
        const thaiYear = mY + 543;

        arr.push({
          label: `${mName} ${String(thaiYear).slice(-2)}`,
          fullLabel: `${fullMName} ${thaiYear}`,
          income: monthIncome,
          expense: monthExpense,
        });
      }
      return arr;
    }
  }, [timeframe, transactions]);

  // Chart dimensions & scaling
  const chartWidth = Math.max(600, data.length * 60);
  const chartHeight = 220;
  const paddingX = 45;
  const paddingTop = 25;
  const paddingBottom = 35;

  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const baselineY = paddingTop + innerHeight;

  const maxVal = useMemo(() => {
    const highest = Math.max(
      ...data.map((d) => Math.max(d.income, d.expense)),
      0
    );
    if (highest === 0) return 100;
    return highest * 1.15; // 15% headroom above max value
  }, [data]);

  const points = useMemo(() => {
    const step = innerWidth / (data.length - 1 || 1);

    const incomePoints = data.map((d, i) => {
      const ratio = maxVal > 0 ? d.income / maxVal : 0;
      const y = Math.min(baselineY, Math.max(paddingTop, baselineY - ratio * innerHeight));
      return {
        x: paddingX + i * step,
        y,
      };
    });

    const expensePoints = data.map((d, i) => {
      const ratio = maxVal > 0 ? d.expense / maxVal : 0;
      const y = Math.min(baselineY, Math.max(paddingTop, baselineY - ratio * innerHeight));
      return {
        x: paddingX + i * step,
        y,
      };
    });

    return { incomePoints, expensePoints };
  }, [data, innerWidth, innerHeight, maxVal, paddingX, paddingTop, baselineY]);

  const incomeLinePath = useMemo(
    () => createSmoothPath(points.incomePoints, baselineY),
    [points.incomePoints, baselineY]
  );
  const expenseLinePath = useMemo(
    () => createSmoothPath(points.expensePoints, baselineY),
    [points.expensePoints, baselineY]
  );

  const incomeAreaPath = useMemo(() => {
    if (points.incomePoints.length === 0) return "";
    const first = points.incomePoints[0];
    const last = points.incomePoints[points.incomePoints.length - 1];
    return `${incomeLinePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
  }, [incomeLinePath, points.incomePoints, baselineY]);

  const expenseAreaPath = useMemo(() => {
    if (points.expensePoints.length === 0) return "";
    const first = points.expensePoints[0];
    const last = points.expensePoints[points.expensePoints.length - 1];
    return `${expenseLinePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
  }, [expenseLinePath, points.expensePoints, baselineY]);

  const totalPeriodIncome = useMemo(
    () => data.reduce((sum, d) => sum + d.income, 0),
    [data]
  );
  const totalPeriodExpense = useMemo(
    () => data.reduce((sum, d) => sum + d.expense, 0),
    [data]
  );

  return (
    <div className="space-y-4">
      {/* Top Chart Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F1EDF7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#7B708A]">
              เปรียบเทียบรายรับและรายจ่าย
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF]">
              {timeframe === "day"
                ? "รายวัน"
                : timeframe === "week"
                ? "รายสัปดาห์"
                : "รายเดือน"}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#10B981] shadow-xs" />
            <span className="text-[#065F46] font-semibold">รายรับ</span>
            <span className="text-[#10B981] font-bold text-[11px]">
              (+{formatCurrency(totalPeriodIncome)})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F43F5E] shadow-xs" />
            <span className="text-[#9F1239] font-semibold">รายจ่าย</span>
            <span className="text-[#F43F5E] font-bold text-[11px]">
              (-{formatCurrency(totalPeriodExpense)})
            </span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div 
        ref={scrollRef}
        className="relative bg-gradient-to-b from-[#FAF5FF]/50 to-white rounded-2xl p-2 sm:p-4 border border-[#EFE8F6] overflow-x-auto overflow-y-hidden custom-scrollbar"
      >
        <div style={{ width: chartWidth, minWidth: '100%' }}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
            </linearGradient>

            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines & Y-Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + innerHeight * (1 - ratio);
            const val = Math.round(maxVal * ratio);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="#EFE8F6"
                  strokeDasharray={ratio === 0 ? undefined : "3 3"}
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#A89BB7"
                  fontSize="10"
                  fontFamily="inherit"
                >
                  {val >= 1_000_000
                    ? `${(val / 1_000_000).toFixed(1)}M`
                    : val >= 1000
                    ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k`
                    : val}
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          <path d={incomeAreaPath} fill="url(#incomeGradient)" />
          <path d={expenseAreaPath} fill="url(#expenseGradient)" />

          {/* Smooth Stroke Lines */}
          <path
            d={incomeLinePath}
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={expenseLinePath}
            fill="none"
            stroke="#F43F5E"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points & Interactive Hover Columns */}
          {data.map((d, i) => {
            const incPt = points.incomePoints[i];
            const expPt = points.expensePoints[i];
            const isHovered = hoveredIndex === i;

            return (
              <g key={i}>
                {isHovered && (
                  <line
                    x1={incPt.x}
                    y1={paddingTop}
                    x2={incPt.x}
                    y2={paddingTop + innerHeight}
                    stroke="#C084FC"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  />
                )}

                <circle
                  cx={incPt.x}
                  cy={incPt.y}
                  r={isHovered ? 5.5 : 4}
                  fill="#FFFFFF"
                  stroke="#10B981"
                  strokeWidth={isHovered ? "3" : "2.5"}
                  className="transition-all duration-200"
                />

                <circle
                  cx={expPt.x}
                  cy={expPt.y}
                  r={isHovered ? 5.5 : 4}
                  fill="#FFFFFF"
                  stroke="#F43F5E"
                  strokeWidth={isHovered ? "3" : "2.5"}
                  className="transition-all duration-200"
                />

                <text
                  x={incPt.x}
                  y={paddingTop + innerHeight + 18}
                  textAnchor="middle"
                  fill={isHovered ? "#332941" : "#7B708A"}
                  fontSize="11"
                  fontWeight={isHovered ? "bold" : "normal"}
                  fontFamily="inherit"
                >
                  {d.label}
                </text>

                <rect
                  x={incPt.x - (innerWidth / (data.length - 1 || 1)) / 2}
                  y={0}
                  width={innerWidth / (data.length - 1 || 1)}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setHoveredIndex(hoveredIndex === i ? null : i)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip when hovering a point */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#E9D5FF] shadow-lg text-xs space-y-1 pointer-events-none transition-all"
          >
            <div className="font-bold text-[#332941] text-xs pb-1 border-b border-[#F1EDF7]">
              {data[hoveredIndex].fullLabel}
            </div>
            <div className="flex items-center justify-between gap-4 text-[#065F46]">
              <span>รายรับ:</span>
              <span className="font-bold">+{formatCurrency(data[hoveredIndex].income)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-[#9F1239]">
              <span>รายจ่าย:</span>
              <span className="font-bold">-{formatCurrency(data[hoveredIndex].expense)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-[#7B708A] pt-1 border-t border-[#F1EDF7] font-medium">
              <span>คงเหลือสุทธิ:</span>
              <span className="font-bold text-[#332941]">
                {formatCurrency(data[hoveredIndex].income - data[hoveredIndex].expense)}
              </span>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Crucial Requirement: 3 Selector Buttons at Bottom: [ รายวัน ] [ รายสัปดาห์ ] [ รายเดือน ] */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setTimeframe("day");
            setHoveredIndex(null);
          }}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            timeframe === "day"
              ? "bg-[#C084FC] text-white shadow-pastel scale-102"
              : "bg-[#F8F5FB] hover:bg-[#EFE8F6] text-[#7B708A] border border-[#EFE8F6]"
          }`}
        >
          รายวัน
        </button>

        <button
          type="button"
          onClick={() => {
            setTimeframe("week");
            setHoveredIndex(null);
          }}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            timeframe === "week"
              ? "bg-[#C084FC] text-white shadow-pastel scale-102"
              : "bg-[#F8F5FB] hover:bg-[#EFE8F6] text-[#7B708A] border border-[#EFE8F6]"
          }`}
        >
          รายสัปดาห์
        </button>

        <button
          type="button"
          onClick={() => {
            setTimeframe("month");
            setHoveredIndex(null);
          }}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            timeframe === "month"
              ? "bg-[#C084FC] text-white shadow-pastel scale-102"
              : "bg-[#F8F5FB] hover:bg-[#EFE8F6] text-[#7B708A] border border-[#EFE8F6]"
          }`}
        >
          รายเดือน
        </button>
      </div>
    </div>
  );
}
