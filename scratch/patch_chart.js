const fs = require('fs');
const file = 'src/components/StatChart.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Filter UI & State
content = content.replace(
  'const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);',
  'const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);\n  const [startDate, setStartDate] = useState<string>("");\n  const [endDate, setEndDate] = useState<string>("present");\n  const [isFilterLoaded, setIsFilterLoaded] = useState(false);\n\n  useEffect(() => {\n    const s = localStorage.getItem("bj3_chart_start");\n    const e = localStorage.getItem("bj3_chart_end");\n    if (s) setStartDate(s);\n    if (e) setEndDate(e);\n    setIsFilterLoaded(true);\n  }, []);\n\n  const handleSaveFilter = (s: string, e: string) => {\n    setStartDate(s);\n    setEndDate(e);\n    localStorage.setItem("bj3_chart_start", s);\n    localStorage.setItem("bj3_chart_end", e);\n  };'
);

// 2. Data Filtering logic
// Instead of rewriting the complex loop, we just filter the output rr!
content = content.replace(
  'return arr;',
  'return arr.filter(d => {\n        if (timeframe !== "day" && d.income === 0 && d.expense === 0) return false;\n        return true;\n      });'
);

// Wait, the loops use hardcoded 29, 5, 11 iterations (30 days, 6 months of weeks, 12 months).
// If the user selects a custom date range, we need to generate dates between those ranges!
