import axios from 'axios';
import logger from '../utils/logger.js';
import { getKey, keyServices } from '../utils/keyManager.js';

const API_URL = 'https://api.github.com';

export default { isEpicIssue, getRepoData, updateProjectV2ItemFieldSingleSelectValue, copyTemplateProject, linkProjectV2ToRepository, linkIssueToProjectV2 };

/**
 * Checks if the issue is an epic. Epic issues are not processed by Bluejay.
 * @param {*} github_url 
 * @returns {Promise<boolean>}
 */
function isEpicIssue(github_url) {
  logger.debug("Checking if the issue is an epic with URL:", github_url);
  const [, , , owner, repo, , issueNumber] = github_url.split("/");
  const query = `{
        repository(owner: "${owner}", name: "${repo}") {
            issue(number: ${issueNumber}) {
              number
              labels(first:15){
                  nodes{
                      name
                  }
              }
            }
        }    
    }`;
  const callback = (axiosResponse) => {
    const isEpic = axiosResponse.data?.data?.repository?.issue?.labels?.nodes?.filter(label => label.name === "Epic").length > 0;
    logger.debug("Epic check result for issue:", isEpic);
    return isEpic;
  };
  return _fetchGithubGQL(query, callback);
}

/**
 * 
 * @param {string} github_url - GitHub issue URL. (e.g., https://github.com/gii-is-psg2/bluejay-psg2-23-24/issues/12)
 * @returns {Promise<Array<Object>>} Repo information (see query below)
 */
