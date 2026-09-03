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
  Filter,
  Trash2,
  Edit,
  Tag,
} from "lucide-react";

interface TransactionTableProps {
  transactions: Transaction[];
  isTreasurer?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
  limit?: number;
  showFilters?: boolean;
}

export default function TransactionTable({
  transactions,
  isTreasurer = false,
  onEdit,
  onDelete,
  limit,
  showFilters = true,
}: TransactionTableProps) {
  const [filterType, setFilterType] = useState<"all" | "income" | "expense" | "fund">("all");
  const [searchQuery, setSearchQuery] = useState("");

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
          t.category.toLowerCase().includes(q)
      );
    }

    if (limit && limit > 0) {
      list = list.slice(0, limit);
    }

    return list;
  }, [transactions, filterType, searchQuery, limit]);

  return (
    <div className="space-y-3">
      {/* Optional Filters & Search */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#9E94AD] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารายการ หรือหมวดหมู่..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C084FC] text-[#332941]"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-[#F8F5FB] p-1 rounded-xl border border-[#EFE8F6] overflow-x-auto">
            <button
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

      {/* Table Container */}
      <div className="pastel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#FAF5FF] border-b border-[#EFE8F6] text-[#7B708A] font-semibold">
                <th className="py-3 px-4 whitespace-nowrap">วันที่ (พ.ศ.)</th>
                <th className="py-3 px-4 whitespace-nowrap">ประเภท</th>
                <th className="py-3 px-4 whitespace-nowrap">หมวดหมู่</th>
                <th className="py-3 px-4">รายการ / รายละเอียด</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">จำนวนเงิน</th>
                {isTreasurer && (
                  <th className="py-3 px-4 text-center whitespace-nowrap">จัดการ</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EDF7]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={isTreasurer ? 6 : 5}
                    className="py-8 text-center text-xs text-[#9E94AD]"
                  >
                    ไม่พบรายการข้อมูล
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isExpense = tx.type === "expense";
                  const isFund = tx.type === "fund";
                  const isIncome = tx.type === "income";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-[#FAF5FF]/50 transition-colors"
                    >
                      {/* Buddhist Era Date (Strictly NO TIME) */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-[#7B708A] text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#C084FC]" />
                          <span>{formatThaiDate(tx.date)}</span>
                        </div>
                      </td>

                      {/* Type Badge */}
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

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap text-[#7B708A] text-xs">
                        <span className="inline-flex items-center gap-1 bg-[#F8F5FB] px-2 py-0.5 rounded-md border border-[#EFE8F6]">
                          <Tag className="w-2.5 h-2.5 text-[#9E94AD]" />
                          {tx.category}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 font-medium text-[#332941] max-w-xs truncate">
                        {tx.description}
                      </td>

                      {/* Amount */}
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
                                onClick={() => onEdit(tx)}
                                className="p-1.5 text-[#7B708A] hover:text-[#9333EA] hover:bg-[#FAF5FF] rounded-lg transition-colors"
                                title="แก้ไขรายการ"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDelete && (
                              <button
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
