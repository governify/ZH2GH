import AlertService from "./AlertService.js";
import GithubService from "./GithubService.js";
import { BLUEJAY_STATUS_OPTIONS_NAMES } from "../index.js";
export default { processIssueTransfer, processIssueCreation }

/**
 * Tries to copy the issue transfer to all GitHub projects containing the issue.
 * 
 * @param {*} repository  - The github repository data
 * @returns  {Promise<{result: string} | {error: Error}>} - The result of the operation or an error.
 */
async function processIssueTransfer(repository, to_pipeline_name, issueTitle) {

  const filteredProjects = repository?.issue?.projectsV2?.nodes
  if (!filteredProjects) throw new Error("Error getting projects")
  if (filteredProjects.length === 0) {
    const message = "Tried to tranfer an issue not linked to any project. Issue : " + repository.issue.title + " in repo: " + repository.name;
    AlertService.alert(message)
  }

  for (let i = 0; i < filteredProjects.length; i++) {
    _setFieldOption(filteredProjects[i], "Status", to_pipeline_name, issueTitle)

  }
  return { result: "Issue transfer processed" }

}
/**
 * Creates a project if the issue is not linked to any project with the status options required by Bluejay.
 * @param {*} body 
 * @returns 
 */
async function processIssueCreation(repository, to_pipeline_name = "Todo", issueTitle) {
  const projects = repository?.projectsV2?.nodes

  let numberOfProjectsUpdated = 0;
  for (let project of projects) {
    if (_checkStatusOptions(project)) { //Valid project
      project.issue = repository.issue
      await GithubService.linkIssueToProjectV2(project)
      await _setFieldOption(project, "Status", to_pipeline_name, issueTitle)
      numberOfProjectsUpdated++
    }
  }

  if (numberOfProjectsUpdated === 0) {
    //creates a new project
    const newProject = await GithubService.copyTemplateProject(repository)//Is a valid project (hopefully :D)
    newProject.issue = repository.issue
    await GithubService.linkProjectV2ToRepository(repository.id, newProject.id)
    await GithubService.linkIssueToProjectV2(newProject)
    await _setFieldOption(newProject, "Status", to_pipeline_name, issueTitle)
    console.log("No valid project found in repo: ", repository.name)
    console.log("New project created: ", newProject.id)

  }
  return { result: "Issue creation processed" }

}




function _checkStatusOptions(project) {
  try {

    let valid = true
    //Option names like "Todo", "In Progress", "In Review", "Done"
    const statusOptionNames = project.fields.nodes.find(fieldNode => fieldNode.name == "Status").options.map(option => option.name)

    const hasAtLeastAllowedStatusOptions = BLUEJAY_STATUS_OPTIONS_NAMES
      .every(allowedOption => statusOptionNames.includes(allowedOption))
    //If the project does not have the required status options, it is not valid
    if (!statusOptionNames || statusOptionNames.length === 0 || !hasAtLeastAllowedStatusOptions) {
      valid = false
    }
    console.log((valid ? "valid" : "invalid") + " options in project: " + project.id)
    return valid
  } catch (err) {
    console.error("Error checking status field: ", err)
    return false
  }
}

async function _setFieldOption(project, fieldName, optionName, issueTitle) {
  try {
    const statusField = project.fields.nodes.find(fieldNode => fieldNode.name == fieldName) //Column in the project
    const option = statusField.options.find(option => option.name === optionName)//Column value (Todo, In progress, Done)
    const item = project.items.nodes.find(item => item.fieldValues.nodes.find(fieldValue => fieldValue.text === issueTitle))

    const res = await GithubService.updateProjectV2ItemFieldSingleSelectValue(project?.id, item?.id, statusField?.id, option?.id)
    if (res.data?.errors) AlertService.alert("Error updating one of the project of issue at GitHub: " + issueTitle + "\n errors:" + JSON.stringify(res.data.errors, null, 2))
    else console.log("Project for :" + project.id + " has been updated")
  } catch (err) {
    console.error("Error setting field option: ", err)
    return null
  }
}


