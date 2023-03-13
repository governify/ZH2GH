import http from "http";
import express from "express";
import axios from "axios";
import bodyParser from 'body-parser'

const app = express()
const port = process.env.PORT || 8080

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));

http.createServer(app).listen(port, function () {
    console.log("\nApp running at http://localhost:" + port);
    console.log("________________________________________________________________");
});

const API_URL = 'https://api.github.com';
const GITHUB_APIKEY = process.env.GITHUB_APIKEY

/* ZenHub Data Example: 
    {
        "type": "issue_transfer",
        "github_url": "https://github.com/ZenHubIO/support/issues/618",
        "organization": "ZenHubHQ",
        "repo": "support",
        "user_name": "ZenHubIO",
        "issue_number": "618",
        "issue_title": "Zenhub Change Log",
        "to_pipeline_name": "New Issues",
        "workspace_id": "603fc3e575de63001cc163f9",
        "workspace_name": "My Workspace",
        "from_pipeline_name": "Discussion"
    }
*/

app.post('/', function (_req, _res) {
    if (_req.body.type !== "issue_transfer") _res.status(200).send("Received an event of type '" + _req.body.type + "', not an 'issue_transfer' event. Ignoring...")
    
    const urlSplit = _req.body.github_url.split("/")
    let owner = urlSplit[3]
    let repo = urlSplit[4]
    let issueNumber = urlSplit[6]

    getGithubProjectsV2OptionsId(owner, repo, issueNumber).then(res => {
        const projectsV2 = res.data?.data?.repository?.issue?.projectsV2?.nodes
        if (!projectsV2) _res.status(500).send(res.data)
        else if (projectsV2.length === 0) _res.status(500).send(`The issue with ID ${issueNumber} is not linked to any project.`)
        
        for (let project of projectsV2) {
            const pipelineField = project.fields.nodes[2]
            const projectId = project?.id
            const fieldId = pipelineField?.id
            const optionId = pipelineField.options.find(option => option.name === _req.body.to_pipeline_name)?.id
            const itemId = project.items.nodes.find(item => item.fieldValues.nodes.find(fieldValue => fieldValue.text === _req.body.issue_title))?.id
            
            updateGithubProjectsV2(projectId, itemId, fieldId, optionId).then(res => {
                if (res.data?.errors?.find(error => error?.type === "NOT_FOUND")) _res.status(404).send(res.data)
                else if (res.data?.errors) _res.status(500).send(res.data)
                else _res.status(200).send(res.data)
            }).catch(err => {
              console.log("Error: ", err)
              _res.status(500).send(err)
            })
        }
    }).catch(err => {
      console.log("Error: ", err)
      _res.status(500).send(err)
    })
})


function getGithubProjectsV2OptionsId(owner, repo, issueNumber) {
    return axios.post(API_URL + '/graphql', {
        query: `{
            repository(owner: "${owner}", name: "${repo}") {
              issue(number: ${issueNumber}) {
                number
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
    }, { headers: { Authorization: 'Bearer ' + GITHUB_APIKEY, Accept: 'application/vnd.github.starfox-preview+json' } })
}

function updateGithubProjectsV2(projectId, itemId, fieldId, optionId) {
    return axios.post(API_URL + '/graphql', {
        query: `mutation {
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
    }, { headers: { Authorization: 'Bearer ' + GITHUB_APIKEY, Accept: 'application/vnd.github.starfox-preview+json' } })
}