async function getRepoData(github_url) {
  logger.debug("Fetching repository data for URL:", github_url);
  const [, , , owner, repo, , issueNumber] = github_url.split("/");

  const query = `{
    repository(owner: "${owner}", name: "${repo}") {
      id
      name
      owner {
        id
      }
      projectsV2(first: 5) {
        nodes {
          id
          fields(first: 100) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
          items(first: 100) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              fieldValues(first: 100) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    optionId
                  }
                }
              }
            }
          }
        }
      }
      issue(number: ${issueNumber}) {
        number
        id
        title
        projectsV2(first: 5) {
          nodes {
            id
            fields(first: 100) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                  }
                }
              }
            }
            items(first: 100) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                fieldValues(first: 100) {
                  nodes {
                    ... on ProjectV2ItemFieldTextValue {
                      text
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      optionId
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;

  const callback = async (axiosResponse) => {
    const repository = axiosResponse.data.data.repository;

    const repoProjects = repository?.projectsV2?.nodes || [];
    const issueProjects = repository?.issue?.projectsV2?.nodes || [];

    // Paginate items for each project in repository.projectsV2
    for (const project of repoProjects) {
      project.items.nodes = await _fetchAllItems(project.id, project.items.nodes, project.items.pageInfo);
    }

    // Paginate items for each project in repository.issue.projectsV2
    for (const project of issueProjects) {
      project.items.nodes = await _fetchAllItems(project.id, project.items.nodes, project.items.pageInfo);
    }

    logger.debug("Repository data fetched with all paginated items");
    return repository;
  };

  return _fetchGithubGQL(query, callback);
}

/**
 * Fetches all items for a project using pagination.
 * @param {string} projectId - The ID of the project.
 * @param {Array} existingItems - The already fetched items.
 * @param {Object} pageInfo - The pagination info from the initial query.
 * @returns {Promise<Array>} - A promise resolving to the complete list of items.
 */
async function _fetchAllItems(projectId, existingItems, pageInfo) {
  let items = [...existingItems];
  let cursor = pageInfo.endCursor;

  while (pageInfo.hasNextPage) {
    logger.debug(`More items to fetch for project: ${projectId}, retrieving next page...`);
    const query = `{
      node(id: "${projectId}") {
        ... on ProjectV2 {
          items(first: 100, after: "${cursor}") {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              fieldValues(first: 100) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    optionId
                  }
                }
              }
            }
          }
        }
      }
    }`;

    const callback = (axiosResponse) => {
      const newItems = axiosResponse.data.data.node.items.nodes;
      pageInfo = axiosResponse.data.data.node.items.pageInfo;
      cursor = pageInfo.endCursor;
      return newItems;
    };

    const newItems = await _fetchGithubGQL(query, callback);
    items = items.concat(newItems);
  }

  return items;
}

/**
 * 
 * @param {int} projectId Id of a project. A project is a board in a repository 
 * @param {int} itemId Id of an Item. An item is a card in a project (Issue,Draft,PR)
 * @param {int} fieldId Id of a field. A field is a column in a project (Status)
 * @param {int} optionId Id of an option. An option is a value in a field (Todo, In progress, Done)
 * @returns {Promise<AxiosResponse<any>>} Axios response with the result of the operation.
 */
function updateProjectV2ItemFieldSingleSelectValue(projectId, itemId, fieldId, optionId) {
  logger.debug(`Updating project item field value: projectId=${projectId}, itemId=${itemId}, fieldId=${fieldId}, optionId=${optionId}`);
  const query = `mutation {
                updateProjectV2ItemFieldValue(
                  input: {projectId: "${projectId}", itemId: "${itemId}", fieldId: "${fieldId}", value: {singleSelectOptionId: "${optionId}"}}
                ) {
                  projectV2Item {
                    fieldValues(first: 100) {
                      nodes {
                        ... on ProjectV2ItemFieldSingleSelectValue {
                          name
                        }
                      }
                    }
                  }
                }
              }`;
  const callback = (axiosResponse) => {
    logger.debug("Project item field value updated:", axiosResponse.data);
    return axiosResponse;
  };
  return _fetchGithubGQL(query, callback);
}

/**
 * Creates a new project from the bluejay template at gii-is-psg2.
 * @param {} github_url 
 * @returns id of the project created
 */
function copyTemplateProject(repository) {
  logger.debug("Copying template project for repository:", repository?.name);
  const templateProjectId = "PVT_kwDOAtNQmc4Abbo8";
  const query =
    `mutation copyProjectV2{
    copyProjectV2(
      input: {title: "${repository.name}",projectId: "${templateProjectId}",ownerId: "${repository.owner.id}"
   }) {
     projectV2 {
       id
       items(first: 100) {
        nodes {
          id
          fieldValues(first: 100) {
            nodes {
              ... on ProjectV2ItemFieldTextValue {
                text
              }
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                optionId
              }
            }
          }
        }
      }
       fields(first: 100) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id
            name
            options {
              id
              name
            }
     			}
   			}
 			}
    }
  }
}`;
  const callback = (axiosResponse) => {
    logger.debug("Template project copied:", axiosResponse.data.data.copyProjectV2.projectV2);
    return axiosResponse.data.data.copyProjectV2.projectV2;
  };
  return _fetchGithubGQL(query, callback);
}

function linkProjectV2ToRepository(repositoryId, projectId) {
  logger.debug(`Linking project to repository: repositoryId=${repositoryId}, projectId=${projectId}`);
  const query =
    `
  mutation {
    linkProjectV2ToRepository(
      input: {repositoryId: "${repositoryId}", projectId: "${projectId}"}
    ) {
      repository{
        id
      }
    }
  }
  `;
  const callback = (axiosResponse) => {
    logger.debug("Project linked to repository:", axiosResponse.data);
    return axiosResponse;
  };
  return _fetchGithubGQL(query, callback);
}

/**
 * Links an issue to a project. The issue is added as a card to the project.
 * @param {Object} project ```{id,issue:{id,title},items:{nodes:[{id,fieldValues:{nodes:[{text}]}}]}```
 * @returns 
 */
function linkIssueToProjectV2(project) {
  logger.debug("Linking issue to project:", project.id);
  const query = `mutation linkIssueToProjectV2{
      addProjectV2ItemById(input: {projectId: "${project.id}" contentId: "${project.issue.id}"}) {
        item {
          id
        }
      }
    }`;
  const callback = (axiosResponse) => {
    const item = {
      id: axiosResponse.data.data.addProjectV2ItemById.item.id,
      fieldValues: {
        nodes: [{ text: project.issue.title }]
      }
    };
    project.items.nodes.push(item);
    logger.debug("Issue linked to project:", item);
    return axiosResponse.data.data.addProjectV2ItemById.item.id;
  };
  return _fetchGithubGQL(query, callback);
}

//PRIVATE FUNCTIONS-------------------------------------------------------------------------------------
/**
 *  Axios post to the GitHub GraphQL API.
 * @param {*} query  - GraphQL query.
 * @param {*} resTrasformer  - Callback function to transform the response of the axios request.
 * @returns {Promise<AxiosResponse<any>>} Axios response tranformed by the callback function.
 */
function _fetchGithubGQL(query, resTrasformer) {
  const GITHUB_APIKEY = getKey(keyServices.github);
  return new Promise((resolve, reject) => {
    axios.post(API_URL + '/graphql', { query: query }, { headers: { Authorization: 'Bearer ' + GITHUB_APIKEY, Accept: 'application/vnd.github.starfox-preview+json' } })
      .then(axiosResponse => {

        logger.debug("Github Fetch was successful");
        const result = resTrasformer(axiosResponse);
        resolve(result);
      })
      .catch(err => {
        logger.error("Error fetching GitHub GQL: ", err.message);
        reject(new Error("Error fetching GitHub GQL: " + err.message));
      });
  });
}