const fs = require('fs');

function replaceFile(path, oldText, newText) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(oldText, newText);
  fs.writeFileSync(path, content, 'utf8');
}

function replaceRegexFile(path, regex, newText) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(regex, newText);
  fs.writeFileSync(path, content, 'utf8');
}

// OrdersPage
replaceRegexFile('frontend/modules/sales/pages/OrdersPage.tsx', /\$\$\{balance\}/g, 'UGX ${balance}');
replaceRegexFile('frontend/modules/sales/pages/OrdersPage.tsx', />\$\{o\.total_amount\}</g, '>UGX ${o.total_amount}<');
replaceRegexFile('frontend/modules/sales/pages/OrdersPage.tsx', />\$\{o\.amount_paid\}</g, '>UGX ${o.amount_paid}<');

// POSPage
replaceRegexFile('frontend/modules/sales/pages/POSPage.tsx', />\$\{variant\.selling_price\}</g, '>UGX ${variant.selling_price}<');
replaceRegexFile('frontend/modules/sales/pages/POSPage.tsx', />\$\{item\.variant\.selling_price \* item\.quantity\}</g, '>UGX ${item.variant.selling_price * item.quantity}<');
replaceRegexFile('frontend/modules/sales/pages/POSPage.tsx', />\$\{totalAmount\}</g, '>UGX ${totalAmount}<');
replaceRegexFile('frontend/modules/sales/pages/POSPage.tsx', />\$</g, '>UGX<');

// ProductsPage
replaceRegexFile('frontend/modules/sales/pages/ProductsPage.tsx', /Cost: \$\{v\.cost_price\?\\.toFixed\(2\)\}/g, 'Cost: UGX ${v.cost_price?.toFixed(2)}');
replaceRegexFile('frontend/modules/sales/pages/ProductsPage.tsx', />\$\{v\.selling_price\?\\.toFixed\(2\)\}/g, '>UGX ${v.selling_price?.toFixed(2)}<');

// SalesDashboardPage
replaceRegexFile('frontend/modules/sales/pages/SalesDashboardPage.tsx', /value: `\$\$\{data\.totalSales\.toFixed\(2\)\}`/g, 'value: `UGX ${data.totalSales.toFixed(2)}`');
replaceRegexFile('frontend/modules/sales/pages/SalesDashboardPage.tsx', /value: `\$\$\{data\.totalProfit\.toFixed\(2\)\}`/g, 'value: `UGX ${data.totalProfit.toFixed(2)}`');

console.log('Replaced $ with UGX successfully');
