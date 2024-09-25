sap.ui.define([
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Spreadsheet, exportLibrary, MessageToast, MessageBox) {
    'use strict';
    let EdmType = exportLibrary.EdmType;
    let bErrorMessageDisplayed = false;
    return {
        /**
       * Method for opening the Dialog to browse and show excel file data.
       */
        ExcelUpload: function () {
            this.localModel = new sap.ui.model.json.JSONModel({
                items: [],
                validationSuccess: false
            });
            this.getView().setModel(this.localModel, "localModel");

            if (!this.oDialog) {
                var jQueryScript = document.createElement('script');
                jQueryScript.setAttribute('src', jQuery.sap.getModulePath("com.jlr.s2p.sbiandretro.utils.libs") + '/jszip.js');
                document.head.appendChild(jQueryScript);

                var jQueryScript = document.createElement('script');
                jQueryScript.setAttribute('src', jQuery.sap.getModulePath("com.jlr.s2p.sbiandretro.utils.libs") + '/xlsx.js');
                document.head.appendChild(jQueryScript);

                var sFragmentPath = "com.jlr.s2p.sbiandretro.fragments.importExcelDialog";
                this.oDialog = new sap.ui.core.Fragment.load({
                    id: this.getView().getId(),
                    name: sFragmentPath,
                    controller: this.getView().getController()
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            this.oDialog.then(function (oDialog) {
                this.getView().addDependent(oDialog);
                oDialog.open();
            }.bind(this));
        },

        /**
        * Method for opening the Dialog to browse and show excel file data.
        * @param {oEvent} e is and event of file selection.
        */
        onUpload: function (e) {
            this._import(e.getParameter("files") && e.getParameter("files")[0]);
        },

        /**
        * Method for extracting the excel file content and set it to the JSON model
        * @param {Object} file is an object of selected file.
        */
        _import: function (file) {
            var excelData = {};
            if (file && window.FileReader) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var data = e.target.result;
                    var workbook = XLSX.read(data, {
                        type: 'binary'
                    });
                    workbook.SheetNames.forEach(function (sheetName) {
                        excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                    });
                    // Setting the data to the local model
                    this.localModel.setData({
                        items: excelData
                    });
                    this.localModel.setSizeLimit(excelData.length);
                    this.localModel.refresh(true);

                    this.fnFormatDataObjects();
                }.bind(this);
                reader.onerror = function (ex) {
                    console.log(ex);
                };
                reader.readAsBinaryString(file);
            }
        },

        /**
        * Method for exporting the template excel file
        */
        onExportTemplate: function () {
            var aCols = this._createColumnConfig(),
                oSettings = {
                    workbook: { columns: aCols, context: { sheetName: "SBI Narratives" } },
                    dataSource: [{
                        "Company Code": " ",
                        "Country or region key": " ",
                        "Tax on sale or purchase code": " ",
                        "Header for SBI": " ",
                        "Header for self billing credit": " ",
                        "Header for debit": " ",
                        "Header for retro invoice": " ",
                        "Header for retro credit": " ",
                        "Tax description for sbi": " ",
                        "EC 6th Directive Narrative for SBI (English)": " ",
                        "EC 6th Directive Narrative (local language)": " ",

                    }],
                    fileName: 'SBI Narratives.xlsx',
                    worker: false
                },
                oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },
        /**
        * Method for generating the columns sturcure for the template excel file
        * @returns {Array} aCols is an array of the column setting objects for excel template.
        */
        _createColumnConfig: function () {
            return [{
                label: 'Company Code',
                type: EdmType.String,
                property: 'Company Code',
            },
            {
                label: 'Country or region key',
                type: EdmType.String,
                property: 'Country or region key',
            },
            {
                label: 'Tax on sale or purchase code',
                type: EdmType.String,
                property: 'Tax on sale or purchase code',
            },
            {
                label: 'Header for SBI',
                type: EdmType.String,
                property: 'Header for SBI',
            },
            {
                label: 'Header for self billing credit',
                type: EdmType.String,
                property: 'Header for self billing credit',
            },
            {
                label: 'Header for debit',
                type: EdmType.String,
                property: 'Header for debit',
            },
            {
                label: 'Header for retro invoice',
                type: EdmType.String,
                property: 'Header for retro invoice',
            },
            {
                label: 'Header for retro credit',
                type: EdmType.String,
                property: 'Header for retro credit',
            },
            {
                label: 'Tax description for sbi',
                type: EdmType.String,
                property: 'Tax description for sbi',
            },
            {
                label: 'EC 6th Directive Narrative for SBI (English)',
                type: EdmType.String,
                property: 'EC 6th Directive Narrative for SBI (English)',
            },
            {
                label: 'EC 6th Directive Narrative (local language)',
                type: EdmType.String,
                property: 'EC 6th Directive Narrative (local language)',
            }


            ];
        },

        /**
        * Method for sending the data to backend using batch call.
        */
        onSubmitPress: function () {
            let aDataPayload = this.localModel.getProperty("/items"),
                oModel = this.getView().getModel();

            if (this.localModel.getProperty("/validationSuccess")) {
                // ----------------- Batch Create Starts Here -----------------
                this.getView().setBusy(true);
                oModel.setChangeBatchGroups({
                    "*": {
                        groupId: "SBINarratives",
                        changeSetId: "SBINarratives",
                        single: false
                    }
                });

                oModel.setDeferredGroups(["SBINarratives"]);
                for (let i = 0; i < aDataPayload.length; i++) {
                    let oPayloadObj = aDataPayload[i];
                    //  oModel.refreshSecurityToken(function () {
                    let oSBINarrativesEntry = {
                        properties: oPayloadObj,
                        changeSetId: "SBINarratives",
                        groupId: "SBINarratives"
                    };
                    oModel.createEntry("/ZS2P_C_SBI_NARR", oSBINarrativesEntry);
                    //  }, true);
                }

                oModel.submitChanges({
                    groupId: "SBINarratives",
                    changeSetId: "SBINarratives",
                    success: function () { },
                    error: function (e) { }
                });

                this.oDialog.then(function (oDialog) {
                    oDialog.close();
                }.bind(this));

                oModel.attachBatchRequestCompleted(this.onSubmissionSuccess, this);
            } else {
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("MSGIncorrectData"), { width: "100em" });
            }
        },

        /**
        * Method for handling the error messages for submitted requests.
        */

        onSubmissionSuccess: function (data) {
            if (data.getParameter("requests")) {
                // Case 1: Partial or complete Fail
                let aUniqueErrorMsgs = [];
                data.getParameter("requests").forEach(function (oItem) {
                    if (oItem.response.hasOwnProperty("responseText"))
                        aUniqueErrorMsgs.push(JSON.parse(oItem.response["responseText"]).error.message.value + "\n");
                    if (oItem.response.headers.hasOwnProperty("sap-message")) {
                        if (JSON.parse(oItem.response.headers["sap-message"]).severity === "error")
                            aUniqueErrorMsgs.push(JSON.parse(oItem.response.headers["sap-message"]).message + "\n");
                    }
                });

                aUniqueErrorMsgs = aUniqueErrorMsgs.filter(function onlyUnique(value, index, array) {
                    return array.indexOf(value) === index;
                });

                if (aUniqueErrorMsgs.length > 0 && bErrorMessageDisplayed === false) {
                    sap.m.MessageBox.error(aUniqueErrorMsgs.toString());
                    bErrorMessageDisplayed = true;
                    this.getView().getModel().refresh();
                    this.getView().setBusy(false);
                    return;
                }

                // case 2: All upload success
                let aSuccessResponses = data.getParameter("requests").filter(function (oItem) {
                    return oItem.response.statusCode === "201";
                });

                if (aSuccessResponses.length === data.getParameter("requests").length) {
                    MessageToast.show("Records created Successfully.");
                    this.getView().setBusy(false);
                }

                this.getView().setBusy(false);
            }

            this.getView().getModel().resetChanges();
        },
        /**
        * Method for closing the dialog on Cancel button pressed.
        */
        onCancelPress: function () {
            this.oDialog.then(function (oDialog) {
                oDialog.close();
            }.bind(this));
        },
        /**
        * Method for validating and Mapping the Excel data with fields.
        * @returns {Array/String} on error detection: "Invalid Content" as error flag else array of Formatted objects.
        */
        fnFormatDataObjects: function () {
            let aData = this.localModel.getProperty("/items");
            for (let i = 0; i < aData.length; i++) {

                aData[i].bukrs = aData[i]["Company Code"] ? aData[i]["Company Code"] : "";
                delete aData[i]["Company Code"];
                
                aData[i].land1 = aData[i]["Country or region key"] ? aData[i]["Country or region key"] : "";
                delete aData[i]["Country or region key"];
                
                aData[i].mwskz = aData[i]["Tax on sale or purchase code"] ? aData[i]["Tax on sale or purchase code"] : "";
                delete aData[i]["Tax on sale or purchase code"];
                
                aData[i].zheader = aData[i]["Header for SBI"] ? aData[i]["Header for SBI"] : "";
                delete aData[i]["Header for SBI"];
                
                aData[i].zheader_sbc = aData[i]["Header for self billing credit"] ? aData[i]["Header for self billing credit"] : "";
                delete aData[i]["Header for self billing credit"];
                
                aData[i].zheader_deb = aData[i]["Header for debit"] ? aData[i]["Header for debit"] : "";
                delete aData[i]["Header for debit"];
                
                aData[i].zheader_retin = aData[i]["Header for retro invoice"] ? aData[i]["Header for retro invoice"] : "";
                delete aData[i]["Header for retro invoice"];
                
                aData[i].zheader_retcr = aData[i]["Header for retro credit"] ? aData[i]["Header for retro credit"] : "";
                delete aData[i]["Header for retro credit"];
                
                aData[i].zdescription = aData[i]["Tax description for sbi"] ? aData[i]["Tax description for sbi"] : "";
                delete aData[i]["Tax description for sbi"];
                
                aData[i].zdirect_narr_en = aData[i]["EC 6th Directive Narrative for SBI (English)"] ? aData[i]["EC 6th Directive Narrative for SBI (English)"] : "";
                delete aData[i]["EC 6th Directive Narrative for SBI (English)"];
                
                aData[i].zdirect_narr_lc = aData[i]["EC 6th Directive Narrative (local language)"] ? aData[i]["EC 6th Directive Narrative (local language)"] : "";
                delete aData[i]["EC 6th Directive Narrative (local language)"];

            }

            this.localModel.setProperty("/items", aData);
            this.localModel.setProperty("/validationSuccess", true);
        }
    };
});