import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

export const keyServices = {
    github: {
        name: 'GitHub',
        index: 0,
        keys: process.env.GITHUB_APIKEYS?.split(',').map(key => key.trim()) || []
    },
    // Add more services here

    // zenhub : {
    //     name: 'Zenhub',
    //     index: 0,
    //     keys: process.env.ZENHUB_APIKEYS?.split(',').map(key => key.trim()) || []
    // },
}

/**
 * Retrieves the next available key for the service.
 * This function cycles through a predefined list of keys and returns the next one in sequence.
 * @param {Object} service - The service for which to get the key
 * @param {string} service.name - The name of the service
 * @param {Object} service.index - The index of the current key
 * @param {Array<string>} service.keys - The list of keys for the service
 * @returns {string} The next key for the service
 */
export function getKey(service) {
    if (!service || !(service.index >= 0) || !service.keys || service.keys.length === 0) {
        throw new Error(`No keys found for service ${JSON.stringify(service)}`);
    }
    const currentKeyIndex = service.index;
    const key = service.keys[currentKeyIndex];
    service.index = (currentKeyIndex + 1) % service.keys.length;
    logger.debug(`Using key number ${currentKeyIndex + 1} of ${service.keys.length} for service ${service.name}`);
    return key;
}
