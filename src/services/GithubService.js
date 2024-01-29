import dotenv from 'dotenv'
dotenv.config()
import axios from 'axios'

const GITHUB_APIKEY = process.env.GITHUB_APIKEY
const API_URL = 'https://api.github.com';

export default { isEpicIssue, getRepoData, updateProjectV2ItemFieldSingleSelectValue, copyTemplateProject, linkProjectV2ToRepository, linkIssueToProjectV2 }

/**
 * Checks if the issue is an epic. Epic issues are not processed by Bluejay.
 * @param {*} github_url 
 * @returns {Promise<boolean>}
 */
function isEpicIssue(github_url) {
  const [, , , owner, repo, , issueNumber] = github_url.split("/")
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
    }`
  const callback = (axiosResponse) => { return axiosResponse.data?.data?.repository?.issue?.labels?.nodes?.filter(label => label.name === "Epic").length > 0 }
  return _fetchGithubGQL(query, callback)
}

/**
 * 
 * @param {string} github_url - GitHub issue URL. (e.g., https://github.com/gii-is-psg2/bluejay-psg2-23-24/issues/12)
 * @returns {Promise<Array<Object>>} Repo information (see query below)
 */
function getRepoData(github_url) {
  const [, , , owner, repo, , issueNumber] = github_url.split("/")

  const query = `{
                repository(owner: "${owner}", name: "${repo}") {
                  id
                  name
                  owner{
                    id
                  }
                  projectsV2(first:5){
                    nodes{
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
              }`
  const callback = (axiosResponse) => { return axiosResponse.data.data.repository }
  return _fetchGithubGQL(query, callback)
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
              }`
  const callback = (axiosResponse) => { return axiosResponse }//not used
  return _fetchGithubGQL(query, callback)
}
/**
 * Creates a new project from the bluejay template at gii-is-psg2.
 * @param {} github_url 
 * @returns id of the project created
 */
function copyTemplateProject(repository) {
  /* id of the Bluejay template project at gii-is-psg2. Obtained using:
  query {
  organization(login: "gii-is-psg2"){
    projectsV2(first:5){
      nodes{
        title
        id
      }
    }
  }
  }
  */
  const templateProjectId = "PVT_kwDOAtNQmc4Abbo8"
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
}`
  const callback = (axiosResponse) => { return axiosResponse.data.data.copyProjectV2.projectV2 }
  return _fetchGithubGQL(query, callback)
}

function linkProjectV2ToRepository(repositoryId, projectId) {
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
  `
  const callback = (axiosResponse) => { return axiosResponse } //not used
  return _fetchGithubGQL(query, callback)
}
/**
 * Links an issue to a project. The issue is added as a card to the project.
 * @param {Object} project ```{id,issue:{id,title},items:{nodes:[{id,fieldValues:{nodes:[{text}]}}]}```
 * @returns 
 */

function linkIssueToProjectV2(project) {
  const query = `mutation linkIssueToProjectV2{
      addProjectV2ItemById(input: {projectId: "${project.id}" contentId: "${project.issue.id}"}) {
        item {
          id
        }
      }
    }`
  const callback = (axiosResponse) => { 
    const item = {
      id: axiosResponse.data.data.addProjectV2ItemById.item.id,
      fieldValues: {
        nodes:[{text: project.issue.title}]
      }
    }
    project.items.nodes.push(item)
    return axiosResponse.data.data.addProjectV2ItemById.item.id
  }
  return _fetchGithubGQL(query, callback)
}


//PRIVATE FUNCTIONS-------------------------------------------------------------------------------------
/**
 *  Axios post to the GitHub GraphQL API.
 * @param {*} query  - GraphQL query.
 * @param {*} resTrasformer  - Callback function to transform the response of the axios request.
 * @returns {Promise<AxiosResponse<any>>} Axios response tranformed by the callback function.
 */
function _fetchGithubGQL(query, resTrasformer) {
  return new Promise((resolve, reject) => {
    axios.post(API_URL + '/graphql', { query: query }, { headers: { Authorization: 'Bearer ' + GITHUB_APIKEY, Accept: 'application/vnd.github.starfox-preview+json' } })
      .then(axiosResponse => {
        // console.log("Query sent: ", query)
        // console.log("Fetched response.data: ", JSON.stringify(axiosResponse.data, null, 2))
        const result = resTrasformer(axiosResponse)
        resolve(result)

      })
      .catch(err => reject(err));
  });
}