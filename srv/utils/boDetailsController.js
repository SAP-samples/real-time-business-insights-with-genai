
const core = require('@sap-cloud-sdk/http-client');
const https = require('https');
const boConfigsTransformer = require('./boConfigsTransformer');
const summaizationController = require('./summary/utilSummarizationController');
const querySymbol = '?';
const generateSummary = require('./summary/utilGenerateSummary');
const cds = require('@sap/cds');

const _getBOConfig = async (boEntityName) => {
  let boConfigs = await boConfigsTransformer.getParsedBOConfigs(), targetConfig;
  for (let i = 0; i < boConfigs.length; i++) {
    if (boConfigs[i].ObjectName == boEntityName) {
      targetConfig = boConfigs[i];
    } else {
      if (boConfigs[i].expand != undefined && boConfigs[i].expand.length > 0) {
        boConfigs[i].expand.forEach(config => {
          let expandKey = Object.keys(config)[0];
          if (config[expandKey].ObjectName == boEntityName) {
            targetConfig = config[expandKey];
            targetConfig.destinationName = boConfigs[i].destinationName;
            targetConfig.getUrl = boConfigs[i].getUrl;
          }
        });
      }
    }
    if (targetConfig != undefined) { break; }
  }
  // let targetConfig = boConfigs.filter(config => config.ObjectName == boEntityName)[0];
  return targetConfig;
}

const _getNavigations = (boConfig, parentNavigation) => {
  let navigations = [], childNavigations = [];
  boConfig.expand?.forEach(config => {
    let expandKey = Object.keys(config)[0];
    if (config[expandKey].hasOwnProperty('expand')) childNavigations = _getNavigations(config[expandKey], expandKey);
    parentNavigation == undefined ? navigations.push(expandKey) : navigations.push(parentNavigation + '/' + expandKey);
    navigations = [...navigations, ...childNavigations];
  });
  return navigations;
}

//[TODO] Response parse is done for 2 levels only. 
//[TODO] (needs to be done recursively)
const _parseResponse = (response, navigationPaths) => {
  if (response.data.value == undefined) {
    apiResponse = response.data.d.results;
    navigationPaths.forEach(navpath => {
      if (navpath.includes('/')) {
        let parentNavPath = navpath.split('/')[0];
        navpath = navpath.split('/')[1];
        apiResponse.forEach(result => {
          if (result.hasOwnProperty(parentNavPath) && result[parentNavPath].hasOwnProperty('results')) {
            result[parentNavPath] = result[parentNavPath]['results'];
          }
          result[parentNavPath].forEach(child => {
            if (child.hasOwnProperty(navpath) && child[navpath].hasOwnProperty('results')) {
              child[navpath] = child[navpath]['results'];
            }
          })
        })
      } else {
        apiResponse.forEach(result => {
          if (result[navpath] && result[navpath].results) {
            result[navpath].results.forEach(data => {
              for (const key in data) {
                if (!key.startsWith('__') && !(typeof data[key] === 'object' && data[key] !== null && '__deferred' in data[key])) {
                  result[key] = data[key];
                }
              }
            });
          }
        });
      }
    })
  } else {
    apiResponse = response.data.value;
  }
  // Date parsing for all date fields
  apiResponse.forEach(result => {
    for (const key in result) {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        if (typeof result[key] === 'string' && result[key].match(/^\/Date\(\d+\)\/$/)) {
          // Parse date
          result[key] = (new Date(parseInt(result[key].slice(6, 19)))).toISOString().slice(0, 10);
        }
      }
    }
  });

  apiResponse['$count'] = apiResponse.length;
  return apiResponse;
}

const _getBOResponse = async (targetName, targetBOConfig, objectKey, objectId, includeSummary, filterString) => {
  try {
    // let targetBOConfig    = await _getBOConfig(targetName.split('.')[1]);
    let targetNavigations = _getNavigations(targetBOConfig);
    let targetAPIConfig = await _prepareAPIRequest(targetBOConfig, targetNavigations, objectKey, objectId, filterString);
    let targetAPIResponse = await core.executeHttpRequest(targetAPIConfig.destConfig, targetAPIConfig.requestConfig, targetAPIConfig.tokenConfig);
    let boResponse = _parseResponse(targetAPIResponse, targetNavigations);
    if (objectId != undefined && includeSummary) {
      let existingSummary = await summaizationController.checkSummaryExists(`${targetBOConfig.ObjectName}-${objectId}`);
      boResponse[0].summarization = existingSummary.history;
      boResponse[0].modifiedAt = existingSummary.modifiedAt;
    }

    return boResponse;
  } catch (error) {
  }
}

const _prepareAPIRequest = async (targetBOConfig, navigations, objectKey, objectId, filterString) => {

  const expandPath = (navigations.length > 0) ? '&$expand=' + navigations.join(',') : '';
  const selectPath = '$select=' + [...Object.keys(targetBOConfig.listFields), ...navigations].join(',');
  const entityPath = '/' + targetBOConfig.ObjectName;
  const destConfig = { destinationName: targetBOConfig.destinationName };
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const tokenConfig = { fetchCsrfToken: false };
  let filterPath = objectId != undefined ? `&$filter=${objectKey} eq '${objectId}'` : (filterString != undefined) ? `&$filter=${filterString}` : '';
  let requestConfig = { method: 'GET', url: targetBOConfig.getUrl + entityPath + querySymbol + selectPath + expandPath + filterPath, httpsAgent: httpsAgent };

  return { requestConfig, destConfig, tokenConfig };
}

