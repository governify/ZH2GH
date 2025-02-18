//index.controller.js
import BluejayService from '../services/BluejayService.js';
import GithubService from '../services/GithubService.js';
import logger from '../utils/logger.js';

/** Decides which function to call based on the type of the request. 
 * @param {Object} req - The Express request object.
 * @param {ExpectedZenHubData} req.body  - The body of the request with ZenHub data.
 * @param {Object} res - The Express response object.
 */
async function POST_default(req, res) {
    const repository = await GithubService.getRepoData(req.body.github_url);
    if (req.body.type === "issue_transfer") {
        logger.info("Processing issue transfer for issue:", req.body.issue_title);
        BluejayService.processIssueTransfer(repository, req.body.to_pipeline_name, req.body.issue_title)
            .then(result => {
                res.status(200).send(result);
                logger.info("Issue transfer processed successfully:", result);
            })
            .catch(err => {
                res.status(err.status || 500).send(err);
                logger.error("Error processing issue transfer:", err);
            });
    } else {
        const message = "The type of the request is not supported: " + req.body.type;
        logger.warn(message);
        res.status(400).send({ message: "The type of the request is not supported." });
    }
}

export default { POST_default };

//Docs--------------------------------------------------------------------------------------------------
/**
 *   @typedef {Object} ExpectedZenHubData
 *   @property {string} type - Type of ZenHub data (e.g., "issue_transfer").
 *   @property {string} github_url - GitHub URL of the issue/item. 
 *   @property {string} organization - GitHub organization name.
 *   @property {string} repo - GitHub repository name.
 *   @property {string} user_name - GitHub username.
 *   @property {string} issue_number - GitHub issue number.
 *   @property {string} issue_title - Title of the GitHub issue. 
 *   @property {string} to_pipeline_name - Destination pipeline name.(column name) (e.g., "New Issues")
 *   @property {string} workspace_id - ZenHub workspace ID.
 *   @property {string} workspace_name - ZenHub workspace name.
 *   @property {string} from_pipeline_name - Source pipeline name(column name) (e.g., "Discussion")
 */
