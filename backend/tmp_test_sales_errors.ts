import { parseSalesRpcError, SalesRequestError, SALES_SQLSTATE } from './src/modules/sales/shared/salesErrors';

let pass = 0, fail = 0;
const ok = (c: boolean, label: string, extra = '') => {
    c ? pass++ : fail++;
    console.log(`  ${c ? 'PASS' : 'FAIL'}  ${label}${c ? '' : '   ' + extra}`);
};

console.log('=== SQLSTATE -> HTTP mapping ===');
const cases: Array<[string, number, string, string]> = [
    [SALES_SQLSTATE.PERIOD_CLOSED, 409, 'SALES_PERIOD_CLOSED: Sep 2026 is closed for manifest x', 'SALES_PERIOD_CLOSED'],
    [SALES_SQLSTATE.NOT_FOUND, 404, 'SALES_ACCOUNT_NOT_FOUND: abc', 'SALES_ACCOUNT_NOT_FOUND'],
    [SALES_SQLSTATE.INSUFFICIENT_FUNDS, 422, 'SALES_INSUFFICIENT_FUNDS: Cash has 100, needs 200', 'SALES_INSUFFICIENT_FUNDS'],
    [SALES_SQLSTATE.INVALID_INPUT, 422, 'SALES_INVALID_AMOUNT: a PAID receipt must settle the full 500', 'SALES_INVALID_AMOUNT'],
    [SALES_SQLSTATE.FORBIDDEN, 403, 'SALES_SELF_APPROVAL: requester cannot approve', 'SALES_SELF_APPROVAL'],
    [SALES_SQLSTATE.INSUFFICIENT_STOCK, 409, 'SALES_INSUFFICIENT_STOCK: only 2 left', 'SALES_INSUFFICIENT_STOCK']
];
for (const [code, expectedStatus, message, expectedReason] of cases) {
    const p = parseSalesRpcError({ code, message });
    ok(!!p && p.httpStatus === expectedStatus && p.reason === expectedReason,
        `${code} -> ${expectedStatus} (${expectedReason})`,
        JSON.stringify(p));
}

console.log('\n=== detail is extracted, sentinel stripped ===');
const funds = parseSalesRpcError({ code: 'P0003', message: 'SALES_INSUFFICIENT_FUNDS: Cash has 100, needs 200' });
ok(funds?.message === 'Cash has 100, needs 200', `message = "${funds?.message}"`);

console.log('\n=== non-sales errors fall through ===');
ok(parseSalesRpcError({ code: '23505', message: 'duplicate key' }) === null, 'unique violation -> null');
ok(parseSalesRpcError({ code: '42501', message: 'permission denied' }) === null, 'permission denied -> null');
ok(parseSalesRpcError(new Error('socket hang up')) === null, 'network error -> null');
ok(parseSalesRpcError(null) === null, 'null -> null');
ok(parseSalesRpcError({ message: 'no code' }) === null, 'no code -> null');

console.log('\n=== a SALES_ message without a recognised SQLSTATE is not trusted ===');
ok(parseSalesRpcError({ code: 'XX000', message: 'SALES_INSUFFICIENT_FUNDS: spoofed' }) === null,
    'message alone does not drive the status');

console.log('\n=== message with no sentinel still maps on SQLSTATE ===');
const bare = parseSalesRpcError({ code: 'P0001', message: 'something else entirely' });
ok(bare?.httpStatus === 409 && bare?.reason === null && bare?.message === 'something else entirely',
    'bare P0001 -> 409, reason null', JSON.stringify(bare));

console.log('\n=== multi-line detail survives (no `s` flag) ===');
const multi = parseSalesRpcError({ code: 'P0004', message: 'SALES_INVALID_AMOUNT: line one\nline two' });
ok(multi?.message === 'line one\nline two', `multi-line preserved`, JSON.stringify(multi?.message));

console.log('\n=== SalesRequestError ===');
const v = SalesRequestError.validation('qtyReceivedNow', 'Must be a whole number greater than zero');
ok(v.httpStatus === 422, 'validation -> 422');
ok(v.field === 'qtyReceivedNow', 'field is named');
ok(v.message === 'Validation failed -> qtyReceivedNow: "Must be a whole number greater than zero"',
    'message matches VALIDATION_RULES section 3 format', v.message);
ok(SalesRequestError.notFound('x').httpStatus === 404, 'notFound -> 404');
ok(SalesRequestError.conflict('x').httpStatus === 409, 'conflict -> 409');
ok(v instanceof Error, 'is an Error');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