const collectSummaryFields = (response, config, summaryResponse) => {
  response.forEach(item => {
    // Collect fields to be summarized at the current level
    if (config.listFields) {
      Object.entries(config.listFields).forEach(([field, fieldConfig]) => {
        if (fieldConfig.isSummarize && item[field] != null) {
          summaryResponse.push({ field: field, value: item[field] });
        }
      });
    }

    // Recursively collect summary fields from expanded entities
    if (config.expand) {
      config.expand.forEach(expandConfig => {
        let expandKey = Object.keys(expandConfig)[0];
        let expandData = item[expandKey];
        if (expandData['results'] != undefined) expandData = expandData.results;
        if (expandData) {
          if (Array.isArray(expandData)) {
            expandData.forEach(subItem => {
              collectSummaryFields([subItem], expandConfig[expandKey], summaryResponse);
            });
          } else if (typeof expandData === 'object') {
            collectSummaryFields([expandData], expandConfig[expandKey], summaryResponse);
          }
        }
      });
    }
  });
};

// Variable sharing between handleFeedback and handleGenerateSummary
let summary

const handleFeedback = async (req) => {
  boSummaryType = summary.configParams.type
  let boConfig = JSON.parse(req.data.config)
  try {
    let boName = boConfig.boName
    let boID = boConfig.boID
    let buttonID = boConfig.buttonID
    const like = buttonID === 'idBtnLike';

    const { SummaryFeedback } = cds.services.BOSummaryService.entities;
    let BOSummaryService = await cds.connect.to('BOSummaryService');
    response = await BOSummaryService.run(INSERT.into(SummaryFeedback).entries({ 
      boId: boID, 
      boName: boName, 
      prompt: parseInt(summary.configParams.promptIndex) + 1 || '', 
      summaryType: boSummaryType, 
      like: like
    }));
  } catch (error) {
    throw error;
  }
  console.log("Feedback handled")
}

const handleReadBODetails = async (req) => {
  let targetName = req.target.name;
  let targetBOConfig = await _getBOConfig(targetName.split('.')[1]);
  let objectKey = req.params[0] != undefined ? Object.keys(req.params[0])[0] : undefined;
  let objectId = req.params[0] != undefined ? Object.values(req.params[0])[0] : undefined;
  let filterString = req._queryOptions['$filter']
  let includeSummary = req._query['$select']?.includes('summarization');
  return await _getBOResponse(targetName, targetBOConfig, objectKey, objectId, includeSummary, filterString);
}

const handleGenerateBOSummary = async (req) => {

  let oSummarizationConfig = JSON.parse(req.data.config);

  let targetName = req.target.name, depResponse = "", depBOConfig, depTargetName;
  let targetBOConfig = await _getBOConfig(targetName.split('.')[1]);
  let objectKey = req.params[0] != undefined ? Object.keys(req.params[0])[0] : undefined;
  let objectId = req.params[0] != undefined ? Object.values(req.params[0])[0] : undefined;
  let response = await _getBOResponse(targetName, targetBOConfig, objectKey, objectId, false);

  let summaryTypes = ['map_reduce', 'refine']
  const randomIndex = Math.floor(Math.random() * summaryTypes.length);
  const summarizationType = summaryTypes[randomIndex];

  // Collect fields to summarize
  let summaryResponse = [];
  collectSummaryFields(response, targetBOConfig, summaryResponse);

  // Handle dependent object
  if (targetBOConfig.dependentObject != undefined) {
    depBOConfig = await _getBOConfig(targetBOConfig.dependentObject);
    depTargetName = `BODetailsService.${targetBOConfig.dependentObject}`;
    depResponse = await _getBOResponse(depTargetName, depBOConfig, objectKey, objectId, false);
    collectSummaryFields(depResponse, depBOConfig, summaryResponse);
  }

  const { BusinessObjectSummarizations } = cds.services.BOSummaryService.entities;

  // Format summaryResponse to the specified format
  let formattedSummaryResponse = summaryResponse.map(entry => ({ pageContent: entry.value }));

  if (cds.env.requires.SUMMARIZATION_CONFIG.ENABLE_FEEDBACK == 'true') {
    summary = await generateSummary.summarize(formattedSummaryResponse, summarizationType, oSummarizationConfig);
    
    console.log(summary);
  }
  else {
    summary = await generateSummary.summarize(formattedSummaryResponse, targetBOConfig.summaryType, oSummarizationConfig);
    console.log(summary);
  }
  try {
    let boId = `${targetName.split('.')[1]}-${objectId}`, response;
    let BOSummaryService = await cds.connect.to('BOSummaryService');

    let existingSummaryID = await BOSummaryService.run(SELECT.one.from(BusinessObjectSummarizations).where({ boId: boId }).columns('ID'));
    if (existingSummaryID == undefined) {
      response = await BOSummaryService.run(INSERT.into(BusinessObjectSummarizations).entries({ boId: boId, history: summary.textSummary.text }));
    } else {
      response = await BOSummaryService.run(UPDATE.entity(BusinessObjectSummarizations).set({ history: summary.textSummary.text }).where({ boId: boId }));
    }
  } catch (error) {
    throw error;
  }
};


module.exports = { handleReadBODetails, handleGenerateBOSummary, handleFeedback }