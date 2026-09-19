const fs = require('fs');
const file = 'src/app/[room]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace(
  'import { TreasurerLoginModal, ConfirmModal } from "@/components/Modals";',
  'import { TreasurerLoginModal, ConfirmModal } from "@/components/Modals";\nimport ManualModal from "@/components/ManualModal";\nimport { BookOpen } from "lucide-react";'
);

// 2. Add state
content = content.replace(
  'const [showLogoutModal, setShowLogoutModal] = useState(false);',
  'const [showLogoutModal, setShowLogoutModal] = useState(false);\n  const [showManualModal, setShowManualModal] = useState(false);'
);

// 3. Add button
content = content.replace(
  '<button\n            type="button"\n            onClick={handleExitRoom}',
  '<button\n            type="button"\n            onClick={() => setShowManualModal(true)}\n            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-xl text-[#9333EA] bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-[#E9D5FF] transition-all"\n            title="คู่มือการใช้งาน"\n          >\n            <BookOpen className="w-4 h-4" />\n            <span className="hidden sm:inline sm:ml-1.5 text-xs font-semibold">คู่มือ</span>\n          </button>\n          <button\n            type="button"\n            onClick={handleExitRoom}'
);

// 4. Add modal element
content = content.replace(
  '</>\n  );',
  '      {showManualModal && <ManualModal onClose={() => setShowManualModal(false)} />}\n    </>\n  );'
);

fs.writeFileSync(file, content);
