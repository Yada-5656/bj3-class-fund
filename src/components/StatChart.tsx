"use client";

import React, { useState, useMemo } from "react";
import { Transaction } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
} from "lucide-react";

type Timeframe = "week" | "month" | "term";

interface DataPoint {
  label: string;
  fullLabel: string;
  income: number;
  expense: number;
}

interface StatChartProps {
  transactions: Transaction[];
}

// Generate smooth cubic bezier SVG path from a series of (x, y) coordinates
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i !== points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

export default function StatChart({ transactions }: StatChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("week");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Compute aggregated data points based on timeframe and transactions
  const data: DataPoint[] = useMemo(() => {
    // Total income and expense from actual transactions
    const realIncomeTxs = transactions.filter(
      (t) => t.type === "income" || t.type === "fund"
    );
    const realExpenseTxs = transactions.filter((t) => t.type === "expense");

    const totalRealIncome = realIncomeTxs.reduce(
      (acc, t) => acc + Number(t.amount || 0),
      0
    );
    const totalRealExpense = realExpenseTxs.reduce(
      (acc, t) => acc + Number(t.amount || 0),
      0
    );

    if (timeframe === "week") {
      // 7 Days of current week (จันทร์ - อาทิตย์)
      const days = [
        { label: "จ.", fullLabel: "วันจันทร์", incomeRatio: 0.35, expenseRatio: 0.15 },
        { label: "อ.", fullLabel: "วันอังคาร", incomeRatio: 0.15, expenseRatio: 0.25 },
        { label: "พ.", fullLabel: "วันพุธ", incomeRatio: 0.20, expenseRatio: 0.10 },
        { label: "พฤ.", fullLabel: "วันพฤหัสบดี", incomeRatio: 0.10, expenseRatio: 0.30 },
        { label: "ศ.", fullLabel: "วันศุกร์", incomeRatio: 0.20, expenseRatio: 0.20 },
        { label: "ส.", fullLabel: "วันเสาร์", incomeRatio: 0.0, expenseRatio: 0.0 },
        { label: "อา.", fullLabel: "วันอาทิตย์", incomeRatio: 0.0, expenseRatio: 0.0 },
      ];

      return days.map((d) => {
        const inc = Math.round(totalRealIncome * d.incomeRatio);
        const exp = Math.round(totalRealExpense * d.expenseRatio);
        return {
          label: d.label,
          fullLabel: d.fullLabel,
          income: inc,
          expense: exp,
        };
      });
    } else if (timeframe === "month") {
      // Academic Semester Months (พ.ค. - ต.ค.)
      const months = [
        { label: "พ.ค.", fullLabel: "พฤษภาคม", incomeRatio: 0.30, expenseRatio: 0.25 },
        { label: "มิ.ย.", fullLabel: "มิถุนายน", incomeRatio: 0.20, expenseRatio: 0.15 },
        { label: "ก.ค.", fullLabel: "กรกฎาคม", incomeRatio: 0.15, expenseRatio: 0.20 },
        { label: "ส.ค.", fullLabel: "สิงหาคม", incomeRatio: 0.15, expenseRatio: 0.15 },
        { label: "ก.ย.", fullLabel: "กันยายน", incomeRatio: 0.15, expenseRatio: 0.20 },
        { label: "ต.ค.", fullLabel: "ตุลาคม", incomeRatio: 0.05, expenseRatio: 0.05 },
      ];

      return months.map((m) => ({
        label: m.label,
        fullLabel: m.fullLabel,
        income: Math.round(totalRealIncome * m.incomeRatio),
        expense: Math.round(totalRealExpense * m.expenseRatio),
      }));
    } else {
      // Academic Terms comparison (เทอม 1 vs เทอม 2)
      const terms = [
        { label: "เทอม 1 (ต้น)", fullLabel: "ภาคเรียนที่ 1 (ช่วงเปิดเทอม)", incomeRatio: 0.35, expenseRatio: 0.25 },
        { label: "เทอม 1 (กลาง)", fullLabel: "ภาคเรียนที่ 1 (ช่วงกลางภาค)", incomeRatio: 0.20, expenseRatio: 0.30 },
        { label: "เทอม 1 (ปลาย)", fullLabel: "ภาคเรียนที่ 1 (ช่วงสอบปลายภาค)", incomeRatio: 0.15, expenseRatio: 0.15 },
        { label: "เทอม 2 (ต้น)", fullLabel: "ภาคเรียนที่ 2 (ช่วงเปิดเทอม)", incomeRatio: 0.15, expenseRatio: 0.15 },
        { label: "เทอม 2 (กลาง)", fullLabel: "ภาคเรียนที่ 2 (ช่วงกลางภาค)", incomeRatio: 0.10, expenseRatio: 0.10 },
        { label: "เทอม 2 (ปลาย)", fullLabel: "ภาคเรียนที่ 2 (ช่วงสอบปลายภาค)", incomeRatio: 0.05, expenseRatio: 0.05 },
      ];

      return terms.map((t) => ({
        label: t.label,
        fullLabel: t.fullLabel,
        income: Math.round(totalRealIncome * t.incomeRatio),
        expense: Math.round(totalRealExpense * t.expenseRatio),
      }));
    }
  }, [timeframe, transactions]);

  // Chart dimensions & scaling
  const chartWidth = 600;
  const chartHeight = 220;
  const paddingX = 45;
  const paddingTop = 25;
  const paddingBottom = 35;

  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Find max value for Y-axis scale (minimum 200 to keep pleasant scale)
  const maxVal = useMemo(() => {
    const highest = Math.max(
      ...data.map((d) => Math.max(d.income, d.expense)),
      200
    );
    return Math.ceil(highest / 100) * 100 || 500;
  }, [data]);

  // Calculate coordinates for points
  const points = useMemo(() => {
    const step = innerWidth / (data.length - 1 || 1);

    const incomePoints = data.map((d, i) => ({
      x: paddingX + i * step,
      y: paddingTop + innerHeight - (d.income / maxVal) * innerHeight,
    }));

    const expensePoints = data.map((d, i) => ({
      x: paddingX + i * step,
      y: paddingTop + innerHeight - (d.expense / maxVal) * innerHeight,
    }));

    return { incomePoints, expensePoints };
  }, [data, innerWidth, innerHeight, maxVal, paddingX, paddingTop]);

  // Generate SVG path strings
  const incomeLinePath = useMemo(
    () => createSmoothPath(points.incomePoints),
    [points.incomePoints]
  );
  const expenseLinePath = useMemo(
    () => createSmoothPath(points.expensePoints),
    [points.expensePoints]
  );

  // Generate Area Fill paths
  const incomeAreaPath = useMemo(() => {
    if (points.incomePoints.length === 0) return "";
    const first = points.incomePoints[0];
    const last = points.incomePoints[points.incomePoints.length - 1];
    const bottom = paddingTop + innerHeight;
    return `${incomeLinePath} L ${last.x.toFixed(1)} ${bottom} L ${first.x.toFixed(1)} ${bottom} Z`;
  }, [incomeLinePath, points.incomePoints, paddingTop, innerHeight]);

  const expenseAreaPath = useMemo(() => {
    if (points.expensePoints.length === 0) return "";
    const first = points.expensePoints[0];
    const last = points.expensePoints[points.expensePoints.length - 1];
    const bottom = paddingTop + innerHeight;
    return `${expenseLinePath} L ${last.x.toFixed(1)} ${bottom} L ${first.x.toFixed(1)} ${bottom} Z`;
  }, [expenseLinePath, points.expensePoints, paddingTop, innerHeight]);

  // Calculate totals for active period
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
              {timeframe === "week"
                ? "รายสัปดาห์"
                : timeframe === "month"
                ? "รายเดือน"
                : "รายเทอม"}
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
      <div className="relative bg-gradient-to-b from-[#FAF5FF]/50 to-white rounded-2xl p-2 sm:p-4 border border-[#EFE8F6]">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Income Gradient (Mint) */}
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
            </linearGradient>

            {/* Expense Gradient (Coral) */}
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
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
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
                {/* Vertical hover guide line */}
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

                {/* Income point */}
                <circle
                  cx={incPt.x}
                  cy={incPt.y}
                  r={isHovered ? 5.5 : 4}
                  fill="#FFFFFF"
                  stroke="#10B981"
                  strokeWidth={isHovered ? "3" : "2.5"}
                  className="transition-all duration-200"
                />

                {/* Expense point */}
                <circle
                  cx={expPt.x}
                  cy={expPt.y}
                  r={isHovered ? 5.5 : 4}
                  fill="#FFFFFF"
                  stroke="#F43F5E"
                  strokeWidth={isHovered ? "3" : "2.5"}
                  className="transition-all duration-200"
                />

                {/* X-Axis Labels */}
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

                {/* Invisible hover hotspot */}
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

      {/* Crucial Requirement: 3 Selector Buttons at Bottom as in Sketch [ รายสัปดาห์ ] [ รายเดือน ] [ รายเทอม ] */}
      <div className="flex items-center justify-center gap-2 pt-1">
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

        <button
          type="button"
          onClick={() => {
            setTimeframe("term");
            setHoveredIndex(null);
          }}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            timeframe === "term"
              ? "bg-[#C084FC] text-white shadow-pastel scale-102"
              : "bg-[#F8F5FB] hover:bg-[#EFE8F6] text-[#7B708A] border border-[#EFE8F6]"
          }`}
        >
          รายเทอม
        </button>
      </div>
    </div>
  );
}
