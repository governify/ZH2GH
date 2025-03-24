# Request examples

When a webhook is set in zenhub, zenhub makes a post to our endpoint. Some examples are shown below.

## An issue is created in zenhub:
This will NOT do anything in our system, as we only listen to issue transfers to "Todo", "In Progress", "In Review" and "Done" columns.

req.body =
```json
{
  "type": "issue_reprioritized",
  "github_url": "https://github.com/gii-is-psg2/bluejay-psg2-23-24/issues/20",
  "organization": "gii-is-psg2",
  "repo": "bluejay-psg2-23-24",
  "user_name": "governifyauditor",
  "issue_number": "20",
  "issue_title": "tortilla de patatas con cebolla",
  "to_pipeline_name": "New Issues",
  "from_position": "11",
  "to_position": "0",
  "workspace_id": "XXXXXXXXXXXXXXXXXXXXXXXX",
  "workspace_name": "bluejay-psg2-23-24"
}
```

## An issue is created in Zenhub INSIDE the "Todo" pipeline (directly in the "Todo" column):

This will be detected because zenhub will send an issue_transfer event from "New Issues" to "Todo" (Even when the issue was not in "New Issues" before, but directly in "Todo")

req.body =
```json
{
  "type": "issue_transfer",
  "github_url": "https://github.com/gii-is-psg2/2425-TESTS-ZH2GH/issues/10",
  "organization": "gii-is-psg2",
  "repo": "2425-TESTS-ZH2GH",
  "user_name": "motero2k",
  "issue_number": "10",
  "issue_title": "fix: this one is created from todo in 18feb 20h30 gmt0",
  "to_pipeline_name": "Todo",
  "workspace_id": "XXXXXXXXXXXXXXXXXXXXXXXX",
  "workspace_name": "Untitled workspace test private",
  "from_pipeline_name": "New Issues"
  }
```


## An issue is moved from Todo to In Progress columns

req.body =
```json
{
  "type": "issue_transfer",
  "github_url": "https://github.com/gii-is-psg2/bluejay-psg2-23-24/issues/12",
  "organization": "gii-is-psg2",
  "repo": "bluejay-psg2-23-24",
  "user_name": "governifyauditor",
  "issue_number": "12",
  "issue_title": "macarron",
  "to_pipeline_name": "In Progress",
  "workspace_id": "XXXXXXXXXXXXXXXXXXXXXXXX",
  "workspace_name": "bluejay-psg2-23-24",
  "from_pipeline_name": "Todo"
}


```