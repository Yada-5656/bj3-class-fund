import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Crucial Requirement:
 * Strictly formats dates to Thai Buddhist Era (พ.ศ.) format: DD/MM/YYYY
 * NO time included.
 * Example: 2024-09-03 -> "03/09/2567"
 */
export function formatThaiDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-";
  
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    // If it's already an ISO string like "2024-09-03"
    if (typeof dateInput === "string" && dateInput.includes("-")) {
      const parts = dateInput.split("-");
      if (parts.length >= 3) {
        const year = parseInt(parts[0], 10) + 543;
        const month = parts[1].padStart(2, "0");
        const day = parts[2].substring(0, 2).padStart(2, "0");
        return `${day}/${month}/${year}`;
      }
    }
    return String(dateInput);
  }

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const buddhistYear = d.getFullYear() + 543;

  return `${day}/${month}/${buddhistYear}`;
}

/**
 * Returns today's date formatted in ISO YYYY-MM-DD for form input values
 */
export function getTodayISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats numbers into Thai Baht currency display
 * Example: 1500 -> "1,500.00 บาท" or "฿1,500.00"
 */
export function formatCurrency(amount: number, withSymbol = true): string {
  const formatted = new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return withSymbol ? `฿${formatted}` : formatted;
}
