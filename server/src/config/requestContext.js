const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

function getCorrelationId() {
  const store = asyncLocalStorage.getStore();
  return store?.correlationId || 'none';
}

function getUserId() {
  const store = asyncLocalStorage.getStore();
  return store?.userId;
}

function run(store, fn) {
  return asyncLocalStorage.run(store, fn);
}

module.exports = { getCorrelationId, getUserId, run, asyncLocalStorage };
