const fs = require('fs').promises;
const path = require('path');
const cds = require('@sap/cds');
const log = cds.log('transform');

// Define Constants
const beginBracket = ' {', endBracket = '}', endSeparator = ';', newLine = '\n', fieldTypeSeparator = ' : ', skipPersistence = '@cds.persistence.skip \n', comma = ',' , singleQuote = "'", deletableCapability = '@Capabilities.Deletable: false', searchCapability = '@Capabilities.SearchRestrictions.Searchable: false';
const serviceContainer = 'service BODetailsService ', entityContainer = 'entity ', keyContainer = 'key ', service = 'BODetailsService';
const startSqBracket = '[', endSqBracket = ']'
const uiSelectionContainer = 'annotate BODetailsService.', annotateStart = ' with @( ', annotateEnd = ');', annotate = '@';
const listItemContainer = 'UI.LineItem: ', uiFacetsContainer = 'UI.Facets: ', objectlistItemContainer = 'UI.LineItem', uiHeaderInfo = 'UI.HeaderInfo: ';
const uiType = '$Type : ', uiLabel = 'Label  :  ', uiValue = 'Value : ', target = 'Target : ', uiID = 'ID : ', uiTarget = 'Target : ', uiTitle = 'Title :', uiTypeName = "TypeName :", uiTypeNamePlural = "TypeNamePlural: ", uiAction = 'Action : ';
const selectionContainer = 'UI.SelectionFields: ', fieldGroupContainer = 'UI.FieldGroup', generatedGroup1 = '#GeneratedGroup1', fieldData = 'Data: ', fieldGroupContainerType = 'UI.FieldGroupType', summary = '#HistoricalSummary', identificationContainer = 'UI.Identification: ';
const action= `actions{
  @(
          cds.odata.bindingparameter.name: '_it',
          Common.SideEffects             : {TargetProperties: ['_it/summarization', '_it/modifiedAt']}
  )
  action summarize(config: String);
  action summaryFeedback(config: String);
}`;

// Read BO Configs
const _readBOConfigs = async () => {
  const configPath = path.dirname(__dirname) + '/config/objectMappingConfig.json';
  // console.log("Config path" + configPath);
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    log.error('could not read business object configurations from path:' + configPath);
  }
}

// Validate BO Configs
const _validateBOConfigs = async (configsInJSON) => {
  // Check-1: key fields must be in list fields (to determine the type)
  // Check-2: type of fields must be correct
  // Check-3: one time call to api to check if fields exist in business object
  return true;
}

// Parse BO Configs : [TODO?]
const _parseBOConfigs = async (configsInJSON) => {
  return Object.entries(configsInJSON).pop()[1].BusinessObjects;
}
// Prepare entity fields[TODO?]
const __prepareEntityFields = (keyFields, listFields, dependentObject, expand, isListPageUI) => {
  const entityFields = Object.keys(listFields).map(fieldName => {
    return (keyFields.includes(fieldName) ? keyContainer : '') + fieldName + fieldTypeSeparator + listFields[fieldName]["type"] + endSeparator;
  });

  // Add list fields of expand entities
  if (expand && isListPageUI != true) {
    expand.forEach(expandEntity => {
      const expandEntityFields = Object.values(expandEntity)[0].listFields;
      Object.keys(expandEntityFields).forEach(fieldName => {
        entityFields.push(fieldName + fieldTypeSeparator + expandEntityFields[fieldName]["type"] + endSeparator);
      });
    });
  }

  if(isListPageUI == true){
    entityFields.push("summarization : String;")
    entityFields.push("modifiedAt: DateTime;")
  }
  if (dependentObject) {
    entityFields.push(`orders : Association to many ${dependentObject[1]} on orders.${keyFields} = ${keyFields};`)
  }

  return entityFields;
}


// Prepare entity
const __prepareEntity = (boConfig) => {
  let cdsEntityFields = [], expandResult, entityResult = [], cdsNavigations = '', dependentObject = [], deletable='';
  if(boConfig.isListPageUI == true){
    deletable = deletableCapability + newLine;

  }
  if (boConfig.hasOwnProperty('dependentObject')) {
    dependentObject.push(boConfig.ObjectName, boConfig.dependentObject)
    cdsEntityFields = __prepareEntityFields(boConfig.keyFields, boConfig.listFields, dependentObject, boConfig.expand, boConfig.isListPageUI);
  } else {
    cdsEntityFields = __prepareEntityFields(boConfig.keyFields, boConfig.listFields, null, boConfig.expand, boConfig.isListPageUI);
  }
  if (boConfig.hasOwnProperty('expand')) {
    expandResult = __prepareExpand(boConfig.expand, boConfig.keyFields, boConfig.listFields);
    entityResult = [...expandResult.cdsNavigationEntities];
    cdsNavigations = newLine + expandResult.cdsNavigations.join(newLine);
  }

  entityResult.push(deletable + searchCapability + skipPersistence + entityContainer + boConfig.ObjectName + beginBracket + cdsEntityFields.join(newLine) + cdsNavigations + endBracket + (boConfig.isListPageUI == true? action : '') + endSeparator);
  return entityResult;
}

