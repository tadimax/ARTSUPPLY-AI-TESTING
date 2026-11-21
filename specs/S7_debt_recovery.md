# S7: Recovering seller debts from a payout

Module: `sut/moneyMath.js` (CommonJS). All amounts are integer cents.

## Business rules
- A seller may owe several debts. When an amount is recovered (for example from a payout), it is applied to debts oldest first, by creation time (`createdAt`, ISO strings, earlier first). Debts with no `createdAt` sort as the oldest.
- A debt fully covered by the remaining amount is marked recovered and the remaining amount shrinks by that debt.
- If the remaining amount only partly covers a debt, that debt is not marked recovered. Its outstanding amount is reduced by what was applied, the amount applied is reported, and nothing remains.
- If money remains after all debts are paid, the leftover is reported. If there are no debts, the leftover is the whole amount.
- A debt exactly equal to the remaining amount counts as fully recovered.
- A negative or non-numeric recovered amount counts as 0, so no actions occur. A negative or non-numeric debt amount counts as 0.
- The input list must not be modified.

Also:
- `sumOutstandingDebtCents(debtDocs)` returns the sum of the `amountCents` of debts given, counting negative or non-numeric amounts as 0, and 0 for a missing list.

## Interface
- `allocateDebtRecovery(debts, recoveredCents)` where `debts` is an array of `{ id, amountCents, createdAt }` returns `{ actions, leftover }`. Each action is `{ id, recovered: true }` for a fully recovered debt or `{ id, recovered: false, newAmountCents, partialRecoveredCents }` for a partial one.
- `sumOutstandingDebtCents(debtDocs)`.
