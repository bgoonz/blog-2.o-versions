const _ = require('lodash');

const {
    failFunctionWithTag,
    assertFunctionWithFail,
    rename
} = require('@stackbit/utils');

const {
    isModelField,
    isReferenceField,
    isCustomModelField,
    isListField,
    isListOfModelField,
    isListOfReferenceField,
    isListOfCustomModelField,
    iterateModelFieldsRecursively
} = require('./model-utils');


const extendModels = require('./model-extender');


const fail = failFunctionWithTag('model-loader');
const assert = assertFunctionWithFail(fail);

module.exports = function loadModels(modelMap) {
    modelMap = _.cloneDeep(modelMap);
    let models = _.map(modelMap, (model, modelName) => {
        model.name = modelName;
        return model;
    });
    models = extendModels(models);
    _.forEach(models, model => {
        renameTemplateToLayout(model);

        iterateModelFieldsRecursively(model, (field, fieldPath) => {
            fieldPath = _.concat(model.name, fieldPath);

            // add field label if label is not set but name is set
            // 'name' can be unset for nested 'object' fields or list items fields
            if (!_.has(field, 'label') && _.has(field, 'name')) {
                field.label = _.startCase(field.name);
            }

            if (isCustomModelField(field, modelMap)) {
                console.warn(`using model name as field type is deprecated, use 'model' type with array of models, model name: ${field.type}, location: ${fieldPath.join('.')}`);
                field.models = [field.type];
                field.type = 'model';
            } else if (isListOfCustomModelField(field, modelMap)) {
                console.warn(`using model name as field type is deprecated, use 'model' type with array of models, model name: ${field.items.type}, location: ${_.concat(fieldPath, 'items').join('.')}`);
                field.items.models = [field.items.type];
                field.items.type = 'model';
            } else if (isListField(field) && !_.has(field, 'items.type')) {
                _.set(field, 'items.type', 'string');
            }

            // do some basic validation of 'model' and 'reference' field types
            if (isModelField(field) || isReferenceField(field)) {
                assertFieldModels(field, modelMap, fieldPath);
            } else if (isListOfModelField(field) || isListOfReferenceField(field)) {
                assertFieldModels(field.items, modelMap, _.concat(fieldPath, 'items'));
            }
        });
    });
    models = removeUnusedModels(models);
    return models;
}

/**
 * Validates that the 'models' property of the 'model' and 'reference' field is
 * an array, and all its values are the names of existing models.
 *
 * @param {Object} field A field of type 'model' or 'reference'
 * @param {Object} modelsByName Map of models by their names
 * @param {Array} fieldPath The key path of the field inside a model
 */
function assertFieldModels(field, modelsByName, fieldPath) {
    assert(_.isArray(field.models), `the 'models' property of a '${field.type}' field must be an array of existing model names, location: ${fieldPath.join('.')}`);
    _.forEach(field.models, modelName => {
        assert(_.has(modelsByName, modelName), `the 'models' property of a '${field.type}' field must reference existing model name, value: ${modelName}, location: ${fieldPath.join('.')}`);
    });
}

function renameTemplateToLayout(model) {
    if (_.get(model, 'type') === 'page') {
        rename(model, 'template', 'layout');
    }
}

function removeUnusedModels(models) {
    let usedModelNames = [];
    const iterator = (field) => {
        let modelNames = [];
        if (isModelField(field)) {
            modelNames = _.get(field, 'models', []);
        } else if (isListOfModelField(field)) {
            modelNames = _.get(field, 'items.models', []);
        }
        usedModelNames = _.concat(usedModelNames, modelNames)
    };
    _.forEach(models, (model) => {
        iterateModelFieldsRecursively(model, iterator);
    });
    // include only models of type "object" that have been referenced by "model" fields
    return _.filter(models, model => model.type !== 'object' || _.includes(usedModelNames, model.name));
}
