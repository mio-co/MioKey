// Only the transactionGuard CHECK means "another writer changed the rows";
// any other batch failure is a real D1 error.
export function isTransactionGuardFailure(cause: unknown) {
  return String(cause).includes("transactionGuard_value_check");
}
