const fse = require('fs-extra');
const yaml = require('js-yaml');
const boConfigsTransformer = require('../srv/utils/boConfigsTransformer');
const sNamespaceRoot = 'sap.bos.app.';

const _copyAppFromMain2Target = (sSourceFolder, sTargetFolder, bDeleteIfExist)=>{
  if(bDeleteIfExist) fse.removeSync(sTargetFolder);

  fse.removeSync(sSourceFolder+'/dist');
  fse.removeSync(sSourceFolder+'/node_modules');
  fse.copySync(sSourceFolder, sTargetFolder);
};

const _updateTargetAppConfig = (sTargetFolder, sTargetAppName)=>{
  const sFilePath   = sTargetFolder+'/package.json';
  const oAppConfig  = fse.readJSONSync(sFilePath);
  oAppConfig.name         = sTargetAppName;
  oAppConfig.description  = oAppConfig.description + `: ${sTargetAppName}`;
  fse.writeJSONSync(sFilePath, oAppConfig);
}

const _updateTargetAppBuildConfigs = (sTargetFolder, sTargetAppName)=>{
  const sUI5FilePath = sTargetFolder+'/ui5.yaml', sUI5DeployFilePath = sTargetFolder+'/ui5-deploy.yaml';
  const oUI5Config        = yaml.load(fse.readFileSync(sUI5FilePath, 'utf8'));
  const oUI5DeployCOnfig  = yaml.load(fse.readFileSync(sUI5DeployFilePath, 'utf8'));
  oUI5Config.metadata.name = sNamespaceRoot+sTargetAppName;
  oUI5DeployCOnfig.metadata.name = sNamespaceRoot+sTargetAppName;
  oUI5DeployCOnfig.builder.customTasks.forEach(task => {
    if(task.name == 'ui5-task-zipper'){
      task.configuration.archiveName = sNamespaceRoot.replace(/\./g,'')+sTargetAppName;
    }
  });
  fse.writeFileSync(sUI5FilePath, yaml.dump(oUI5Config, { indent: 2 }));
  fse.writeFileSync(sUI5DeployFilePath, yaml.dump(oUI5DeployCOnfig, { indent: 2 }));
}

const _updateTargetAppIndexPage = (sTargetFolder, sTargetAppName)=>{
  const sIndexFilePath = sTargetFolder+'/webapp/index.html';
  let sIndexFileContent = fse.readFileSync(sIndexFilePath, 'utf8');
  sIndexFileContent = sIndexFileContent.replace(/"sap.bos.app.summary"/g, `"${sNamespaceRoot}${sTargetAppName}"`);
  fse.writeFileSync(sIndexFilePath, sIndexFileContent);
}

const _updateTargetAppComponent = (sTargetFolder, sTargetAppName)=>{
  const sComponentFilePath = sTargetFolder+'/webapp/Component.js';
  let sComponentFileContent = fse.readFileSync(sComponentFilePath, 'utf8');
  sComponentFileContent = sComponentFileContent.replace(/"sap.bos.app.summary.Component"/g, `"${sNamespaceRoot}${sTargetAppName}.Component"`);
  fse.writeFileSync(sComponentFilePath, sComponentFileContent);
}

const _updateTargetAppManifest = (sTargetFolder, sTargetAppName, sEntityName, sObjectPageEntityName)=>{
  const sManifestFilePath   = sTargetFolder+'/webapp/manifest.json';
  const oAppManifestConfig  = fse.readJSONSync(sManifestFilePath);
  oAppManifestConfig["sap.app"].id = sNamespaceRoot + sTargetAppName;
  oAppManifestConfig["sap.app"].crossNavigation.inbounds["BusinessObject-Summarize"].subTitle = sTargetAppName;
  oAppManifestConfig["sap.ui5"].models.i18n.settings.bundleName = sNamespaceRoot + sTargetAppName + ".i18n.i18n";
  oAppManifestConfig["sap.app"].crossNavigation.inbounds["BusinessObject-Summarize"].subTitle = sTargetAppName;

  const oBOListPageSettings   = oAppManifestConfig["sap.ui5"].routing.targets.BOList.options.settings;
  const oBOObjectPageSettings = oAppManifestConfig["sap.ui5"].routing.targets.BOObjectPage.options.settings;
  oBOListPageSettings.contextPath   = `/${sEntityName}`;
  oBOObjectPageSettings.contextPath = `/${sEntityName}`;

  let configkey = Object.keys(oBOObjectPageSettings.controlConfiguration);
  let newConfigKey = `orders/@com.sap.vocabularies.UI.v1.LineItem#${sObjectPageEntityName}`;
  if (configkey in oBOObjectPageSettings.controlConfiguration) {
    oBOObjectPageSettings.controlConfiguration[newConfigKey] = oBOObjectPageSettings.controlConfiguration[configkey];
    delete oBOObjectPageSettings.controlConfiguration[configkey];
  }
  oBOListPageSettings.navigation[sEntityName] = oBOListPageSettings.navigation["Equipment"];
  if((Object.keys(oBOListPageSettings.navigation)).length > 1)delete oBOListPageSettings.navigation["Equipment"];
  oBOObjectPageSettings.content.body.sections.Summary.template = sNamespaceRoot + sTargetAppName + ".ext.fragment.HistoricalSummary";
  oBOObjectPageSettings.content.body.sections.Summary.onSectionLoaded = sNamespaceRoot + sTargetAppName + ".ext.fragment.HistoricalSummary.onSectionLoadedCS";
  fse.writeJSONSync(sManifestFilePath, oAppManifestConfig);
}

