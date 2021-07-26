# Stackbit Schema

Stackbit schema tools

## Install

```bash
npm install @stackbit/schema
```

## Utility Functions


### `loadModels(models)`

Takes raw `models` map as defined by stackbit.yaml format and returns an array of sanitized models.

```yaml
# part of stackbit.yaml

models:
  post:
    type: page
    layout: post
    folder: blog
    fields:
      - type: string
        name: title
        label: Title
        required: true
      # ...fields
  person:
    type: data
    label: Person
    folder: authors
    fields:
      # ...fields
```

```js
const stackbitYaml = await parseFile('path/to/stackbit.yaml');
const models = loadModels(stackbitYaml.models);
```

The returned `models` is a sanitized array of models:
```js
[
  {
    "name": "post",
    "type": "page",
    "label": "Post",
    "fieldLabel": "title",
    "layout": "post",
    "folder": "blog",
    "fields": [ /* fields */ ]
  },
  {
    "name": "person",
    "type": "data",
    "label": "Person",
    "folder": "authors",
    "fields": [ /* fields */ ]
  }
]
```

### `getModelByQuery(query, models)`

Takes a query object representing a loaded content file and `models` array returned by `loadModels()`
and returns a model matching the query.

```js
const model = getModelByQuery({ filePath: 'authors/john-doe.json' }, models);
// model => model for "person" type
```
