"use client";

import React, { useState, useMemo } from "react";
import { Transaction } from "@/lib/db";
import { formatCurrency, formatThaiDate } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Search,
  Calendar,
  Trash2,
  Edit,
} from "lucide-react";

interface TransactionTableProps {
  transactions: Transaction[];
  isTreasurer?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
  limit?: number;
  showFilters?: boolean;
}

const THAI_MONTH_NAMES = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

interface MonthGroup {
  key: string;
  displayMonth: string;
  transactions: Transaction[];
  netTotal: number;
}

export default function TransactionTable({
  transactions,
  isTreasurer = false,
  onEdit,
  onDelete,
  limit,
  showFilters = true,
}: TransactionTableProps) {
  const [filterType, setFilterType] = useState<
    "all" | "income" | "expense" | "fund"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter transactions by type and search query (excluding category since category is removed)
  const filteredTransactions = useMemo(() => {
    let list = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (filterType !== "all") {
      list = list.filter((t) => t.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          formatThaiDate(t.date).includes(q)
      );
    }

    if (limit && limit > 0) {
      list = list.slice(0, limit);
    }

    return list;
  }, [transactions, filterType, searchQuery, limit]);

  // Group by Month:
  // Rule: "ถ้าเป็นปีนี้ให้ขึ้นแค่เดือนแต่ถ้าเป็นปีก่อนปัจจุบันให้ขึ้นเป็นเดือนละกะมีปีต่อท้าย"
  const monthGroups: MonthGroup[] = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const groups: MonthGroup[] = [];

    for (const tx of filteredTransactions) {
      const d = new Date(tx.date);
      const y = isNaN(d.getFullYear()) ? currentYear : d.getFullYear();
      const m = isNaN(d.getMonth()) ? 0 : d.getMonth();
      const key = `${y}-${(m + 1).toString().padStart(2, "0")}`;

      let group = groups.find((g) => g.key === key);
      if (!group) {
        // Apply user formatting rule:
        const monthName = THAI_MONTH_NAMES[m];
        const displayMonth =
          y === currentYear ? monthName : `${monthName} ${y + 543}`;

        group = {
          key,
          displayMonth,
          transactions: [],
          netTotal: 0,
        };
        groups.push(group);
      }

      group.transactions.push(tx);
      const amt = Number(tx.amount || 0);
      if (tx.type === "expense") {
        group.netTotal -= amt;
      } else {
        group.netTotal += amt;
      }
    }

    return groups;
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      {/* Title & Filters Row (as drawn in user sketch) */}
      <div className="space-y-3">
        <h3 className="font-bold text-base sm:text-lg text-[#332941]">
          ประวัติรายการเงินห้องทั้งหมด
        </h3>

        {showFilters && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#9E94AD] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารายการ..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C084FC] text-[#332941]"
              />
            </div>

            {/* Type Filter Buttons (เหมือนเดิม) */}
            <div className="flex items-center gap-1 bg-[#F8F5FB] p-1 rounded-xl border border-[#EFE8F6] overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-3 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterType === "all"
                    ? "bg-white text-[#9333EA] shadow-xs font-semibold"
                    : "text-[#7B708A] hover:text-[#332941]"
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setFilterType("fund")}
                className={`px-3 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterType === "fund"
                    ? "bg-white text-[#9333EA] shadow-xs font-semibold"
                    : "text-[#7B708A] hover:text-[#332941]"
                }`}
              >
                เงินห้อง
              </button>
              <button
                type="button"
                onClick={() => setFilterType("income")}
                className={`px-3 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterType === "income"
                    ? "bg-white text-[#059669] shadow-xs font-semibold"
                    : "text-[#7B708A] hover:text-[#332941]"
                }`}
              >
                รายรับอื่น
              </button>
              <button
                type="button"
                onClick={() => setFilterType("expense")}
                className={`px-3 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterType === "expense"
                    ? "bg-white text-[#E11D48] shadow-xs font-semibold"
                    : "text-[#7B708A] hover:text-[#332941]"
                }`}
              >
                รายจ่าย
              </button>
            </div>
          </div>
        )}
      </div>

      {/* No Transactions Found */}
      {monthGroups.length === 0 && (
        <div className="pastel-card p-8 text-center text-xs text-[#9E94AD]">
          ไม่พบรายการข้อมูล
        </div>
      )}

      {/* Monthly Groups with Protruding Folder Tabs and Bottom-Right Total */}
      {monthGroups.map((group) => (
        <div key={group.key} className="space-y-1">
          {/* Protruding Month Folder Tab (ยื่นออกมาด้านบนซ้าย) */}
          <div className="flex items-end px-3">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-t-2xl font-bold bg-white text-[#9333EA] border-t-2 border-x-2 border-[#E9D5FF] text-xs sm:text-sm z-10 -mb-[2px] shadow-xs select-none">
              <Calendar className="w-3.5 h-3.5 text-[#C084FC]" />
              <span>{group.displayMonth}</span>
            </div>
          </div>

          {/* Table Container: Seamlessly connected to protruding month tab */}
          <div className="pastel-card overflow-hidden border-2 border-[#E9D5FF] rounded-b-2xl rounded-tr-2xl bg-white relative z-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#FAF5FF] border-b border-[#EFE8F6] text-[#7B708A] font-semibold">
                    <th className="py-3 px-4 whitespace-nowrap">วันที่</th>
                    <th className="py-3 px-4 whitespace-nowrap">ประเภท</th>
                    <th className="py-3 px-4">รายการ</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">
                      จำนวนเงิน
                    </th>
                    {isTreasurer && (
                      <th className="py-3 px-4 text-center whitespace-nowrap">
                        จัดการ
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EDF7]">
                  {group.transactions.map((tx) => {
                    const isExpense = tx.type === "expense";
                    const isFund = tx.type === "fund";
                    const isIncome = tx.type === "income";

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-[#FAF5FF]/50 transition-colors"
                      >
                        {/* 1. วันที่ (Strictly DD/MM/YYYY Buddhist Era, NO TIME) */}
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-[#7B708A] text-xs">
                          {formatThaiDate(tx.date)}
                        </td>

                        {/* 2. ประเภท */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isFund && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF]">
                              <Wallet className="w-3 h-3" />
                              เงินห้อง
                            </span>
                          )}
                          {isIncome && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                              <ArrowDownLeft className="w-3 h-3" />
                              รายรับ
                            </span>
                          )}
                          {isExpense && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
                              <ArrowUpRight className="w-3 h-3" />
                              รายจ่าย
                            </span>
                          )}
                        </td>

                        {/* 3. รายการ (Item description without category column) */}
                        <td className="py-3 px-4 font-medium text-[#332941] max-w-sm sm:max-w-md">
                          {tx.description}
                        </td>

                        {/* 4. จำนวนเงิน */}
                        <td
                          className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                            isExpense ? "text-[#E11D48]" : "text-[#059669]"
                          }`}
                        >
                          {isExpense ? "-" : "+"}
                          {formatCurrency(tx.amount)}
                        </td>

                        {/* Actions for Treasurer */}
                        {isTreasurer && (
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {onEdit && (
                                <button
                                  type="button"
                                  onClick={() => onEdit(tx)}
                                  className="p-1.5 text-[#7B708A] hover:text-[#9333EA] hover:bg-[#FAF5FF] rounded-lg transition-colors"
                                  title="แก้ไขรายการ"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  type="button"
                                  onClick={() => onDelete(tx.id)}
                                  className="p-1.5 text-[#7B708A] hover:text-[#E11D48] hover:bg-[#FFF1F2] rounded-lg transition-colors"
                                  title="ลบรายการ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom-Right Monthly Sum: [ รวม : XXX ] as in User Sketch */}
          <div className="flex justify-end pt-1 pr-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white border border-[#E9D5FF] shadow-xs text-xs sm:text-sm">
              <span className="font-semibold text-[#7B708A]">รวม :</span>
              <span
                className={`font-bold ${
                  group.netTotal >= 0 ? "text-[#059669]" : "text-[#E11D48]"
                }`}
              >
                {group.netTotal >= 0 ? "+" : ""}
                {formatCurrency(group.netTotal)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
