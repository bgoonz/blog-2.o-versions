const modelUtils = require('./model-utils');
const loadModels = require('./model-loader');
const extendModels = require('./model-extender');
const { getModelByQuery, getModelsByQuery } = require('./model-matcher');


module.exports = {
    loadModels,
    extendModels,
    getModelByQuery,
    getModelsByQuery,
    ...modelUtils
};
