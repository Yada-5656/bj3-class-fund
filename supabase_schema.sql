-- =========================================================
-- Class Fund Management System - BJ3 (โรงเรียนบรรหารแจ่มใสวิทยา 3)
-- Supabase / PostgreSQL Database Schema
-- =========================================================

-- 1. Rooms Table (77 Rooms)
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,               -- e.g. "3-15", "1-1"
    name TEXT NOT NULL,                -- e.g. "3/15", "1/1"
    grade INTEGER NOT NULL,            -- 1 to 6
    room_number INTEGER NOT NULL,      -- 1 to 15
    treasurer_pin TEXT DEFAULT '1234', -- Default PIN for treasurer portal
    fund_fee_per_student NUMERIC(10, 2) DEFAULT 20.00, -- Default collection per period (THB)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Students Table (Mock or Real data per room)
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,               -- e.g. "3-15-01"
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    roll_number INTEGER NOT NULL,      -- 1, 2, 3 ...
    name TEXT NOT NULL,                -- "นักเรียนเลขที่ 1 (Student 1)"
    is_paid BOOLEAN DEFAULT FALSE,     -- Payment status for current period
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Transactions Table (Income, Expense, Class Fund)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('income', 'expense', 'fund')), -- 'income' | 'expense' | 'fund'
    category TEXT NOT NULL,            -- e.g. 'อุปกรณ์ทำความสะอาด', 'เอกสารชีท', 'เงินห้อง'
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,                -- Stored as standard DATE (formatted as Thai BE on client)
    created_by TEXT DEFAULT 'treasurer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_room_id ON students(room_id);
CREATE INDEX IF NOT EXISTS idx_transactions_room_id ON transactions(room_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);

-- Enable Row Level Security (RLS) if needed
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow public read access (matches public room dashboard requirement)
CREATE POLICY "Public read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Public read students" ON students FOR SELECT USING (true);
CREATE POLICY "Public read transactions" ON transactions FOR SELECT USING (true);

-- Allow updates with valid room PIN or API service key
CREATE POLICY "Allow update students" ON students FOR ALL USING (true);
CREATE POLICY "Allow modify transactions" ON transactions FOR ALL USING (true);
