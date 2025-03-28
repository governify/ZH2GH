import GithubService from "./GithubService.js";
import { BLUEJAY_STATUS_OPTIONS_NAMES } from "../index.js";
import logger from '../utils/logger.js';

export default { processIssueTransfer };

/**
 * Tries to copy the issue transfer to all GitHub projects containing the issue.
 * 
 * @param {*} repository  - The github repository data
 * @returns  {Promise<{result: string} | {error: Error}>} - The result of the operation or an error.
 */
async function processIssueTransfer(repository, to_pipeline_name, issueTitle) {
    logger.debug("Processing issue transfer for repository:", repository?.name);
    const projectsLinkedToIssue = repository?.issue?.projectsV2?.nodes ?? [];
    if (!projectsLinkedToIssue) throw new Error("Error getting projects");
    const validProjectsLinkedToIssue = projectsLinkedToIssue.filter(project => _checkStatusOptions(project));

    if (validProjectsLinkedToIssue.length === 0) {
        const message = "Tried to transfer an issue not linked to any project. Issue: " + repository.issue.title + " in repo: " + repository.name + ". The system will try to find a valid project or create a new one.";
        logger.info(message);

        const projectsInRepo = repository?.projectsV2?.nodes;
        for (let project of projectsInRepo) {
            if (_checkStatusOptions(project)) {
                logger.info("Valid project found in repo:", repository.name, ". Linking issue to project:", project.id);
                project.issue = repository.issue;
                await GithubService.linkIssueToProjectV2(project);
                validProjectsLinkedToIssue.push(project);
            }
        }
        if (validProjectsLinkedToIssue.length === 0) {
            logger.info("No valid project found in repo:", repository.name, ". Creating a new project...");
            const newProject = await GithubService.copyTemplateProject(repository);
            logger.info("New project created:", newProject.id);
            newProject.issue = repository.issue;
            await GithubService.linkProjectV2ToRepository(repository.id, newProject.id);
            await GithubService.linkIssueToProjectV2(newProject);
            validProjectsLinkedToIssue.push(newProject);
        }
    }

    for (let i = 0; i < validProjectsLinkedToIssue.length; i++) {
        _setFieldOption(validProjectsLinkedToIssue[i], "Status", to_pipeline_name, issueTitle);
    }
    return { result: "Issue transfer processed" };
}

/**
 * Checks if the project has the required options in the "Status" field.
 * A status option is each of the selectable values in the field "Status" of the project.
 * Normally, these values are "Todo", "In Progress", "In Review", "Done".
 * @param {*} project - The project to check.
 * @returns {boolean} - True if the project has at least ALL the required status options.
 */
function _checkStatusOptions(project) {
    try {
        let valid = true;
        const statusOptionNames = project.fields.nodes.find(fieldNode => fieldNode.name == "Status").options.map(option => option.name);
        const hasAtLeastAllowedStatusOptions = BLUEJAY_STATUS_OPTIONS_NAMES.every(allowedOption => statusOptionNames.includes(allowedOption));
        if (!statusOptionNames || statusOptionNames.length === 0 || !hasAtLeastAllowedStatusOptions) {
            valid = false;
        }
        logger.info((valid ? "Valid" : "Invalid") + " options in project:", project.id);
        return valid;
    } catch (err) {
        logger.error("Error checking status field:", err.message);
        return false;
    }
}

async function _setFieldOption(project, fieldName, optionName, issueTitle) {
    try {
        const statusField = project.fields.nodes.find(fieldNode => fieldNode.name == fieldName);
        const option = statusField.options.find(option => option.name === optionName);
        const item = project.items.nodes.find(item => item.fieldValues.nodes.find(fieldValue => fieldValue.text === issueTitle));

        const res = await GithubService.updateProjectV2ItemFieldSingleSelectValue(project?.id, item?.id, statusField?.id, option?.id);
        if (res.data?.errors) {
            logger.error("Error updating project with id:", project.id, ":", res.data?.errors?.map(error => error.message).join(", "));
        } else {
            logger.info("Project with id:", project.id, "has been updated");
        }
    } catch (err) {
        logger.error("Error setting field option:", err.message);
        return null;
    }
}


