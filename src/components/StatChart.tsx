"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Transaction } from "@/lib/db";
import { formatCurrency, getTodayISODate } from "@/lib/utils";
import { ChevronUp } from "lucide-react";

type Timeframe = "day" | "week" | "month";

interface DataPoint {
  label: string;
  fullLabel: string;
  income: number;
  expense: number;
  dateVal: number; // for sorting
}

interface StatChartProps {
  transactions: Transaction[];
}

function createSmoothPath(points: { x: number; y: number }[], baselineY: number) {
  if (points.length === 0) return "";
  if (points.length === 1) return \M \ \\;

  let d = \M \ \\;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (Math.abs(p1.y - baselineY) < 1 && Math.abs(p2.y - baselineY) < 1) {
      d += \ L \ \\;
      continue;
    }

    const midX = (p1.x + p2.x) / 2;
    const cp1y = Math.min(baselineY, p1.y);
    const cp2y = Math.min(baselineY, p2.y);
    d += \ C \ \, \ \, \ \\;
  }

  return d;
}

export default function StatChart({ transactions }: StatChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("day");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Date Range State
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("present");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("bj3_chart_start");
    const e = localStorage.getItem("bj3_chart_end");
    if (s) setStartDate(s);
    if (e) setEndDate(e);
    setIsMounted(true);
  }, []);

  const handleDateChange = (type: "start" | "end", val: string) => {
    if (type === "start") {
      setStartDate(val);
      localStorage.setItem("bj3_chart_start", val);
    } else {
      setEndDate(val);
      localStorage.setItem("bj3_chart_end", val);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [timeframe, startDate, endDate]);

  const data: DataPoint[] = useMemo(() => {
    if (!isMounted) return [];

    const todayStr = getTodayISODate();
    const actualEndStr = endDate === "present" || !endDate ? todayStr : endDate;
    
    // Default start date if empty: 30 days ago
    let actualStartStr = startDate;
    if (!actualStartStr) {
       const d = new Date(actualEndStr);
       d.setDate(d.getDate() - 30);
       actualStartStr = d.toISOString().split("T")[0];
    }

    const start = new Date(actualStartStr);
    const end = new Date(actualEndStr);
    if (start > end) return [];

    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const fullThaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

    const arr: DataPoint[] = [];

    if (timeframe === "day") {
      const cur = new Date(start);
      while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        const dateStr = \\-\-\\;

        const dayIncome = transactions
          .filter((t) => (t.type === "income" || t.type === "fund") && t.date === dateStr)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const dayExpense = transactions
          .filter((t) => t.type === "expense" && t.date === dateStr)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        arr.push({
          label: \\ \\,
          fullLabel: \\ \ \\,
          income: dayIncome,
          expense: dayExpense,
          dateVal: cur.getTime()
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else if (timeframe === "week") {
      // iterate months between start and end
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (cur <= endMonth) {
        const mY = cur.getFullYear();
        const mM = String(cur.getMonth() + 1).padStart(2, "0");
        const mStr = \\-\\;
        const mName = thaiMonths[cur.getMonth()];
        const fullMName = fullThaiMonths[cur.getMonth()];

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

          if (weekIncome > 0 || weekExpense > 0) {
            arr.push({
              label: \\ \\,
              fullLabel: \\ \ \\,
              income: weekIncome,
              expense: weekExpense,
              dateVal: cur.getTime() + cfg.start
            });
          }
        }
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (cur <= endMonth) {
        const mY = cur.getFullYear();
        const mM = String(cur.getMonth() + 1).padStart(2, "0");
        const mStr = \\-\\;

        const monthTxs = transactions.filter((t) => t.date.startsWith(mStr));

        const monthIncome = monthTxs
          .filter((t) => t.type === "income" || t.type === "fund")
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const monthExpense = monthTxs
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        if (monthIncome > 0 || monthExpense > 0) {
          const mName = thaiMonths[cur.getMonth()];
          const fullMName = fullThaiMonths[cur.getMonth()];
          const thaiYear = mY + 543;

          arr.push({
            label: \\ \\,
            fullLabel: \\ \\,
            income: monthIncome,
            expense: monthExpense,
            dateVal: cur.getTime()
          });
        }
        cur.setMonth(cur.getMonth() + 1);
      }
    }
    
    return arr;
  }, [timeframe, transactions, startDate, endDate, isMounted]);

  const chartWidth = Math.max(600, data.length * 60);
  const chartHeight = 220;
  const paddingX = 20; // Reduce X padding since Y-axis is extracted
  const paddingTop = 25;
  const paddingBottom = 35;
  const yAxisWidth = 40;

  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const baselineY = paddingTop + innerHeight;

  const maxVal = useMemo(() => {
    const highest = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 0);
    if (highest === 0) return 100;
    return highest * 1.15;
  }, [data]);

  const points = useMemo(() => {
    const step = innerWidth / (data.length - 1 || 1);
    const incomePoints = data.map((d, i) => {
      const ratio = maxVal > 0 ? d.income / maxVal : 0;
      return { x: paddingX + i * step, y: Math.min(baselineY, Math.max(paddingTop, baselineY - ratio * innerHeight)) };
    });
    const expensePoints = data.map((d, i) => {
      const ratio = maxVal > 0 ? d.expense / maxVal : 0;
      return { x: paddingX + i * step, y: Math.min(baselineY, Math.max(paddingTop, baselineY - ratio * innerHeight)) };
    });
    return { incomePoints, expensePoints };
  }, [data, innerWidth, innerHeight, maxVal, paddingX, paddingTop, baselineY]);

  const incomeLinePath = useMemo(() => createSmoothPath(points.incomePoints, baselineY), [points.incomePoints, baselineY]);
  const expenseLinePath = useMemo(() => createSmoothPath(points.expensePoints, baselineY), [points.expensePoints, baselineY]);

  const incomeAreaPath = \\ L \ \ L \ \ Z\;
  const expenseAreaPath = \\ L \ \ L \ \ Z\;

  const totalPeriodIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalPeriodExpense = data.reduce((sum, d) => sum + d.expense, 0);

  if (!isMounted) return null;

  return (
    <div className="space-y-4">
      <div className="pastel-card p-4 sm:p-5 bg-white border border-[#E9D5FF] shadow-pastel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-[#332941]">เปรียบเทียบรายรับและรายจ่าย</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FAF5FF] text-[#C084FC] text-[10px] font-bold border border-[#E9D5FF]">
              {timeframe === "day" ? "รายวัน" : timeframe === "week" ? "รายสัปดาห์" : "รายเดือน"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
              <span className="text-[#332941] font-semibold">รายรับ</span>
              <span className="text-[#10B981] font-bold text-[11px]">(+{formatCurrency(totalPeriodIncome)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#F43F5E]"></div>
              <span className="text-[#332941] font-semibold">รายจ่าย</span>
              <span className="text-[#F43F5E] font-bold text-[11px]">(-{formatCurrency(totalPeriodExpense)})</span>
            </div>
          </div>
        </div>
        
        {/* Date Range Picker */}
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-[#F8F5FB] p-2 rounded-xl border border-[#EFE8F6]">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-[#7B708A]">ตั้งแต่:</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => handleDateChange("start", e.target.value)}
              className="text-xs px-2 py-1 rounded-lg border border-[#EFE8F6] focus:outline-none focus:ring-1 focus:ring-[#C084FC]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-[#7B708A]">ถึง:</label>
            <select
              value={endDate === "present" ? "present" : "custom"}
              onChange={(e) => {
                if (e.target.value === "present") handleDateChange("end", "present");
                else handleDateChange("end", getTodayISODate());
              }}
              className="text-xs px-2 py-1 rounded-lg border border-[#EFE8F6] focus:outline-none focus:ring-1 focus:ring-[#C084FC] cursor-pointer bg-white"
            >
              <option value="present">ปัจจุบัน</option>
              <option value="custom">กำหนดเอง...</option>
            </select>
            {endDate !== "present" && (
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => handleDateChange("end", e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-[#EFE8F6] focus:outline-none focus:ring-1 focus:ring-[#C084FC]"
              />
            )}
          </div>
        </div>

        {/* Outer Wrapper for Fixed Tooltip and Fixed Y-Axis */}
        <div className="relative bg-gradient-to-b from-[#FAF5FF]/50 to-white rounded-2xl border border-[#EFE8F6] flex">
          
          {/* FIXED Y-AXIS (Overlay on the left) */}
          <div className="w-[40px] flex-shrink-0 relative z-10 bg-white/80 backdrop-blur-sm border-r border-[#EFE8F6]/50 rounded-l-2xl py-2 sm:py-4 pointer-events-none">
             {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
               const y = paddingTop + innerHeight * (1 - ratio);
               const val = Math.round(maxVal * ratio);
               return (
                 <div key={i} className="absolute w-full text-right pr-1" style={{ top: \\px\ }}>
                   <span className="text-[9px] sm:text-[10px] text-[#A89BB7] font-medium">
                     {val >= 1_000_000 ? \\M\ : val >= 1000 ? \\k\ : val}
                   </span>
                 </div>
               )
             })}
          </div>

          {/* SCROLLABLE CHART AREA */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative py-2 sm:py-4"
          >
            {data.length === 0 ? (
               <div className="h-[220px] flex items-center justify-center text-xs text-[#A89BB7]">ไม่มีข้อมูลในช่วงเวลานี้</div>
            ) : (
              <div style={{ width: chartWidth, minWidth: '100%' }}>
                <svg viewBox={\  0 \ \\} className="w-full h-auto overflow-visible select-none">
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

                  {/* Horizontal Grid Lines inside SVG to match Y-axis */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const y = paddingTop + innerHeight * (1 - ratio);
                    return (
                      <line key={i} x1="0" y1={y} x2={chartWidth} y2={y} stroke="#EFE8F6" strokeDasharray={ratio === 0 ? undefined : "3 3"} strokeWidth="1" />
                    );
                  })}

                  <path d={incomeAreaPath} fill="url(#incomeGradient)" />
                  <path d={expenseAreaPath} fill="url(#expenseGradient)" />
                  <path d={incomeLinePath} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={expenseLinePath} fill="none" stroke="#F43F5E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                  {data.map((d, i) => {
                    const incPt = points.incomePoints[i];
                    const expPt = points.expensePoints[i];
                    const isHovered = hoveredIndex === i;

                    return (
                      <g key={i}>
                        {isHovered && <line x1={incPt.x} y1={paddingTop} x2={incPt.x} y2={baselineY} stroke="#E9D5FF" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />}
                        <circle cx={incPt.x} cy={incPt.y} r={isHovered ? 5.5 : 4} fill="#FFFFFF" stroke="#10B981" strokeWidth={isHovered ? "3" : "2.5"} className="transition-all duration-200" />
                        <circle cx={expPt.x} cy={expPt.y} r={isHovered ? 5.5 : 4} fill="#FFFFFF" stroke="#F43F5E" strokeWidth={isHovered ? "3" : "2.5"} className="transition-all duration-200" />
                        <text x={incPt.x} y={paddingTop + innerHeight + 18} textAnchor="middle" fill={isHovered ? "#332941" : "#7B708A"} fontSize="11" fontWeight={isHovered ? "bold" : "normal"} fontFamily="inherit">{d.label}</text>
                        <rect x={incPt.x - (innerWidth / (data.length - 1 || 1)) / 2} y={0} width={innerWidth / (data.length - 1 || 1)} height={chartHeight} fill="transparent" className="cursor-pointer" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} onClick={() => setHoveredIndex(hoveredIndex === i ? null : i)} />
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
          
          {/* FIXED Floating Tooltip (Positioned inside outer wrapper) */}
          {hoveredIndex !== null && data[hoveredIndex] && (
            <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#E9D5FF] shadow-lg text-xs space-y-1 pointer-events-none transition-all">
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
                <span className="font-bold text-[#332941]">{formatCurrency(data[hoveredIndex].income - data[hoveredIndex].expense)}</span>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="flex items-center justify-center gap-2 pt-1">
        <button type="button" onClick={() => { setTimeframe("day"); setHoveredIndex(null); }} className={\lex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all \\}>รายวัน</button>
        <button type="button" onClick={() => { setTimeframe("week"); setHoveredIndex(null); }} className={\lex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all \\}>รายสัปดาห์</button>
        <button type="button" onClick={() => { setTimeframe("month"); setHoveredIndex(null); }} className={\lex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all \\}>รายเดือน</button>
      </div>
    </div>
  );
}
