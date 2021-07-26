const _ = require('lodash');
const micromatch = require('micromatch');
const {
    failFunctionWithTag,
    assertFunctionWithFail,
} = require('@stackbit/utils');
const { isSingleInstanceModel } = require('./model-utils');


const fail = failFunctionWithTag('model-matcher');
const assert = assertFunctionWithFail(fail);

module.exports = {
    getModelByQuery,
    getModelsByQuery
};

/**
 * Returns a single model matching the `query` describing a content file.
 * @see `getModelsByQuery()` for more info.
 *
 * @param {Object} query A query object to match a model against.
 * @param {string} query.filePath The path of the content file relative to the `pagesDir` or `dataDir` folders defined in stackbit.yaml.
 * @param {string} [query.type] The type of the data file. For example, can be page's layout that maps to page's model.
 * @param {Array|string} [query.modelTypeKeyPath] Used to compare the value of `query.type` with the value of a model at `modelTypeKeyPath`. Required if `query.type` is provided.
 * @param {Array.<Object>} models Array of stackbit.yaml `models`.
 * @return {Object} stackbit.yaml model matching the `query`.
 */
function getModelByQuery(query, models) {
    const matchedModels = getModelsByQuery(query, models);
    const filePath = _.get(query, 'filePath');
    if (matchedModels.length === 0) {
        fail(`file '${filePath}' does not match any model`);
    } else if (matchedModels.length > 1) {
        fail(`file '${filePath}' matches several models '${_.map(matchedModels, 'name').join(', ')}'`);
    }
    return _.head(matchedModels);
}

/**
 * Returns an array of models matching the `query` describing a content file.
 *
 * The `query` object is required to have the `filePath` property which is the path
 * of the content file relative to the `pagesDir` or `dataDir` folders defined
 * in stackbit.yaml.
 *
 * The `query` object might also contain the `type` and `modelTypeKeyPath`
 * properties. When these properties provided, the value of the `type` is
 * compared against the value of a model located at the path specified by
 * `modelTypeKeyPath`. This is useful, when a folder might contain objects of
 * different model types.
 *
 * @param {Object} query A query object to match models against.
 * @param {string} query.filePath The path of the content file relative to the `pagesDir` or `dataDir` folders defined in stackbit.yaml.
 * @param {string} [query.type] The type of the data file. For example, can be page's layout that maps to page's model.
 * @param {Array|string} [query.modelTypeKeyPath] Used to compare the value of `query.type` with the value of a model at `modelTypeKeyPath`. Required if `query.type` is provided.
 * @param {Array.<Object>} models Array of stackbit.yaml `models`.
 * @return {Array.<Object>} Array of stackbit.yaml models matching the `query`.
 */
function getModelsByQuery(query, models) {
    const singleInstancePageFiles = _.chain(models)
        .filter(model => isSingleInstanceModel(model))
        .map('file')
        .value();

    const filePath = _.get(query, 'filePath');
    const objectType = _.get(query, 'type');
    const modelTypeKeyPath = _.get(query, 'modelTypeKeyPath');

    return _.filter(models, model => {
        if (_.has(model, 'singleInstance') && !_.has(model, 'file')) {
            fail(`'${model.name}' is singleInstance but no file was specified`);
        }
        if (_.has(model, 'file')) {
            return micromatch.isMatch(filePath, model.file);
        }
        if (objectType && _.has(model, modelTypeKeyPath)) {
            const modelType = _.get(model, modelTypeKeyPath);
            return objectType === modelType;
        }
        const folder = _.get(model, 'folder', '');
        let match = _.get(model, 'match', '**/*');
        let exclude = _.get(model, 'exclude', []);
        match = joinPathAndGlob(folder, match);
        exclude = joinPathAndGlob(folder, exclude);
        exclude = _.concat(exclude, singleInstancePageFiles);
        return micromatch.isMatch(filePath, match) && (_.isEmpty(exclude) || !micromatch.isMatch(filePath, exclude));

    });
}

function joinPathAndGlob(pathStr, glob) {
    glob = globToArray(glob);
    return _.map(glob, (globPart) => _.compact([pathStr, globPart]).join('/'));
}

function globToArray(glob) {
    return _.chain(glob).castArray().compact().reduce((accum, globPart) => {
        const globParts = _.chain(globPart).trim('{}').split(',').compact().value();
        return _.concat(accum, globParts)
    }, []).value();
}
