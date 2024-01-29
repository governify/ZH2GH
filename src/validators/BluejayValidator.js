import GithubService from '../services/GithubService.js';
import { BLUEJAY_STATUS_OPTIONS_NAMES } from "../index.js";
export default {
    validateNotEpicTag: validateNotEpicTag,
    validateZenHubDestinationPipeline: validateZenHubDestinationPipeline
};

/**
 * Calls github API to check if the issue is tagged with epic.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
function validateNotEpicTag(req, res, next) {
    GithubService.isEpicIssue(req.body.github_url)
        .then(isEpic => {
            if (isEpic) {
                console.log("The issue is an epic. Epic issues are ignored.")
                res.status(200).send({ mesagge: "The issue is an epic. Epic issues are ignored." })
            } else {
                console.log("The issue is not an epic. Continue...")
                console.log("Request body:", JSON.stringify(req.body, null, 2))
                next();
            }
        })
        .catch(err => { res.status(500).send({ message: "Error: " + err }); console.log("Error validating: ", err) })
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
    if (req.body.type == "issue_reprioritized") {//Issue creation
        next();
    } else if (req.body.type == "issue_transfer" && BLUEJAY_STATUS_OPTIONS_NAMES.includes(req.body.to_pipeline_name)){
        next();
    } else {
        console.log("The destination pipeline or the type is not allowed: ", req.body.to_pipeline_name + " .Aborting...")
        res.status(400).send({ message: "The destination pipeline is not allowed." })
    }


}
