sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, Spreadsheet, MessageToast) {
    "use strict";

    return Controller.extend("eco.sec.managerRequestReport.controller.WorkflowReportList", {
        onInit: function () {
            this._iPageSize = 20;
            this._iSkip = 0;
            this._aCurrentFilters = [];

            // Page state model
            var oViewModel = new JSONModel({
                currentPage: 0
            });
            this.getView().setModel(oViewModel, "view");

            this.loadWorkflowLogData();
        },

        loadWorkflowLogData: function (filters, bIsExport) {
            var that = this;
            var sServiceUrl = "/lmsproject/hana/xsodata/WorkflowReportService.xsodata";
            var aFilterObjects = filters || [];

            // Build filter query string
            var sFilterQuery = "";
            if (aFilterObjects.length > 0) {
                var aFilterStrings = aFilterObjects.map(function(oFilter) {
                    var sOperator = "";
                    switch(oFilter.sOperator) {
                        case FilterOperator.Contains:
                            // For Contains, we use substringof in OData v2
                            return "substringof('" + encodeURIComponent(oFilter.oValue1) + "'," + oFilter.sPath + ")";
                        case FilterOperator.EQ:
                            sOperator = "eq";
                            break;
                        case FilterOperator.BT:
                            return oFilter.sPath + " ge datetime'" + oFilter.oValue1.toISOString().split('.')[0] + "' and " +
                                   oFilter.sPath + " le datetime'" + oFilter.oValue2.toISOString().split('.')[0] + "'";
                        case FilterOperator.GE:
                            return oFilter.sPath + " ge datetime'" + oFilter.oValue1.toISOString().split('.')[0] + "'";
                        case FilterOperator.LE:
                            return oFilter.sPath + " le datetime'" + oFilter.oValue1.toISOString().split('.')[0] + "'";
                        default:
                            sOperator = "eq";
                    }
                    return oFilter.sPath + " " + sOperator + " '" + encodeURIComponent(oFilter.oValue1) + "'";
                });
                sFilterQuery = "?$filter=" + aFilterStrings.join(" and ");
            }

            // Build pagination query
            var sPaginationQuery = "";
            if (!bIsExport && sFilterQuery) {
                sPaginationQuery = "&$skip=" + this._iSkip + "&$top=" + this._iPageSize;
            } else if (!bIsExport) {
                sPaginationQuery = "?$skip=" + this._iSkip + "&$top=" + this._iPageSize;
            }

            // 1. Fetch total count
            var oCountModel = new JSONModel();
            var sCountUrl = sServiceUrl + "/WorkflowLogView/$count" + sFilterQuery;
            oCountModel.loadData(sCountUrl, null, true, "GET", false, false, {
                "Content-Type": "application/json"
            });
            oCountModel.attachRequestCompleted(function() {
                var sCount = oCountModel.getData();
                that.getView().setModel(new JSONModel({ total: parseInt(sCount, 10) }), "countModel");
            });

            // 2. Fetch paged or full data
            var oDataModel = new JSONModel();
            var sDataUrl = sServiceUrl + "/WorkflowLogView" + sFilterQuery + sPaginationQuery;

            this.getView().byId("workflowLogTable").setBusy(true);

            oDataModel.loadData(sDataUrl, null, true, "GET", false, false, {
                "Content-Type": "application/json"
            });

            oDataModel.attachRequestCompleted(function() {
                var oData = oDataModel.getData();
                if (oData && oData.d && oData.d.results) {
                    var uniqueData = that._getUniqueData(oData.d.results);
                    var oJsonModel = new JSONModel(uniqueData);
                    that.getView().setModel(oJsonModel, "workflowLogModel");
                }
                that.getView().byId("workflowLogTable").setBusy(false);
            });

            oDataModel.attachRequestFailed(function(oEvent) {
                console.error("Error loading WorkflowLog data");
                that.getView().byId("workflowLogTable").setBusy(false);
            });
        },

        onSearch: function () {
            var aFilters = [];

            var sEmployeeId = this.byId("employeeIdInput").getValue();
            var sTrainingType = this.byId("trainingTypeInput").getSelectedKey();
            var sWorkflowId = this.byId("workflowIdInput").getValue();
            var sClassId = this.byId("classIdInput").getValue();
            var sClassTitle = this.byId("classTitleInput").getValue();
            var sEmployeeOrgId = this.byId("employeeOrgIdInput").getValue();
            var dCreationDateFrom = this.byId("creationDateFrom").getDateValue();
            var dCreationDateTo = this.byId("creationDateTo").getDateValue();
            // var sApproverId = this.byId("approverIdInput").getValue();
            var sRequestId = this.byId("requestIdInput").getValue();
            var sWorkflowStatus = this.byId("workflowStatusInput").getSelectedKey();

            if (sRequestId) aFilters.push(new Filter("REQUEST_ID", FilterOperator.Contains, sRequestId));
            if (sEmployeeId) aFilters.push(new Filter("EMPLOYEE_ID", FilterOperator.Contains, sEmployeeId));
            // if (sApproverId) aFilters.push(new Filter("CA_APPROVER_ID", FilterOperator.Contains, sApproverId));
            if (sTrainingType) aFilters.push(new Filter("TRAINING_TYPE_ID", FilterOperator.EQ, sTrainingType));
            if (sWorkflowId) aFilters.push(new Filter("WORKFLOW_INSTANCE_ID", FilterOperator.Contains, sWorkflowId));
            if (sClassId) aFilters.push(new Filter("CLASS_ID", FilterOperator.Contains, sClassId));
            if (sClassTitle) aFilters.push(new Filter("CLASS_TITLE", FilterOperator.Contains, sClassTitle));
            if (sEmployeeOrgId) aFilters.push(new Filter("EMPLOYEE_ORGANIZATION_ID", FilterOperator.Contains, sEmployeeOrgId));
            if (sWorkflowStatus) aFilters.push(new Filter("WORKFLOW_STATUS", FilterOperator.EQ, sWorkflowStatus));

            if (dCreationDateFrom && dCreationDateTo) {
                aFilters.push(new Filter("WLR_CREATION_DATE", FilterOperator.BT, dCreationDateFrom, dCreationDateTo));
            } else if (dCreationDateFrom) {
                aFilters.push(new Filter("WLR_CREATION_DATE", FilterOperator.GE, dCreationDateFrom));
            } else if (dCreationDateTo) {
                aFilters.push(new Filter("WLR_CREATION_DATE", FilterOperator.LE, dCreationDateTo));
            }

            this._iSkip = 0;
            this.getView().getModel("view").setProperty("/currentPage", 0);
            this._aCurrentFilters = aFilters;
            this.loadWorkflowLogData(aFilters);
        },

        onNextPage: function () {
            this._iSkip += this._iPageSize;
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/currentPage", this._iSkip / this._iPageSize);
            this.loadWorkflowLogData(this._aCurrentFilters);
        },

        onPreviousPage: function () {
            if (this._iSkip >= this._iPageSize) {
                this._iSkip -= this._iPageSize;
                const oViewModel = this.getView().getModel("view");
                oViewModel.setProperty("/currentPage", this._iSkip / this._iPageSize);
                this.loadWorkflowLogData(this._aCurrentFilters);
            }
        },

        onExportToExcel: function () {
            var that = this;
            var sServiceUrl = "/lmsproject/hana/xsodata/WorkflowReportService.xsodata";
            var aFilterObjects = this._aCurrentFilters || [];

            // Build filter query string
            var sFilterQuery = "";
            if (aFilterObjects.length > 0) {
                var aFilterStrings = aFilterObjects.map(function(oFilter) {
                    var sOperator = "";
                    switch(oFilter.sOperator) {
                        case FilterOperator.Contains:
                            return "substringof('" + encodeURIComponent(oFilter.oValue1) + "'," + oFilter.sPath + ")";
                        case FilterOperator.EQ:
                            sOperator = "eq";
                            break;
                        case FilterOperator.BT:
                            return oFilter.sPath + " ge datetime'" + oFilter.oValue1.toISOString().split('.')[0] + "' and " +
                                   oFilter.sPath + " le datetime'" + oFilter.oValue2.toISOString().split('.')[0] + "'";
                        case FilterOperator.GE:
                            return oFilter.sPath + " ge datetime'" + oFilter.oValue1.toISOString().split('.')[0] + "'";
                        case FilterOperator.LE:
                            return oFilter.sPath + " le datetime'" + oFilter.oValue1.toISOString().split('.')[0] + "'";
                        default:
                            sOperator = "eq";
                    }
                    return oFilter.sPath + " " + sOperator + " '" + encodeURIComponent(oFilter.oValue1) + "'";
                });
                sFilterQuery = "?$filter=" + aFilterStrings.join(" and ");
            }

            // Fetch all data without pagination for export
            var oExportModel = new JSONModel();
            var sExportUrl = sServiceUrl + "/WorkflowLogView" + sFilterQuery;

            oExportModel.loadData(sExportUrl, null, true, "GET", false, false, {
                "Content-Type": "application/json"
            });

            oExportModel.attachRequestCompleted(function() {
                var oData = oExportModel.getData();
                if (oData && oData.d && oData.d.results) {
                    var uniqueData = that._getUniqueData(oData.d.results);
                    if (!uniqueData || uniqueData.length === 0) {
                        MessageToast.show("No data available to export.");
                        return;
                    }

                    // Export to Excel using Spreadsheet
                    var aCols = that._createColumnConfig();
                    var oSettings = {
                        workbook: {
                            columns: aCols,
                            context: {
                                application: "Workflow Report",
                                version: "1.0"
                            }
                        },
                        dataSource: uniqueData,
                        fileName: "Workflow_Report.xlsx",
                        worker: false
                    };

                    var oSheet = new Spreadsheet(oSettings);
                    oSheet.build().finally(function() {
                        oSheet.destroy();
                    });

                    MessageToast.show("Export to Excel successful!");
                } else {
                    MessageToast.show("No data available to export.");
                }
            });

            oExportModel.attachRequestFailed(function() {
                console.error("Failed to export data");
                MessageToast.show("Failed to export data.");
            });
        },

        _createColumnConfig: function() {
            return [
                {
                    label: "Request ID",
                    property: "REQUEST_ID",
                    type: "string"
                },
                {
                    label: "Employee ID",
                    property: "EMPLOYEE_ID",
                    type: "string"
                },
                {
                    label: "Employee Name",
                    property: "EMPLOYEE_NAME",
                    type: "string"
                },
                {
                    label: "Workflow Type",
                    property: "WORKFLOW_TYPE",
                    type: "string"
                },
                {
                    label: "Status",
                    property: "WORKFLOW_STATUS",
                    type: "string"
                },
                {
                    label: "Class ID",
                    property: "CLASS_ID",
                    type: "string"
                },
                {
                    label: "Class Title",
                    property: "CLASS_TITLE",
                    type: "string"
                },
                {
                    label: "Start Date",
                    property: "CLASS_START_DATE",
                    type: "date",
                    format: "yyyy-mm-dd"
                },
                {
                    label: "End Date",
                    property: "CLASS_END_DATE",
                    type: "date",
                    format: "yyyy-mm-dd"
                },
                {
                    label: "Created Date",
                    property: "CREATED_DATE",
                    type: "date",
                    format: "yyyy-mm-dd"
                }
            ];
        },

        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oBindingContext = oItem.getBindingContext("workflowLogModel");
            if (!oBindingContext) {
                console.error("No binding context found for item");
                return;
            }

            var sRequestId = oBindingContext.getProperty("WORKFLOW_INSTANCE_ID");
            console.log("Navigating to details for WORKFLOW_INSTANCE_ID:", sRequestId);

            if (!sRequestId) {
                console.error("No WORKFLOW_INSTANCE_ID found");
                return;
            }

            sap.ui.core.UIComponent.getRouterFor(this).navTo("workflowReportDetails", {
                requestId: sRequestId
            });
        },

        formatDate: function (sDate) {
            if (!sDate) return "";
            let oDate;

            if (typeof sDate === "string" && sDate.startsWith("/Date(")) {
                const iTimestamp = parseInt(sDate.match(/\d+/)[0], 10);
                oDate = new Date(iTimestamp);
            } else {
                oDate = new Date(sDate);
            }

            if (isNaN(oDate.getTime())) return "";

            return sap.ui.core.format.DateFormat.getDateInstance({ style: "medium" }).format(oDate);
        },

        _getUniqueData: function (data) {
            const map = new Map();
            data.forEach(item => {
                if (!map.has(item.WORKFLOW_INSTANCE_ID)) {
                    map.set(item.WORKFLOW_INSTANCE_ID, item);
                }
            });
            return data; // Array.from(map.values());
        }
    });
});
