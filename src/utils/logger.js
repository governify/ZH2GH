import dotenv from 'dotenv';
dotenv.config();

const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'];
const currentLogLevel = (process.env.ZH2GH_LOG_LEVEL || 'INFO').toUpperCase();



function log(level, ...messages) {
    if (LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(currentLogLevel)) {
        const timestamp = new Date().toISOString();
        console.log(`${timestamp} [${level}]:`, ...messages);
    }
}

export default {
    debug: (...messages) => log('DEBUG', ...messages),
    info: (...messages) => log('INFO', ...messages),
    warn: (...messages) => log('WARN', ...messages),
    error: (...messages) => log('ERROR', ...messages),
    currentLogLevel: currentLogLevel
};
