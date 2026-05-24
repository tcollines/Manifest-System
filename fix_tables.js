const fs = require('fs');
const files = [
  'frontend/modules/sales/pages/ProductsPage.tsx',
  'frontend/modules/sales/pages/InventoryPage.tsx',
  'frontend/modules/sales/pages/OrdersPage.tsx',
  'frontend/modules/sales/pages/CustomersPage.tsx'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('<table') && !content.includes('overflow-x-auto')) {
     content = content.replace(/<table/g, '<div className="overflow-x-auto">\\n<table className="w-full text-left min-w-[600px]"');
     content = content.replace(/<\/table>/g, '</table>\\n</div>');
     
     content = content.replace(/className="w-full text-left"/g, '');
     content = content.replace(/className="w-full text-left border-collapse"/g, '');
     
     fs.writeFileSync(f, content, 'utf8');
     console.log('Updated tables in ' + f);
  }
});
