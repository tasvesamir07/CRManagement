const pino = require('pino');
const { getCorrelationId } = require('./requestContext');

const isDev = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l' },
      }
    : undefined,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

const defaultLogger = new Proxy(logger, {
  get(target, prop) {
    if (typeof target[prop] !== 'function') return target[prop];
    return (...args) => {
      const correlationId = getCorrelationId();
      if (correlationId && correlationId !== 'none' && typeof args[0] === 'object' && args[0] !== null) {
        args[0].correlationId = correlationId;
      } else if (correlationId && correlationId !== 'none' && typeof args[0] === 'string') {
        args[0] = { msg: args[0], correlationId };
      }
      return target[prop](...args);
    };
  }
});

module.exports = defaultLogger;
