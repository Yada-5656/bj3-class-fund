const fs = require('fs');
const content = fs.readFileSync('src/app/[room]/treasurer/page.tsx', 'utf8');
const icons = ['ShieldCheck', 'CheckSquare', 'Receipt', 'Settings', 'PlusCircle', 'Lock', 'ArrowLeft', 'CheckCircle2', 'KeyRound', 'Coins', 'ArrowRight', 'BookOpen'];
icons.forEach(i => {
  const match = content.match(new RegExp(i, 'g'));
  console.log(i, match ? match.length : 0);
});
