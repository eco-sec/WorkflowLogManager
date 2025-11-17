sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "managerlms/MangerLMSReport/service/EmployeeService",
    "managerlms/MangerLMSReport/service/WorkflowReportService"
], function (Controller, JSONModel, Filter, FilterOperator, Spreadsheet, MessageToast, EmployeeService, WorkflowReportService) {
    "use strict";

    return Controller.extend("managerlms.MangerLMSReport.controller.WorkflowReportList", {
        onInit: function () {
            this._iPageSize = 20;
            this._iSkip = 0;
            this._aCurrentFilters = [];

            // Page state model
            var oViewModel = new JSONModel({
                currentPage: 0
            });
            this.getView().setModel(oViewModel, "view");

            // User info model
            var oUserInfoModel = new JSONModel({
                userId: "",
                userName: "",
                displayText: "Loading..."
            });
            this.getView().setModel(oUserInfoModel, "userInfo");

            // Show busy indicator during initialization
            sap.ui.core.BusyIndicator.show(0);

            this.fetchCurrentUser();
            this.fetchAndUpsertSubordinates();
        },

        fetchCurrentUser: function () {
            var oUserModel = new JSONModel();
            var that = this;

            // Set default username for local testing (in case API fails)
            that.username = "107119";

            // Update user info model with default
            this.getView().getModel("userInfo").setData({
                userId: "107119",
                userName: "Ahmed Hassan",
                displayText: "Logged in as: Ahmed Hassan (107119)"
            });

            oUserModel.loadData("/services/userapi/currentUser");
            oUserModel.attachRequestCompleted(function (oEvent) {
                if (oEvent.getParameter("success")) {
                    var oData = oUserModel.getData();
                    var sCurrentUserId = oData.name || "107119";
                    var sCurrentUserName = oData.firstname ? (oData.firstname + " " + (oData.lastname || "")) : "User";
                    that.username = sCurrentUserId;

                    // Update user info model
                    that.getView().getModel("userInfo").setData({
                        userId: sCurrentUserId,
                        userName: sCurrentUserName,
                        displayText: "Logged in as: " + sCurrentUserName + " (" + sCurrentUserId + ")"
                    });

                    console.log("✅ User loaded:", sCurrentUserId);
                } else {
                    console.error("Error retrieving user info - using default username:", that.username);
                }
            }.bind(this));
            oUserModel.attachRequestFailed(function () {
                console.error("Failed to load current user data - using default username:", that.username);
            }.bind(this));
        },

        loadWorkflowLogData: function (filters, bIsExport) {
            var that = this;
            var sServiceUrl = "/lmsproject/hana/xsodata/WorkflowReportService.xsodata";
            var aFilterObjects = filters || [];

            // Always add manager ID filter
            var sManagerId = this.username || "107119";
            var aFilterStrings = ["MS_MANAGER_ID eq '" + sManagerId + "'"];

            // Build filter query string with additional filters
            if (aFilterObjects.length > 0) {
                var aAdditionalFilters = aFilterObjects.map(function(oFilter) {
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
                aFilterStrings = aFilterStrings.concat(aAdditionalFilters);
            }

            var sFilterQuery = "?$filter=" + aFilterStrings.join(" and ");

            // Build pagination query
            var sPaginationQuery = "";
            if (!bIsExport && sFilterQuery) {
                sPaginationQuery = "&$skip=" + this._iSkip + "&$top=" + this._iPageSize;
            } else if (!bIsExport) {
                sPaginationQuery = "?$skip=" + this._iSkip + "&$top=" + this._iPageSize;
            }

            // 1. Fetch total count
            var oCountModel = new JSONModel();
            var sCountUrl = sServiceUrl + "/WorkflowManagerSubordinateView/$count" + sFilterQuery;
            oCountModel.loadData(sCountUrl, null, true, "GET", false, false, {
                "Content-Type": "application/json"
            });
            oCountModel.attachRequestCompleted(function() {
                var sCount = oCountModel.getData();
                that.getView().setModel(new JSONModel({ total: parseInt(sCount, 10) }), "countModel");
            });

            // 2. Fetch paged or full data
            var oDataModel = new JSONModel();
            var sDataUrl = sServiceUrl + "/WorkflowManagerSubordinateView" + sFilterQuery + sPaginationQuery;

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
                // Hide global busy indicator after data is loaded
                sap.ui.core.BusyIndicator.hide();
            });

            oDataModel.attachRequestFailed(function(oEvent) {
                console.error("Error loading WorkflowLog data");
                that.getView().byId("workflowLogTable").setBusy(false);
                // Hide global busy indicator even on error
                sap.ui.core.BusyIndicator.hide();
            });
        },

        onSearch: function () {
            var aFilters = [];

            var sRequestId = this.byId("requestIdInput").getValue();
            var sEmployeeId = this.byId("employeeIdInput").getValue();
            var sEmployeeOrgId = this.byId("employeeOrgIdInput").getValue();
            var sWorkflowInstanceId = this.byId("workflowInstanceIdInput").getValue();
            var sClassId = this.byId("classIdInput").getValue();
            var sClassTitle = this.byId("classTitleInput").getValue();
            var sTrainingType = this.byId("trainingTypeInput").getSelectedKey();
            var sWorkflowStatus = this.byId("workflowStatusInput").getSelectedKey();

            var dClassStartDateFrom = this.byId("classStartDateFrom").getDateValue();
            var dClassStartDateTo = this.byId("classStartDateTo").getDateValue();
            var dClassEndDateFrom = this.byId("classEndDateFrom").getDateValue();
            var dClassEndDateTo = this.byId("classEndDateTo").getDateValue();
            var dCreationDateFrom = this.byId("creationDateFrom").getDateValue();
            var dCreationDateTo = this.byId("creationDateTo").getDateValue();

            if (sRequestId) aFilters.push(new Filter("REQUEST_ID", FilterOperator.Contains, sRequestId));
            if (sEmployeeId) aFilters.push(new Filter("EMPLOYEE_ID", FilterOperator.Contains, sEmployeeId));
            if (sEmployeeOrgId) aFilters.push(new Filter("EMPLOYEE_ORGANIZATION_ID", FilterOperator.Contains, sEmployeeOrgId));
            if (sWorkflowInstanceId) aFilters.push(new Filter("WORKFLOW_INSTANCE_ID", FilterOperator.Contains, sWorkflowInstanceId));
            if (sClassId) aFilters.push(new Filter("CLASS_ID", FilterOperator.Contains, sClassId));
            if (sClassTitle) aFilters.push(new Filter("CLASS_TITLE", FilterOperator.Contains, sClassTitle));
            if (sTrainingType) aFilters.push(new Filter("TRAINING_TYPE_ID", FilterOperator.EQ, sTrainingType));
            if (sWorkflowStatus) aFilters.push(new Filter("WORKFLOW_STATUS", FilterOperator.EQ, sWorkflowStatus));

            // Class Start Date Range
            if (dClassStartDateFrom && dClassStartDateTo) {
                aFilters.push(new Filter("CLASS_START_DATE", FilterOperator.BT, dClassStartDateFrom, dClassStartDateTo));
            } else if (dClassStartDateFrom) {
                aFilters.push(new Filter("CLASS_START_DATE", FilterOperator.GE, dClassStartDateFrom));
            } else if (dClassStartDateTo) {
                aFilters.push(new Filter("CLASS_START_DATE", FilterOperator.LE, dClassStartDateTo));
            }

            // Class End Date Range
            if (dClassEndDateFrom && dClassEndDateTo) {
                aFilters.push(new Filter("CLASS_END_DATE", FilterOperator.BT, dClassEndDateFrom, dClassEndDateTo));
            } else if (dClassEndDateFrom) {
                aFilters.push(new Filter("CLASS_END_DATE", FilterOperator.GE, dClassEndDateFrom));
            } else if (dClassEndDateTo) {
                aFilters.push(new Filter("CLASS_END_DATE", FilterOperator.LE, dClassEndDateTo));
            }

            // Creation Date Range
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

        onClearSearch: function () {
            // Clear all input fields
            this.byId("requestIdInput").setValue("");
            this.byId("employeeIdInput").setValue("");
            this.byId("employeeOrgIdInput").setValue("");
            this.byId("workflowInstanceIdInput").setValue("");
            this.byId("classIdInput").setValue("");
            this.byId("classTitleInput").setValue("");
            this.byId("trainingTypeInput").setSelectedKey("");
            this.byId("workflowStatusInput").setSelectedKey("");
            this.byId("classStartDateFrom").setValue("");
            this.byId("classStartDateTo").setValue("");
            this.byId("classEndDateFrom").setValue("");
            this.byId("classEndDateTo").setValue("");
            this.byId("creationDateFrom").setValue("");
            this.byId("creationDateTo").setValue("");

            // Reset pagination
            this._iSkip = 0;
            this.getView().getModel("view").setProperty("/currentPage", 0);
            this._aCurrentFilters = [];

            // Reload data with no filters (except manager filter)
            this.loadWorkflowLogData([]);
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

            // Always add manager ID filter
            var sManagerId = this.username || "107119";
            var aFilterStrings = ["MS_MANAGER_ID eq '" + sManagerId + "'"];

            // Build filter query string with additional filters
            if (aFilterObjects.length > 0) {
                var aAdditionalFilters = aFilterObjects.map(function(oFilter) {
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
                aFilterStrings = aFilterStrings.concat(aAdditionalFilters);
            }

            var sFilterQuery = "?$filter=" + aFilterStrings.join(" and ");

            // Fetch all data without pagination for export
            var oExportModel = new JSONModel();
            var sExportUrl = sServiceUrl + "/WorkflowManagerSubordinateView" + sFilterQuery;

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
                    label: "Employee Organization ID",
                    property: "EMPLOYEE_ORGANIZATION_ID",
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
                    label: "Class Start Date",
                    property: "CLASS_START_DATE",
                    type: "date",
                    format: "yyyy-mm-dd"
                },
                {
                    label: "Class End Date",
                    property: "CLASS_END_DATE",
                    type: "date",
                    format: "yyyy-mm-dd"
                },
                {
                    label: "Status",
                    property: "WORKFLOW_STATUS",
                    type: "string"
                },
                {
                    label: "Training Type",
                    property: "TRAINING_TYPE_DESC",
                    type: "string"
                },
                {
                    label: "Creation Date",
                    property: "WLR_CREATION_DATE",
                    type: "date",
                    format: "yyyy-mm-dd"
                },
                {
                    label: "Approver Email",
                    property: "CA_EMP_EMAIL",
                    type: "string"
                },
                {
                    label: "Approver No",
                    property: "CA_EMP_NO",
                    type: "string"
                },
                {
                    label: "Approver Name",
                    property: "CA_APPROVER_NAME",
                    type: "string"
                },
                {
                    label: "Approver Position",
                    property: "CA_EMP_POSITION",
                    type: "string"
                },
                {
                    label: "Approver Org",
                    property: "CA_EMP_ORG",
                    type: "string"
                },
                {
                    label: "Approver Org Name",
                    property: "CA_EMP_ORG_NAME",
                    type: "string"
                },
                {
                    label: "Approver Position Name",
                    property: "CA_POSITION_NAME",
                    type: "string"
                },
                {
                    label: "Approver Organization Name",
                    property: "CA_ORG_NAME",
                    type: "string"
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
        },

        // ========== Employee Value Help Handlers ==========

        onEmployeeValueHelp: function () {
            var that = this;

            // Create Value Help dialog if not exists
            if (!this._employeeValueHelpDialog) {
                this._employeeValueHelpDialog = sap.ui.xmlfragment(
                    "managerlms.MangerLMSReport.fragment.EmployeeValueHelp",
                    this
                );
                this.getView().addDependent(this._employeeValueHelpDialog);
            }

            // Show busy indicator
            sap.ui.core.BusyIndicator.show(0);

            // Fetch subordinates for the current user
            EmployeeService.getSubordinates(this.username).then(function (oData) {
                var aSubordinates = (oData && oData.EmployeeHierarchySet && oData.EmployeeHierarchySet.EmployeeHierarchy)
                    ? oData.EmployeeHierarchySet.EmployeeHierarchy
                    : [];

                // Set subordinates model
                that._employeeValueHelpDialog.setModel(new JSONModel({
                    EmployeeList: aSubordinates
                }), "employeeModel");

                // Open the dialog
                that._employeeValueHelpDialog.open();
            }).catch(function (oError) {
                console.error("Error fetching subordinates", oError);
                MessageToast.show("Failed to load employees.");
            }).finally(function () {
                sap.ui.core.BusyIndicator.hide();
            });
        },

        onEmployeeSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter({
                filters: [
                    new Filter("EmpPernr", FilterOperator.Contains, sValue),
                    new Filter("EmpEnglishName", FilterOperator.Contains, sValue),
                    new Filter("EmpEmailId", FilterOperator.Contains, sValue)
                ],
                and: false
            });
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        onEmployeeConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var oContext = oSelectedItem.getBindingContext("employeeModel");
                var oEmployee = oContext.getObject();

                // Set selected employee ID
                var oEmployeeIdInput = this.byId("employeeIdInput");
                oEmployeeIdInput.setValue(oEmployee.EmpPernr);
            }
        },

        onEmployeeCancel: function () {
            // Dialog closes automatically
        },

        /**
         * Fetches subordinates for current user and upserts to HANA
         */
        fetchAndUpsertSubordinates: function () {
            var that = this;

            // Wait a bit to ensure username is loaded
            setTimeout(function() {
                var sCurrentUserId = that.username || "107119";

                console.log("Fetching subordinates for manager:", sCurrentUserId);

                EmployeeService.getSubordinates(sCurrentUserId).then(function (oData) {
                    var aSubordinates = (oData && oData.EmployeeHierarchySet && oData.EmployeeHierarchySet.EmployeeHierarchy)
                        ? oData.EmployeeHierarchySet.EmployeeHierarchy
                        : [];

                    console.log("Subordinates fetched:", aSubordinates.length);

                    // Transform to required format
                    var oManagerData = {
                        MANAGERS: [
                            {
                                MANAGER_ID: String(sCurrentUserId),
                                SUBORDINATES: aSubordinates.map(function(emp) {
                                    return {
                                        EMPLOYEE_ID: String(emp.EmpPernr || ""),
                                        EMPLOYEE_NAME: String(emp.EmpEnglishName || ""),
                                        EMPLOYEE_EMAIL: String(emp.EmpEmailId || "")
                                    };
                                })
                            }
                        ]
                    };

                    console.log("Upserting manager subordinates data:", oManagerData);

                    // Upsert to HANA
                    return WorkflowReportService.upsertManagerSubordinate(oManagerData);
                }).then(function(oResponse) {
                    console.log("✅ Manager subordinates upserted successfully:", oResponse);
                    // Load workflow data from WorkflowManagerSubordinateView after upsert completes
                    that.loadWorkflowLogData([], false);
                }).catch(function (oError) {
                    console.error("❌ Error upserting manager subordinates:", oError);
                    // Load workflow data even if upsert fails (fallback)
                    that.loadWorkflowLogData([], false);
                });
            }, 1000);
        }
    });
});