const _updateTargetAppExtensions = (sTargetFolder, sTargetAppName)=>{
  const sFragmentFilePath = sTargetFolder+'/webapp/ext/fragment/HistoricalSummary.fragment.xml';
  let sFragmentFileContent = fse.readFileSync(sFragmentFilePath, 'utf8');
  sFragmentFileContent = sFragmentFileContent.replace(`/summary/`, `/${sTargetAppName}/`);
  fse.writeFileSync(sFragmentFilePath, sFragmentFileContent);

  const sControllerFilePath = sTargetFolder+'/webapp/ext/fragment/HistoricalSummary.js';
  let sControllerFileContent = fse.readFileSync(sControllerFilePath, 'utf8');
  sControllerFileContent = sControllerFileContent.replace(`.summary.`, `.${sTargetAppName}.`);
  fse.writeFileSync(sControllerFilePath, sControllerFileContent);
}

const _modifyMTAwithTargetAppInfo = (sTargetFolder, sTargetAppName)=>{
  const sMTAFilePath  =  sTargetFolder.replace('/app/summary','') + '/mta.yaml';
  const oMTAConfig    = yaml.load(fse.readFileSync(sMTAFilePath, 'utf8'));
  const sModuleName   = sNamespaceRoot.replace(/\./g,'') + sTargetAppName;
  if((oMTAConfig.modules.filter(module=> module.name == sModuleName)).length == 0){
    const oAppBuildConfig = JSON.parse(JSON.stringify(oMTAConfig.modules.filter(module=> module.name == 'sapbosappsummary')[0]));
    oAppBuildConfig.name = sModuleName;
    oAppBuildConfig.path = `app/${sTargetAppName}`;
    oMTAConfig.modules.push(oAppBuildConfig);
    const oAppDeployerConfig = oMTAConfig.modules.filter(module=> module.name == 'sap-bos-ui-deployer')[0];
    const oUiDeployerConfig = JSON.parse(JSON.stringify(oAppDeployerConfig["build-parameters"].requires[0]));
    oUiDeployerConfig.name = sModuleName;
    oUiDeployerConfig.artifacts = [`${sModuleName}.zip`];
    oAppDeployerConfig["build-parameters"].requires.push(oUiDeployerConfig);
  }
  fse.writeFileSync(sMTAFilePath, yaml.dump(oMTAConfig, { indent: 2 }));
}
/* [execute]: bDeleteIfExist=true -> clean existing folders
- Read BO Configs
- For ALL BOs [isListPageUI = true], repeat following steps:
  1. copy summary folder
  2. change package.json
  3. change ui5.yaml and ui5-deploy.yaml
  4. change index.html
  5. change component.js
  6. change manifest
  7. change extensions (fragment, controller)
  8. update MTA
*/
const execute = async (bDeleteIfExist) => {
  
  const aBOConfigs = await boConfigsTransformer.getParsedBOConfigs();
  for (let i = 0; i < aBOConfigs.length; i++) {
    let sTargetAppName = aBOConfigs[i].ObjectName.toLowerCase(), sEntityName = aBOConfigs[i].ObjectName, sDependentEntityName = aBOConfigs[i].dependentObject;
    let sSourceFolder = `${require.main.path}/summary`, sTargetFolder = `${require.main.path}/${sTargetAppName}`;
    if (aBOConfigs[i].isListPageUI == true) {

      try {
        _copyAppFromMain2Target(sSourceFolder, sTargetFolder, bDeleteIfExist);
        _updateTargetAppConfig(sTargetFolder, sTargetAppName);
        _updateTargetAppBuildConfigs(sTargetFolder, sTargetAppName);
        _updateTargetAppIndexPage(sTargetFolder, sTargetAppName);
        _updateTargetAppComponent(sTargetFolder, sTargetAppName);
        if(sDependentEntityName) {
          _updateTargetAppManifest(sTargetFolder, sTargetAppName, sEntityName, sDependentEntityName);
        } else {
          let sExpendEntityName= Object.keys(aBOConfigs[i].expand[0])[0]
          _updateTargetAppManifest(sTargetFolder, sTargetAppName, sEntityName, sExpendEntityName);
        }
        _updateTargetAppExtensions(sTargetFolder, sTargetAppName);
        _modifyMTAwithTargetAppInfo(sSourceFolder, sTargetAppName);
      } catch (error) {
        console.log(`error while generating app for ${aBOConfigs[i].ObjectName}`);
        throw error;
      }

    }
  }

}


execute(true);