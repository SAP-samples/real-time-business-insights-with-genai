sap.ui.define([
    "sap/m/MessageBox",
    'sap/ui/core/Fragment',
    "sap/ui/model/json/JSONModel"
], function (MessageBox, Fragment, JSONModel) {
    'use strict';
    let oSection, oTASummary;

    function _GuidedPromptController(oExtensionAPI, boKey, boId) {
        let oPopOver, sBOKey = boKey, sBOId = boId;
        return {
            onBeforeOpen: function (oEvent) {
                oPopOver = oEvent.getSource();
                oExtensionAPI.addDependent(oPopOver);
            },
            onPromptCategoryChange: function (oSelectionChange) {
                var sSelectedKey = oSelectionChange.getParameter("item").getKey();
                if (sSelectedKey == "SIPrompt") {
                    (oSelectionChange.getSource().getParent().getContent()[2]).setVisible(true);
                    (oSelectionChange.getSource().getParent().getContent()[3]).setVisible(false);
                }
                if (sSelectedKey == "OEPrompt") {
                    (oSelectionChange.getSource().getParent().getContent()[2]).setVisible(false);
                    (oSelectionChange.getSource().getParent().getContent()[3]).setVisible(true);
                }
            },
            onConfirmGenerate: function (oEvent) {
                oPopOver.setBusyIndicatorDelay(0).setBusy(true);
                const sBindingPath = oEvent.getSource().getBindingContext().getPath();
                const sBOEntity = (sBindingPath.split('/')[1]).split('(')[0];
                const sBObjectKey = oEvent.getSource().getBindingContext().getModel().getMetaModel().getData()[`BODetailsService.${sBOEntity}`]['$Key'][0];
                const sBObjectId = oEvent.getSource().getBindingContext().getProperty(sBObjectKey);
                const oPromptConfig = oEvent.getSource().getModel('prompt').getData();
                const oMainModel = oEvent.getSource().getModel();
                const oOperation = oMainModel.bindContext(`${sBindingPath}/BODetailsService.summarize(...)`);
                oOperation.setParameter(sBObjectKey, sBObjectId);
                oOperation.setParameter('config', JSON.stringify(oPromptConfig.config));
                oOperation.execute().then(function () {
                    oPopOver.getBindingContext().refresh();
                    oPopOver.setBusyIndicatorDelay(0).setBusy(false);
                    oPopOver && oPopOver.close();
                }).catch(function (errorMsg) {
                    console.log(errorMsg.error);
                    oPopOver.setBusyIndicatorDelay(0).setBusy(false);
                    oPopOver && oPopOver.close();
                    MessageBox.error("Summary was not generated successfully. Please contact your administrator!");
                });
            },
            onAfterClose: function (oEvent) {
                oExtensionAPI.removeDependent(oPopOver);
                oPopOver.destroy();
                oPopOver = undefined;
            },
            onConfirmCancel: function (oEvent) {
                oPopOver && oPopOver.close();
            }
        }
    }

    return {
        onReGenerateSummary: function (oEvent) {
            var oSummaryButton = oEvent.getSource(), oView = this._view;
            const boPath = oEvent.getSource().getBindingContext().getPath();
            const boKey = (boPath.split('/')[1]).split('(')[0];
            const boId = oEvent.getSource().getBindingContext().getProperty(boKey);

            const oPromptData = { config: { selectedCategory: "SIPrompt", OEPromptInput: "", SISelectedStructure: "paragraph", SIWordLength: 150, SIVoiceTone: "Casual" } }
            const oPromptModel = new JSONModel(oPromptData);
            oView.setModel(oPromptModel, "prompt");

            this.loadFragment({
                id: "GuidedPrompt",
                name: "sap.bos.app.summary.ext.fragment.GuidedPrompt",
                controller: _GuidedPromptController(this, boKey, boId)
            }).then(function (oPopover) {
                oPopover.bindElement("prompt>/config");
                oPopover.openBy(oSummaryButton);
            });
        },
        formatModifiedAt: function (date) {
            if (date == undefined || date == '') return '';
            if (date[date.length - 1] !== 'Z') date = date + "Z";
            let dateInGMT = new Date(date);
            let localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            let formattedText = 'Generated with AI on ' + dateInGMT.toLocaleString('en-IN', { timeZone: localTimezone });
            return formattedText;
        },
        formatVisibility: function (text) {
            return text !== undefined && text !== 'no historical summary found';
        },
        formatFeedbackButtonVisibility: function (text) {
            console.log("formatFeedbackButtonVisibility called with:", text);
        },
        onSectionLoadedCS: function (section) {
            oSection = section;
            oTASummary = ((oSection.getSubSections()[0]).getBlocks()[0]).getContent().getContent()[1];
        }
    };
});
