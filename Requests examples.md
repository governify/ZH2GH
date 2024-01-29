# Request examples

When a webhook is set in zenhub, zenhub makes a post to our endpoint. Some examples are shown below.

## An issue is created in zenhub:
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
  "workspace_id": "65072b678bd31342e65e5373",
  "workspace_name": "bluejay-psg2-23-24"
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
  "workspace_id": "65072b678bd31342e65e5373",
  "workspace_name": "bluejay-psg2-23-24",
  "from_pipeline_name": "Todo"
}
```