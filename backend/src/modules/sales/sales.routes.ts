import express from 'express';
import * as customersController from './customers/customers.controller';
import * as ordersController from './orders/orders.controller';
import * as inventoryController from './inventory/inventory.controller';

import * as catalogController from './catalog/catalog.controller';
import * as procurementController from './procurement/procurement.controller';
import * as paymentsController from './payments/payments.controller';
import * as reportsController from './reports/reports.controller';

const router = express.Router();

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

// ==========================================
// PROCUREMENT PAYMENTS
// ==========================================
router.get('/procurement/requests/:id/payments', paymentsController.getProcurementPayments);
router.post('/procurement/payments', paymentsController.recordProcurementPayment);
router.delete('/procurement/payments/:paymentId/requests/:requestId', paymentsController.deleteProcurementPayment);

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