// Prepare expands
const __prepareExpand = (boExpandConfigs, parentKeyFields, parentListFields) => {
  let expandResult = { cdsNavigations: [], cdsNavigationEntities: [] }, cdsChildEntities = [];
  boExpandConfigs.forEach(expandconfig => {
    let cdsNavInfo = Object.entries(expandconfig)[0];

    // Passing on Parent Key Fields to Child Entities
    expandconfig[cdsNavInfo[0]].keyFields = [...parentKeyFields, ...expandconfig[cdsNavInfo[0]].keyFields];
    parentKeyFields.forEach(keyfield => {
      expandconfig[cdsNavInfo[0]].listFields[keyfield] = parentListFields[keyfield];
    });

    // Preparing navigation to Child Entities
    let cdsNavigation = `${cdsNavInfo[0]}${fieldTypeSeparator}${cdsNavInfo[1].type} of many ${cdsNavInfo[1].ObjectName} on `;
    let cdsNavigationCond = [];
    parentKeyFields.forEach(key => { cdsNavigationCond.push(`${cdsNavInfo[0]}.${key} = ${key}`) })
    cdsNavigation = cdsNavigation + cdsNavigationCond.join(' and ') + endSeparator;
    expandResult.cdsNavigations.push(cdsNavigation);

    // Preparing Child Entities
    cdsChildEntities = __prepareEntity(expandconfig[cdsNavInfo[0]]);
    expandResult.cdsNavigationEntities = [...expandResult.cdsNavigationEntities, ...cdsChildEntities];
  });

  return expandResult;
}

// Prepare Service Definition
const _prepareServiceDefinition = async (parsedConfigInJSON) => {
  let cdsServiceEntities = [], cdsBOEntities = [];

  parsedConfigInJSON.forEach((bo) => {
    cdsBOEntities = __prepareEntity(bo);
    cdsServiceEntities = [...cdsServiceEntities, ...cdsBOEntities]
  });

  return serviceContainer + beginBracket + newLine + cdsServiceEntities.join(newLine + newLine) + newLine + endBracket;
}

//Print Selection Fields 
const _prepareSelectionFields = (config) => {
  let declareSelection = [selectionContainer + startSqBracket, config.searchFields.join(comma + newLine), endSqBracket];
  return declareSelection.join(' ' + newLine);
}


const _prepareLineItem = (label, value) => {
  if (!label || !value) return ''; // Return an empty string for invalid items
  let lineItemParts = [];
  lineItemParts.push(uiType + "'UI.DataField'");
  lineItemParts.push(uiLabel + singleQuote + label + singleQuote);
  lineItemParts.push(uiValue + value);
  if(value == 'summarization'){
    lineItemParts.push(`![@HTML5.CssDefaults]: {width: '100rem'}`);
  }
  return beginBracket + newLine + lineItemParts.join(comma+newLine) + newLine + endBracket;
}

const _prepareListItemFields = (itemcontainer, config) => {

  let expandLineItems = [];

  let lineItems = Object.keys(config.listFields).map(fieldName => {
    let listFieldData = config.listFields[fieldName];
    return _prepareLineItem(listFieldData.label, fieldName);
  }).filter(item => item); // Filter out undefined or empty items;

  if (config.hasOwnProperty('expand') && config.isListPageUI !=true){
    expandLineItems = __prepareListExpand(config, config.keyFields);
  }

  return  itemcontainer+ startSqBracket + newLine + lineItems.join(comma+newLine) +comma+ expandLineItems.join(comma + newLine) + newLine + endSqBracket;
}

const __prepareListExpand = (config, parentKeyFields) => {
  let expandResult = [];

  // Iterate over the expand array
  config.expand.forEach(expandItem => {
    // Get the first property of the expandItem object
    let expandKey = Object.keys(expandItem)[0];
    let expandConfig = expandItem[expandKey];

    // Iterate over the listFields of the expandConfig
    Object.entries(expandConfig.listFields).forEach(([field, fieldConfig]) => {
      // Check if the field has a label and is not a key field of the parent entity
      if (fieldConfig.label && !parentKeyFields.includes(field)) {
        // Prepare the line item and add it to the result
        let lineItem = _prepareLineItem(fieldConfig.label, field);
        expandResult.push(lineItem);
      }
    });
  });

  return expandResult;
}


