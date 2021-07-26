const _ = require('lodash');

const FIELD_TYPES = [
    'string',
    'url',
    'slug',
    'text',
    'markdown',
    'html',
    'number',
    'boolean',
    'enum',
    'select', // left for backward compatibility, use 'enum'
    'date',
    'datetime',
    'color',
    'image',
    'file',
    'json',
    'object',
    'model',
    'reference',
    'list',
    'array' // left for backward compatibility, use 'list'
];

module.exports = {
    FIELD_TYPES,
    isObjectField,
    isModelField,
    isReferenceField,
    isCustomModelField,
    isListField,
    isListOfObjectsField,
    isListOfModelField,
    isListOfReferenceField,
    isListOfCustomModelField,
    getListItemsField,
    isSingleInstanceModel,
    resolveLabelFieldForModel,
    iterateModelFieldsRecursively,
    iterateObjectFieldsWithModelRecursively,
    mapObjectFieldsWithModelRecursively
}

function isObjectField(field) {
    return field.type === 'object';
}

function isModelField(field) {
    return field.type === 'model';
}

function isReferenceField(field) {
    return field.type === 'reference';
}

function isCustomModelField(field, modelsByName) {
    return !FIELD_TYPES.includes(field.type) && (!modelsByName || _.has(modelsByName, field.type));
}

function isListField(field) {
    return ['list', 'array'].includes(field.type);
}

function isListOfObjectsField(field) {
    return isListField(field) && isObjectField(getListItemsField(field));
}

function isListOfModelField(field) {
    return isListField(field) && isModelField(getListItemsField(field));
}

function isListOfReferenceField(field) {
    return isListField(field) && isReferenceField(getListItemsField(field));
}

function isListOfCustomModelField(field, modelsByName) {
    return isListField(field) && isCustomModelField(getListItemsField(field), modelsByName);
}

/**
 * Gets a list field and returns its items field. If list field does not define
 * items field, the default field is string:
 *
 * @example
 * listItemField = getListItemsField({
 *   type: 'list',
 *   name: '...',
 *   items: { type: 'object', fields: [] }
 * }
 * listItemField => {
 *   type: 'object',
 *   name: '...',
 *   fields: []
 * }
 *
 * // list field without `items`
 * listItemField = getListItemsField({ type: 'list', name: '...' }
 * listItemField => { type: 'string' }
 *
 * @param {Object} field
 * @return {Object}
 */
function getListItemsField(field) {
    // items.type defaults to string
    return _.defaults(_.get(field, 'items', {}), {type: 'string'});
}

function isSingleInstanceModel(model) {
    if (model.type === 'config') {
        return true;
    } else if (model.type === 'data') {
        return _.has(model, 'file');
    } else if (model.type === 'page') {
        return _.has(model, 'file') || _.get(model, 'singleInstance', false);
    }
    return false;
}

function resolveLabelFieldForModel(model) {
    const fields = _.get(model, 'fields');
    let labelField = _.get(model, 'labelField', null);
    if (!labelField) {
        // see if there is a field named 'title'
        let titleField = _.find(fields, field => field.name === 'title' && ['string', 'text'].includes(field.type));
        if (!titleField) {
            // see if there is a field named 'label'
            titleField = _.find(fields, field => field.name === 'label' && ['string', 'text'].includes(field.type));
        }
        if (!titleField) {
            // get the first 'string' field
            titleField = _.find(fields, {type: 'string'});
        }
        if (titleField) {
            labelField = _.get(titleField, 'name');
        }
    }
    if (!labelField) {
        return null;
    }
    return labelField;
}

/**
 * This function invokes the `iterator` function for every field of the `model`.
 * It recursively traverses through fields of type `object` and `list` with
 * items of type `object` and invokes the `iterator` on their child fields,
 * and so on. The traversal is a depth-first and the `iterator` is invoked
 * before traversing the field's child fields.
 *
 * The iterator is invoked with two parameters, `field` and `fieldPath`. The
 * `field` is the currently iterated field, and `fieldPath` is an array of
 * strings indicating the path of the `field` relative to the model.
 *
 * @example
 * model = {
 *   fields: [
 *     { name: "title", type: "string" },
 *     {
 *       name: "banner",
 *       type: "object",
 *       fields: [
 *         { name: "logo", type: "image" }
 *     ]}
 *     {
 *       name: "actions",
 *       type: "list",
 *       items: {
 *         type: "object",
 *         fields: [
 *           {name: "label", type: "string"}
 *         ]
 *       }
 *     }
 *   ]
 * }
 * iterateModelFieldsRecursively(model, iterator);
 * // will call the iterator with following field.name and fieldPath
 * - 'title', ['fields', 'title']
 * - 'banner', ['fields', 'banner']
 * - 'logo', ['fields', 'banner', 'fields', 'logo']
 * - 'actions', ['fields', 'actions']
 * - 'label', ['fields', 'actions', 'items', 'fields', 'label']
 *
 * @param {Object} model The root model to iterate fields
 * @param {Function} iterator The iterator function
 * @param {Array} [fieldPath]
 */
function iterateModelFieldsRecursively(model, iterator, fieldPath = []) {
    const fields = _.get(model, 'fields', []);
    fieldPath = fieldPath.concat('fields');
    _.forEach(fields, (field) => {
        const childFieldPath = fieldPath.concat(field.name);
        iterator(field, childFieldPath);
        if (isObjectField(field)) {
            iterateModelFieldsRecursively(field, iterator, childFieldPath);
        } else if (isListOfObjectsField(field)) {
            iterateModelFieldsRecursively(getListItemsField(field), iterator, childFieldPath.concat('items'));
        }
    });
}

