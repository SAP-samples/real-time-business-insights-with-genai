const cds = require('@sap/cds');
const express = require('express');
const boDetailsController = require('./utils/boDetailsController');
const boConfigsTransformer = require('./utils/boConfigsTransformer');

const _constructService = async () => {
  const serviceDefinition = await boConfigsTransformer.transform();
  // console.log("🚀 ~ constructService ~ serviceDefinition:\n", serviceDefinition)
  return rawServiceDefinition = { 'srv/bo-details.cds': serviceDefinition };
};

const _deployService = async (app, db, rawServiceDefinition) => {
  const serviceCsn = cds.compile(rawServiceDefinition)
  await cds.serve('all').from(serviceCsn).in(app)

  let ddl = cds.compile(serviceCsn).to.sql({ dialect: 'sqlite' })
  await db.run(ddl)

  return serviceCsn
};

const _updateModelDefinitions = (serviceCsn) => {
  for (const each in serviceCsn.definitions) {
    if (!cds.model.definitions[each]) {
      Object.assign(cds.model.definitions, { [each]: serviceCsn.definitions[each] })
    }
  }
};

const _registerReadEntityHandler = (services, serviceCsn) => {
  let serviceElements = Object.keys(serviceCsn.definitions);
  for (let serviceElement of serviceElements) {
    if (serviceCsn.definitions[serviceElement].kind == 'entity') {
      let serviceName = serviceElement.split('.')[0];
      let serviceImplementation = services[serviceName];
      serviceImplementation.prepend(() => {
        serviceImplementation.on("READ", serviceElement, boDetailsController.handleReadBODetails);
        serviceImplementation.on("summarize", boDetailsController.handleGenerateBOSummary);
        serviceImplementation.on("summaryFeedback", boDetailsController.handleFeedback);
      })
    };
  }
}

// hook into bootstrap process before services get started
module.exports = async (o) => {
  o.app = express()
  let db = await cds.connect('db');
  const serviceCds = await _constructService();
  const serviceCsn = await _deployService(o.app, db, serviceCds)

  cds.once('served', async (services) => {

    // Adding model to the definitions
    _updateModelDefinitions(serviceCsn);

    // Adding custom handler for entities of dynamically served services
    _registerReadEntityHandler(services, serviceCsn);

  });

  return cds.server(o);

}