const _prepareListAnnotationStructure = (parsedConfigsInJSON) => {
  let listAnnotationsForBOs = [], listAnnotationPerBo, listAnnotationParts = [];
  parsedConfigsInJSON.forEach((config) => {
    if(config.isListPageUI == true){
      listAnnotationParts = [_prepareSelectionFields(config), _prepareListItemFields(listItemContainer, config)]
      listAnnotationPerBo = uiSelectionContainer + config.ObjectName + annotateStart + newLine + listAnnotationParts.join(comma+newLine) + newLine +annotateEnd;
      listAnnotationsForBOs.push(listAnnotationPerBo);
    }
  })
  return listAnnotationsForBOs.join(newLine);
}

const _prepareUIFacetItem = (facetID, facetLabel, facetTarget) => {
  let lineItemParts = [];
  lineItemParts.push(uiType + "'UI.ReferenceFacet'");
  lineItemParts.push(uiLabel + facetID);
  lineItemParts.push(uiID + facetLabel);
  lineItemParts.push(uiTarget + facetTarget);
  return beginBracket + newLine + lineItemParts.join(comma+newLine) + newLine + endBracket;
}

const _prepareUIFacets = (config, dependentObjectConfig) => {
  let facetItems = [];
  
  facetItems.push(_prepareUIFacetItem("'General Information'", `'GFGeneral'`, annotate + fieldGroupContainer + `#GG${config.ObjectName}`));
  // facetItems.push(_prepareUIFacetItem("'Historical Summary'", "'HistoricalSummary'", annotate + fieldGroupContainer + summary));
  if(dependentObjectConfig != undefined){
    facetItems.push(_prepareUIFacetItem(singleQuote + dependentObjectConfig.ObjectNameLabel + singleQuote, singleQuote + dependentObjectConfig.ObjectName + singleQuote, singleQuote + 'orders/@' + objectlistItemContainer + "#" + dependentObjectConfig.ObjectName + singleQuote))
  } else if(config.isListPageUI == true && dependentObjectConfig == undefined) {
    facetItems.push(_prepareUIFacetItem(singleQuote + config.ObjectNameLabel + singleQuote, singleQuote + config.ObjectName + singleQuote, singleQuote + Object.keys(config.expand[0])[0] + '/@' + objectlistItemContainer + "#" + config.expand[0][Object.keys(config.expand[0])[0]].ObjectName + singleQuote))
  }
  let uiFacetFieldsAnnotation = uiFacetsContainer + startSqBracket + newLine + facetItems.join(comma + newLine) + newLine + endSqBracket
  return  uiFacetFieldsAnnotation
}

const _prepareHeaderAnnotation = (config) => {
  let headerItems = [];
  headerItems.push(uiType + "'UI.DataField'");
  headerItems.push(uiValue + singleQuote + config.ObjectNameLabel + singleQuote);
  headerItems.push(endBracket);
  headerItems.push(uiTypeName + singleQuote + config.ObjectNameLabel + singleQuote);
  headerItems.push(uiTypeNamePlural + singleQuote + config.ObjectNameLabel + singleQuote);
  let headerAnnotations = uiHeaderInfo + beginBracket + newLine + uiTitle + beginBracket + newLine + headerItems.join(comma+newLine) + newLine + endBracket;
  return headerAnnotations;
}

const _prepareObjectAnnotationStructure = (parsedConfigsInJSON) => {
  let objectAnnotationsForBOs = [], objectAnnotationPerBo, objectAnnotationParts = [];
  parsedConfigsInJSON.forEach((config) => {
    if(config.isListPageUI == true){
      let fieldGroupContainerAnnotation = fieldGroupContainer + `#GG${config.ObjectName}` + fieldTypeSeparator + beginBracket + newLine + uiType + singleQuote +fieldGroupContainerType + singleQuote + comma+ newLine + fieldData;
      objectAnnotationParts.push(_prepareListItemFields(fieldGroupContainerAnnotation, config) + endBracket);
      objectAnnotationParts.push(_prepareUIFacets(config, parsedConfigsInJSON.filter(boConfig=> boConfig.ObjectName == config.dependentObject)[0]));
      objectAnnotationParts.push(_prepareHeaderAnnotation(config));
      objectAnnotationPerBo = uiSelectionContainer + config.ObjectName + annotateStart + newLine + objectAnnotationParts.join(comma+newLine) + newLine +annotateEnd;
      objectAnnotationsForBOs.push(objectAnnotationPerBo);
      objectAnnotationParts.splice(0, objectAnnotationParts.length);
    }
  })
  return objectAnnotationsForBOs.join(newLine);

}