function iterateObjectFieldsWithModelRecursively(value, model, modelsByName, iteratee, { objectTypeKey = 'type', _valueKeyPath, _modelKeyPath, _objectStack }) {
    _valueKeyPath = _valueKeyPath || [];
    _modelKeyPath = _modelKeyPath || [model.name];
    _objectStack = _objectStack || [];

    if (model && model.type === 'model') {
        model = getModelOfObject(value, model, modelsByName, objectTypeKey, _valueKeyPath, _modelKeyPath);
        _modelKeyPath = [model.name];
    }

    iteratee(value, model, _valueKeyPath, _modelKeyPath, _objectStack);

    if (_.isPlainObject(value)) {
        const fields = _.get(model, 'fields', []);
        const fieldsByName = _.keyBy(fields, 'name');
        _modelKeyPath = _.concat(_modelKeyPath, 'fields');
        _.forEach(value, (val, key) => {
            const childValueKeyPath = _.concat(_valueKeyPath, key);
            const field = _.get(fieldsByName, key, null);
            // there might be fields not defined in model, like layout and type
            // if (!field) {
            //     throw new Error(`object property is not defined in model, field path: ${childValueKeyPath.join('.')}, modemodel path{_modelKeyPath.join('.')}`)
            // }
            iterateObjectFieldsWithModelRecursively(val, field, modelsByName, iteratee, {
                objectTypeKey,
                _valueKeyPath: childValueKeyPath,
                _modelKeyPath: _.concat(_modelKeyPath, key),
                _objectStack: _.concat(_objectStack, value)
            });
        });
    } else if (_.isArray(value)) {
        if (!isListField(model)) {
            throw new Error(`the field type of an array value must be 'list', field type: ${model.type}, field path: ${_valueKeyPath.join('.')}, model path: ${_modelKeyPath.join('.')}`)
        }
        const itemsModel = getListItemsField(model);
        _.forEach(value, (val, idx) => {
            iterateObjectFieldsWithModelRecursively(val, itemsModel, modelsByName, iteratee, {
                objectTypeKey,
                _valueKeyPath: _.concat(_valueKeyPath, idx),
                _modelKeyPath: _.concat(_modelKeyPath, 'items'),
                _objectStack: _.concat(_objectStack, value)
            });
        });
    }
}

function mapObjectFieldsWithModelRecursively(value, model, modelsByName, iteratee, { objectTypeKey = 'type', _valueKeyPath, _modelKeyPath, _objectStack } = {}) {
    _valueKeyPath = _valueKeyPath || [];
    _modelKeyPath = _modelKeyPath || [model.name];
    _objectStack = _objectStack || [];

    if (model && model.type === 'model') {
        model = getModelOfObject(value, model, modelsByName, objectTypeKey, _valueKeyPath, _modelKeyPath);
        _modelKeyPath = [model.name];
    }

    const res = iteratee(value, model, _valueKeyPath, _modelKeyPath, _objectStack);
    if (!_.isUndefined(res)) {
        value = res;
    }

    if (_.isPlainObject(value)) {
        const fields = _.get(model, 'fields', []);
        const fieldsByName = _.keyBy(fields, 'name');
        _modelKeyPath = _.concat(_modelKeyPath, 'fields');
        value = _.mapValues(value, (val, key) => {
            const childValueKeyPath = _.concat(_valueKeyPath, key);
            const field = _.get(fieldsByName, key, null);
            // there might be fields not defined in model, like layout and type
            // if (!field) {
            //     throw new Error(`object property is not defined in model, field path: ${childValueKeyPath.join('.')}, model path: ${_modelKeyPath.join('.')}`);
            // }
            return mapObjectFieldsWithModelRecursively(val, field, modelsByName, iteratee, {
                objectTypeKey,
                _valueKeyPath: childValueKeyPath,
                _modelKeyPath: _.concat(_modelKeyPath, key),
                _objectStack: _.concat(_objectStack, value)
            });
        });
    } else if (_.isArray(value)) {
        if (!isListField(model)) {
            throw new Error(`field type of an array value must be 'list', field type: ${model.type}, field path: ${_valueKeyPath.join('.')}, model path: ${_modelKeyPath.join('.')}`);
        }
        const itemsModel = getListItemsField(model);
        value = _.map(value, (val, idx) => {
            return mapObjectFieldsWithModelRecursively(val, itemsModel, modelsByName, iteratee, {
                objectTypeKey,
                _valueKeyPath: _.concat(_valueKeyPath, idx),
                _modelKeyPath: _.concat(_modelKeyPath, 'items'),
                _objectStack: _.concat(_objectStack, value)
            });
        });
    }

    return value;
}

function getModelOfObject(object, field, modelsByName, objectTypeKey, valueKeyPath, modelKeyPath) {
    const modelNames = _.get(field, 'models', []);
    let modelName;
    if (modelNames.length === 1) {
        modelName = modelNames[0];
        if (!_.has(modelsByName, modelName)) {
            throw new Error(`values of the 'models' array of the 'model' field must be the names of existing models, field path: ${valueKeyPath.join('.')}, model path: ${modelKeyPath.join('.')}`);
        }
    } else {
        if (!_.has(object, objectTypeKey)) {
            throw new Error(`object referenced by field of type 'model' with multiple 'models' must define the '${objectTypeKey}' property with the name of the object's model, field path: ${valueKeyPath.join('.')}, model path: ${modelKeyPath.join('.')}`);
        }
        modelName = object[objectTypeKey];
        if (!_.has(modelsByName, modelName)) {
            throw new Error(`the value of the '${objectTypeKey}' property of an object referenced by field of type 'model' must be a name of an existing model, type value: ${modelName}, field path: ${valueKeyPath.join('.')}, model path: ${modelKeyPath.join('.')}`);
        }
    }
    return modelsByName[modelName];
}
