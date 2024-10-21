
sap.ui.define(function() {
  const generateManifest = async (boName) => {
    try {
  
      // Find the context path for Equipment
      let boContextPath = "/" + boName;
      const manifest = {
        "_version": "1.59.0",
        "sap.app": {
          "id": "bosummary.bosummary",
          "type": "application",
          "i18n": "i18n/i18n.properties",
          "applicationVersion": {
            "version": "0.0.1"
          },
          "title": "{{appTitle}}",
          "description": "{{appDescription}}",
          "resources": "resources.json",
          "sourceTemplate": {
            "id": "@sap/generator-fiori:lrop",
            "version": "1.13.5",
            "toolsId": "2e785c79-e836-4a77-ae2b-1038eb85721f"
          },
          "dataSources": {
            "mainService": {
              "uri": "/odata/v4/bodetails/",
              "type": "OData",
              "settings": {
                "annotations": [],
                "localUri": "localService/metadata.xml",
                "odataVersion": "4.0"
              }
            }
          }
        },
        "sap.ui": {
          "technology": "UI5",
          "icons": {
            "icon": "",
            "favIcon": "",
            "phone": "",
            "phone@2": "",
            "tablet": "",
            "tablet@2": ""
          },
          "deviceTypes": {
            "desktop": true,
            "tablet": true,
            "phone": true
          }
        },
        "sap.ui5": {
          "flexEnabled": true,
          "dependencies": {
            "minUI5Version": "1.124.1",
            "libs": {
              "sap.m": {},
              "sap.ui.core": {},
              "sap.ushell": {},
              "sap.fe.templates": {}
            }
          },
          "contentDensities": {
            "compact": true,
            "cozy": true
          },
          "models": {
            "i18n": {
              "type": "sap.ui.model.resource.ResourceModel",
              "settings": {
                "bundleName": "bosummary.bosummary.i18n.i18n"
              }
            },
            "": {
              "dataSource": "mainService",
              "preload": true,
              "settings": {
                "operationMode": "Server",
                "autoExpandSelect": true,
                "earlyRequests": true
              }
            },
            "@i18n": {
              "type": "sap.ui.model.resource.ResourceModel",
              "uri": "i18n/i18n.properties"
            }
          },
          "resources": {
            "css": []
          },
          "routing": {
            "config": {},
            "routes": [
              {
                "pattern": ":?query:",
                "name": "BusinessObjectList",
                "target": "BusinessObjectList"
              },
              {
                "pattern": boName + "({key}):?query:",
                "name": "BusinessObjectObjectPage",
                "target": "BusinessObjectObjectPage"
              }
            ],
            "targets": {
              "BusinessObjectList": {
                "type": "Component",
                "id": "BusinessObjectList",
                "name": "sap.fe.templates.ListReport",
                "options": {
                  "settings": {
                    "contextPath": boContextPath,
                    "variantManagement": "Page",
                    "navigation": {
                      [boName]: {
                        "detail": {
                          "route": "BusinessObjectObjectPage"
                        }
                      }
                    },
                    "controlConfiguration": {
                      "@com.sap.vocabularies.UI.v1.LineItem": {
                        "tableSettings": {
                          "type": "ResponsiveTable"
                        }
                      }
                    }
                  }
                }
              },
              "BusinessObjectObjectPage": {
                "type": "Component",
                "id": "BusinessObjectObjectPage",
                "name": "sap.fe.templates.ObjectPage",
                "options": {
                  "settings": {
                    "editableHeaderContent": false,
                    "contextPath": boContextPath
                  }
                }
              }
            }
          }
        },
        "sap.fiori": {
          "registrationIds": [],
          "archeType": "transactional"
        },
        "sap.cloud": {
          "public": true,
          "service": "tfe.bosummary"
        }
      };
  
      // Convert the manifest object to a JSON string with proper formatting
      const manifestJson = JSON.stringify(manifest, null, 2);
    console.log('Manifest.json: ' + manifestJson);
    return manifestJson;
    }
    catch (error) {
      console.log('Error generating manifest.json: ' + error);
      throw error;
    }
  };
  return {
    generateManifest
  };
})