const _prepareSummarizeAnnotationStructure = (parsedConfigsInJSON) => {
  let summarizeAnnotationsForBOs = [], summarizeAnnotationPerBo, summarizeAnnotationParts = [];
  let summaryContainerAnnotation = fieldGroupContainer + summary + fieldTypeSeparator + beginBracket + newLine + uiType + singleQuote +fieldGroupContainerType + singleQuote + comma+ newLine + fieldData + startSqBracket;
  parsedConfigsInJSON.forEach((config) => {
    if(config.isListPageUI == true){
      summarizeAnnotationParts.push(_prepareLineItem("Historical Summary", "summarization"));
      summarizeAnnotationParts.push(endSqBracket+endBracket);
      summarizeAnnotationPerBo = uiSelectionContainer + config.ObjectName + annotateStart + newLine + summaryContainerAnnotation + summarizeAnnotationParts.join(comma+newLine) + newLine +annotateEnd;
      summarizeAnnotationsForBOs.push(summarizeAnnotationPerBo);
      summarizeAnnotationParts.splice(0, summarizeAnnotationParts.length);
    }
  })
  return summarizeAnnotationsForBOs.join(newLine);

}

const _prepareObjectTableAnnotationStructure = (parsedConfigsInJSON) => {
  let objectTableAnnotationsTableForBOs = [], objectTableAnnotationPerBo, objectTableAnnotationParts = [];
  parsedConfigsInJSON.forEach((config) => {
    objectTableAnnotationParts = [];
    if(config.isListPageUI == false){
      let objectTableLineItemAnnotation = objectlistItemContainer + "#" + config.ObjectName + fieldTypeSeparator + newLine;
      objectTableAnnotationParts.push(_prepareListItemFields(objectTableLineItemAnnotation, config));
      objectTableAnnotationPerBo = uiSelectionContainer + config.ObjectName + annotateStart + newLine + objectTableAnnotationParts.join(comma+newLine) + newLine +annotateEnd;
      objectTableAnnotationsTableForBOs.push(objectTableAnnotationPerBo);
    }
    if(config.isListPageUI == true && config.hasOwnProperty('expand') && config.expand.length > 0){
      config.expand.forEach(expandConfig => {
        expandConfig = expandConfig[Object.keys(expandConfig)[0]];
        let objectTableLineItemAnnotation = objectlistItemContainer + "#" + expandConfig.ObjectName + fieldTypeSeparator + newLine;
        objectTableAnnotationParts.push(_prepareListItemFields(objectTableLineItemAnnotation, expandConfig));
        objectTableAnnotationPerBo = uiSelectionContainer + expandConfig.ObjectName + annotateStart + newLine + objectTableAnnotationParts.join(comma+newLine) + newLine +annotateEnd;
        objectTableAnnotationsTableForBOs.push(objectTableAnnotationPerBo);
       })
    }
  })
  return objectTableAnnotationsTableForBOs.join(newLine);
}

const _generateUIAnnotations = async (parsedConfigsInJSON) => {
  let listPageAnnotations='', objectPageAnnotations='', objectPageSummarization ='', objectPageTableAnnotations = '';
  listPageAnnotations = _prepareListAnnotationStructure(parsedConfigsInJSON);
  objectPageAnnotations = _prepareObjectAnnotationStructure(parsedConfigsInJSON);
  objectPageSummarization = _prepareSummarizeAnnotationStructure(parsedConfigsInJSON);
  objectPageTableAnnotations = _prepareObjectTableAnnotationStructure(parsedConfigsInJSON);
  return [listPageAnnotations, objectPageAnnotations + objectPageSummarization + objectPageTableAnnotations].filter(annotation => annotation).join(newLine);
}


const transform = async () => {
  let boConfigsInJSON = await _readBOConfigs();
  if (boConfigsInJSON && _validateBOConfigs(boConfigsInJSON)) {
    let parsedConfigsInJSON = await _parseBOConfigs(boConfigsInJSON);
    let serviceInCDSString = await _prepareServiceDefinition(parsedConfigsInJSON);
    let uiAnnotationsInCDS = await _generateUIAnnotations(parsedConfigsInJSON);
    // const data = serviceInCDSString + newLine + uiAnnotationsInCDS;
    // await fs.writeFile('test.cds', data);
    return serviceInCDSString + newLine + uiAnnotationsInCDS;
  } else {
    log.error('business object configurations are not in required format!');
  }
}

transform()

const getParsedBOConfigs = async () => {
  return await _parseBOConfigs(await _readBOConfigs());
}

module.exports = { transform, getParsedBOConfigs };