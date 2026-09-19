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
  dateVal: number; // for sorting
}

interface StatChartProps {
  transactions: Transaction[];
}

function createSmoothPath(points: { x: number; y: number }[], baselineY: number) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const cp1x = p1.x + (p2.x - p1.x) / 3;
    const cp1y = p1.y;
    const cp2x = p2.x - (p2.x - p1.x) / 3;
    const cp2y = p2.y;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

export default function StatChart({ transactions }: StatChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("day");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("present");
  const [isFilterLoaded, setIsFilterLoaded] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("bj3_chart_start");
    const e = localStorage.getItem("bj3_chart_end");
    if (s) setStartDate(s);
    if (e) setEndDate(e);
    setIsFilterLoaded(true);
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

  const data: DataPoint[] = useMemo(() => {
    if (!isFilterLoaded) return [];

    let filteredTxs = transactions;
    const sDate = startDate ? new Date(startDate).getTime() : 0;
    const eDate = endDate === "present" ? new Date().getTime() : (endDate ? new Date(endDate).getTime() + 86400000 : Infinity);

    filteredTxs = transactions.filter(t => {
      const tTime = new Date(t.date).getTime();
      return tTime >= sDate && tTime <= eDate;
    });

    const incomeTxs = filteredTxs.filter(t => t.type === "income" || t.type === "fund");
    const expenseTxs = filteredTxs.filter(t => t.type === "expense");

    let arr: DataPoint[] = [];

    if (timeframe === "day") {
      const dayMap: Record<string, { income: number; expense: number; dateVal: number }> = {};
      
      const defaultStart = new Date(new Date().setDate(new Date().getDate() - 30)).getTime();
      const actualStart = sDate || defaultStart;
      const actualEnd = endDate === "present" ? new Date().getTime() : eDate;
      
      for (let d = new Date(actualStart); d.getTime() <= actualEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dayMap[dateStr] = { income: 0, expense: 0, dateVal: d.getTime() };
      }

      [...incomeTxs, ...expenseTxs].forEach(t => {
        const dateStr = t.date.substring(0, 10);
        if (dayMap[dateStr]) {
          if (t.type === "income" || t.type === "fund") dayMap[dateStr].income += t.amount;
          else dayMap[dateStr].expense += t.amount;
        }
      });

      arr = Object.entries(dayMap).map(([dateStr, v]) => {
        const d = new Date(dateStr);
        return {
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          fullLabel: `${d.getDate()} ${["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."][d.getMonth()]} ${d.getFullYear() + 543}`,
          income: v.income,
          expense: v.expense,
          dateVal: v.dateVal,
        };
      });
    } else if (timeframe === "week") {
      const weekMap: Record<string, { income: number; expense: number; dateVal: number }> = {};
      
      [...incomeTxs, ...expenseTxs].forEach(t => {
        const d = new Date(t.date);
        const wStart = new Date(d);
        wStart.setDate(d.getDate() - d.getDay());
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 6);
        
        const mStr = `${wStart.getFullYear()}-${String(wStart.getMonth()+1).padStart(2, '0')}-${String(wStart.getDate()).padStart(2, '0')}`;
        if (!weekMap[mStr]) {
          weekMap[mStr] = { income: 0, expense: 0, dateVal: wStart.getTime() };
        }
        if (t.type === "income" || t.type === "fund") weekMap[mStr].income += t.amount;
        else weekMap[mStr].expense += t.amount;
      });

      arr = Object.entries(weekMap).map(([mStr, v]) => {
        const d = new Date(mStr);
        const e = new Date(d);
        e.setDate(e.getDate() + 6);
        return {
          label: `${d.getDate()}/${d.getMonth()+1}-${e.getDate()}/${e.getMonth()+1}`,
          fullLabel: `สัปดาห์ ${d.getDate()} ${["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."][d.getMonth()]} - ${e.getDate()} ${["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."][e.getMonth()]}`,
          income: v.income,
          expense: v.expense,
          dateVal: v.dateVal,
        };
      });
    } else {
      const monthMap: Record<string, { income: number; expense: number; dateVal: number }> = {};
      [...incomeTxs, ...expenseTxs].forEach(t => {
        const d = new Date(t.date);
        const mStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-01`;
        if (!monthMap[mStr]) {
          monthMap[mStr] = { income: 0, expense: 0, dateVal: new Date(mStr).getTime() };
        }
        if (t.type === "income" || t.type === "fund") monthMap[mStr].income += t.amount;
        else monthMap[mStr].expense += t.amount;
      });

      arr = Object.entries(monthMap).map(([mStr, v]) => {
        const d = new Date(mStr);
        return {
          label: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."][d.getMonth()],
          fullLabel: `เดือน ${["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"][d.getMonth()]} ${d.getFullYear() + 543}`,
          income: v.income,
          expense: v.expense,
          dateVal: v.dateVal,
        };
      });
    }

    arr.sort((a, b) => a.dateVal - b.dateVal);
    
    return arr.filter(d => {
      if (timeframe !== "day" && d.income === 0 && d.expense === 0) return false;
      return true;
    });
  }, [transactions, timeframe, startDate, endDate, isFilterLoaded]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data, timeframe]);

  const chartHeight = 220;
  const paddingTop = 20;
  const paddingBottom = 40;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  
  const minSpacing = timeframe === "day" ? 40 : timeframe === "week" ? 60 : 70;
  const chartWidth = Math.max(300, data.length * minSpacing + 40);
  const innerWidth = chartWidth - 40;
  const baselineY = paddingTop + innerHeight;

  let maxVal = 100;
  data.forEach(d => {
    if (d.income > maxVal) maxVal = d.income;
    if (d.expense > maxVal) maxVal = d.expense;
  });
  maxVal = Math.ceil(maxVal / 100) * 100;
  if (maxVal === 0) maxVal = 100;

  const points = useMemo(() => {
    if (data.length === 0) return { incomePoints: [], expensePoints: [] };
    
    const incomePoints = data.map((d, i) => {
      const x = 20 + (i / (data.length - 1 || 1)) * innerWidth;
      const y = paddingTop + innerHeight * (1 - (d.income / maxVal));
      return { x, y };
    });

    const expensePoints = data.map((d, i) => {
      const x = 20 + (i / (data.length - 1 || 1)) * innerWidth;
      const y = paddingTop + innerHeight * (1 - (d.expense / maxVal));
      return { x, y };
    });

    return { incomePoints, expensePoints };
  }, [data, maxVal, innerWidth, innerHeight, paddingTop]);

  const incomeLinePath = useMemo(() => createSmoothPath(points.incomePoints, baselineY), [points.incomePoints, baselineY]);
  const expenseLinePath = useMemo(() => createSmoothPath(points.expensePoints, baselineY), [points.expensePoints, baselineY]);

  const incomeAreaPath = points.incomePoints.length > 0 
    ? `${incomeLinePath} L ${points.incomePoints[points.incomePoints.length - 1].x} ${baselineY} L ${points.incomePoints[0].x} ${baselineY} Z` 
    : "";
    
  const expenseAreaPath = points.expensePoints.length > 0 
    ? `${expenseLinePath} L ${points.expensePoints[points.expensePoints.length - 1].x} ${baselineY} L ${points.expensePoints[0].x} ${baselineY} Z` 
    : "";

  return (
    <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-[#F1EDF7] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-[#332941] font-bold text-sm sm:text-base flex items-center gap-2">
          <div className="w-2 h-6 bg-[#C084FC] rounded-full"></div>
          สรุปรายรับ-รายจ่าย {timeframe === "day" ? "รายวัน" : timeframe === "week" ? "รายสัปดาห์" : "รายเดือน"}
        </h2>

        <div className="flex items-center gap-2 sm:gap-4 flex-wrap bg-[#FAF5FF] p-2 rounded-xl border border-[#E9D5FF]">
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
      </div>

      <div className="relative bg-gradient-to-b from-[#FAF5FF]/50 to-white rounded-2xl border border-[#EFE8F6] flex">
        
        {/* FIXED Y-AXIS */}
        <div className="w-[40px] flex-shrink-0 relative z-10 bg-white/80 backdrop-blur-sm border-r border-[#EFE8F6]/50 rounded-l-2xl py-2 sm:py-4 pointer-events-none">
           {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
             const y = paddingTop + innerHeight * (1 - ratio);
             const val = Math.round(maxVal * ratio);
             return (
               <div key={i} className="absolute w-full text-right pr-1" style={{ top: `${y - 6}px` }}>
                 <span className="text-[9px] sm:text-[10px] text-[#A89BB7] font-medium">
                   {val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k` : val}
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
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible select-none">
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
        
        {/* FIXED Floating Tooltip */}
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
              <span>สุทธิ:</span>
              <span className="font-bold text-[#332941]">{formatCurrency(data[hoveredIndex].income - data[hoveredIndex].expense)}</span>
            </div>
          </div>
        )}

      </div>

      <div className="flex items-center justify-center gap-2 pt-1">
        <button type="button" onClick={() => { setTimeframe("day"); setHoveredIndex(null); }} className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${timeframe === "day" ? "bg-[#332941] text-white" : "bg-[#F8F5FB] text-[#7B708A] hover:bg-[#EFE8F6]"}`}>รายวัน</button>
        <button type="button" onClick={() => { setTimeframe("week"); setHoveredIndex(null); }} className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${timeframe === "week" ? "bg-[#332941] text-white" : "bg-[#F8F5FB] text-[#7B708A] hover:bg-[#EFE8F6]"}`}>รายสัปดาห์</button>
        <button type="button" onClick={() => { setTimeframe("month"); setHoveredIndex(null); }} className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${timeframe === "month" ? "bg-[#332941] text-white" : "bg-[#F8F5FB] text-[#7B708A] hover:bg-[#EFE8F6]"}`}>รายเดือน</button>
      </div>
    </div>
  );
}
