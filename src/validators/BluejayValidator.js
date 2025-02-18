import GithubService from '../services/GithubService.js';
import { BLUEJAY_STATUS_OPTIONS_NAMES } from "../index.js";
import logger from '../utils/logger.js';

const validateRequestBody = (req, res, next) => {
    logger.debug("Validating request body:", req.body);
    const { github_url, type, to_pipeline_name } = req.body;
    if (!github_url || !type || !to_pipeline_name) {
        return res.status(400).json({ error: "Missing required fields: github_url, type, to_pipeline_name" });
    }
    next();
};

export default {
    validateNotEpicTag: validateNotEpicTag,
    validateZenHubDestinationPipeline: validateZenHubDestinationPipeline,
    validateRequestBody: validateRequestBody
};

/**
 * Calls github API to check if the issue is tagged with epic.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
function validateNotEpicTag(req, res, next) {
    logger.debug("Validating if the issue is an epic with URL:", req.body.github_url);
    GithubService.isEpicIssue(req.body.github_url)
        .then(isEpic => {
            if (isEpic) {
                logger.info("The issue is an epic. Epic issues are ignored.");
                res.status(200).send({ message: "The issue is an epic. Epic issues are ignored." });
            } else {
                logger.info("The issue is not an epic. Proceeding to the next validation.");
                next();
            }
        })
        .catch(err => {
            res.status(500).send({ message: "Error: " + err });
            logger.error("Error validating if the issue is an epic: ", err.message);
        });
}

/**
 * Only applies to issue_transfer events.
 * Destination pipeline must be one of the bluejay status options.(e.g., "Todo", "In Progress","In Review", "Done")
 * Movements to other pipelines are discarded.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
function validateZenHubDestinationPipeline(req, res, next) {
    logger.debug("Validating destination pipeline:", req.body.to_pipeline_name);
    if (req.body.type == "issue_transfer" && BLUEJAY_STATUS_OPTIONS_NAMES.includes(req.body.to_pipeline_name)) {
        next();
    } else {
        logger.warn("The destination pipeline or the type is not allowed: ", req.body.to_pipeline_name + ". Aborting...");
        res.status(400).send({ message: "The destination pipeline is not allowed." });
    }
}
