import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

export const runWithTransaction = (transactionId, fn) => {
  asyncLocalStorage.run(new Map([['transactionId', transactionId]]), fn);
};

export const getTransactionId = () => {
  const store = asyncLocalStorage.getStore();
  return store ? store.get('transactionId') : undefined;
};
