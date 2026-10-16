import express from 'express';
import * as customersController from './customers/customers.controller';
import * as ordersController from './orders/orders.controller';
import * as inventoryController from './inventory/inventory.controller';

import * as catalogController from './catalog/catalog.controller';
import * as procurementController from './procurement/procurement.controller';
import * as paymentsController from './payments/payments.controller';
import * as reportsController from './reports/reports.controller';
import * as documentsController from './documents/documents.controller';
import * as accountsController from './accounts/accounts.controller';

const router = express.Router();

// ==========================================
// MONEY ACCOUNTS
// ==========================================
// /accounts/balances is declared before /accounts/:id/... so the literal
// segment is not swallowed by the parameterised route.
router.get('/accounts/balances', accountsController.getAccountBalances);
router.get('/accounts/:id/cashbook', accountsController.getAccountCashbook);
router.get('/accounts', accountsController.getAccounts);
router.post('/accounts', accountsController.createAccount);
router.put('/accounts/:id', accountsController.updateAccount);

// ==========================================
// CUSTOMERS
// ==========================================
router.get('/customers', customersController.getCustomers);
router.get('/customers/search', customersController.searchCustomers);
router.post('/customers', customersController.createCustomer);
router.put('/customers/:id', customersController.updateCustomer);
router.get('/customers/:id/history', customersController.getCustomerHistory);
router.delete('/customers/:id', customersController.deleteCustomer);

// ==========================================
// ORDERS
// ==========================================
router.get('/orders', ordersController.getOrders);
router.post('/orders', ordersController.createOrder);
router.post('/orders/checkout', ordersController.processCheckout);
router.get('/orders/:id/items', ordersController.getOrderItems);

// ==========================================
// ORDER PAYMENTS & FULFILLMENT
// ==========================================
router.post('/orders/payments', paymentsController.recordOrderPayment);
router.post('/orders/refunds', paymentsController.processRefund);
router.post('/orders/fulfill', paymentsController.fulfillOrder);

// ==========================================
// INVENTORY & STOCK TAKING
// ==========================================
router.get('/inventory/movements', inventoryController.getMovements);
router.post('/inventory/movements', inventoryController.recordMovement);
router.get('/stock-taking/sessions', inventoryController.getStockTakingSessions);
router.post('/stock-taking/sessions', inventoryController.startStockTakingSession);
router.get('/stock-taking/sessions/:id/items', inventoryController.getStockTakingItems);
router.post('/stock-taking/items', inventoryController.saveStockTakingItems);
router.post('/stock-taking/sessions/:id/complete', inventoryController.completeStockTakingSession);
router.delete('/stock-taking/sessions/:id', inventoryController.deleteStockTakingSession);

// ==========================================
// PROCUREMENT
// ==========================================
router.get('/procurement/suppliers', procurementController.getSuppliers);
router.post('/procurement/suppliers', procurementController.createSupplier);
router.get('/procurement/requests', procurementController.getProcurementRequests);
router.post('/procurement/requests', procurementController.createRequestWithItems);
router.get('/procurement/requests/:id/items', procurementController.getProcurementRequestItems);
router.patch('/procurement/requests/:id/status', procurementController.updateRequestStatus);
router.delete('/procurement/requests/:id', procurementController.deleteRequest);
router.put('/procurement/requests/:id/update', procurementController.updateRequestWithItems);
router.post('/procurement/receive', procurementController.receiveProcurementItem);
router.get('/procurement/suppliers/:id/statement', procurementController.getSupplierStatement);
router.post('/procurement/suppliers/:id/payments', procurementController.recordSupplierPayment);

// Editing and deleting a payment run the migration-47 RPCs, which lock the
// order and the accounts, re-test sufficiency against only what changes, and
// recompute the order totals in the same transaction. Both are gated on
// SUPPLIER_PAYMENT_ROLES — the endpoints removed earlier had no gate at all.
// They are keyed by payment id alone, without a supplier in the path, because
// the RPC scopes by manifest and a payment belongs to exactly one supplier
// already; a second id in the path would be a second thing to disagree.
router.put('/procurement/payments/:paymentId', procurementController.updateSupplierPayment);
router.delete('/procurement/payments/:paymentId', procurementController.deleteSupplierPayment);
router.get('/procurement/goods-receipts', procurementController.getGoodsReceipts);
router.post('/procurement/goods-receipts', procurementController.createGoodsReceipt);

// ==========================================
// PROCUREMENT PAYMENTS
// ==========================================
// Reading the payments on a purchase order is all that lives here now. The
// write endpoints live with the rest of procurement above.
//
// The originals were removed and are not coming back in their old shape:
//
//   POST   /procurement/payments
//     Inserted the row directly with no account_id, so the payment never
//     reached sales_account_ledger (which filters on account_id IS NOT NULL)
//     and the cash position stayed overstated. It took no lock and ran no
//     overdraft check. Replaced by POST /procurement/suppliers/:id/payments.
//
//   DELETE /procurement/payments/:paymentId/requests/:requestId
//     Had no role check at all, and recomputed the order totals through an
//     unscoped query. Replaced by DELETE /procurement/payments/:paymentId,
//     which is gated and runs the migration-47 RPC.
//
router.get('/procurement/requests/:id/payments', paymentsController.getProcurementPayments);

// ==========================================
// REPORTS
// ==========================================
router.get('/reports/cash-position', reportsController.getCashPosition);
router.get('/reports/inventory-valuation', reportsController.getInventoryValuation);
router.get('/reports/all-time-stats', reportsController.getAllTimeStats);
router.get('/reports/daily-sales', reportsController.getDailySales);
router.get('/reports/financial-position', reportsController.getFinancialPosition);
router.get('/reports/summary', reportsController.getSalesSummary);

// ==========================================
// DOCUMENTS
// ==========================================
router.get('/documents', documentsController.getDocuments);
router.post('/documents/generate', documentsController.generateDocument);
router.patch('/documents/:id/status', documentsController.updateDocumentStatus);
router.delete('/documents/:id', documentsController.deleteDocument);

// ==========================================
// CATALOG
// ==========================================
router.get('/catalog/categories', catalogController.getCategories);
router.post('/catalog/categories', catalogController.createCategory);
router.put('/catalog/categories/:id', catalogController.updateCategory);
router.delete('/catalog/categories/:id', catalogController.deleteCategory);

router.get('/catalog/products', catalogController.getProducts);
router.post('/catalog/products', catalogController.createProduct);
router.put('/catalog/products/:id', catalogController.updateProduct);
router.delete('/catalog/products/:id', catalogController.deleteProduct);

router.get('/catalog/variants', catalogController.getVariants);
router.post('/catalog/variants', catalogController.createVariant);
router.put('/catalog/variants/:id', catalogController.updateVariant);
router.delete('/catalog/variants/:id', catalogController.deleteVariant);
router.patch('/catalog/variants/:id/stock', catalogController.updateVariantStock);

export default router;
