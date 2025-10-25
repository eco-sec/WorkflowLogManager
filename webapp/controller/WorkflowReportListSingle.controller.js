sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/format/DateFormat",
], function (Controller, Filter, FilterOperator, DateFormat) {
	"use strict";

	return Controller.extend("eco.sec.managerRequestReport.controller.WorkflowReportListSingle", {

		onInit: function () {
			this._oModel = this.getOwnerComponent().getModel();

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("RouteWorkflowReportListSingle").attachPatternMatched(this._onRouteMatched, this);
		},

		_onRouteMatched: function (oEvent) {
			var sId = oEvent.getParameter("arguments").employeeId;
			//var trainingType = oEvent.getParameter("arguments").trainingType;
			var startDate = oEvent.getParameter("arguments").startDate;
			var endDate = oEvent.getParameter("arguments").endDate;

			this.byId("employeeIdInput").setValue(sId);
			//this.byId("trainingTypeInput").setSelectedKey(trainingType);

			var oStartDate = this._parseDate(startDate);
			var oEndDate = this._parseDate(endDate);
			this.byId("startDateInput").setDateValue(oStartDate);
			this.byId("endDateInput").setDateValue(oEndDate);

			this.onSearch();
		},

		onInputChange: function () {
			// Handle live input changes if needed
		},

		onSearch: function () {
			var oTable = this.byId("trainingTable");
			var oBinding = oTable.getBinding("items");

			var sEmployeeId = this.byId("employeeIdInput").getValue();
			var sTrainingType = this.byId("trainingTypeInput").getSelectedKey();
			var oStartDate = this.byId("startDateInput").getDateValue();
			var oEndDate = this.byId("endDateInput").getDateValue();
			var aFilters = [];

			if (sEmployeeId) {
				aFilters.push(new Filter("EMPLOYEE_ID", FilterOperator.Contains, sEmployeeId));
			}

			// if (sTrainingType) {
			// 	aFilters.push(new Filter("TRAINING_TYPE", FilterOperator.EQ, sTrainingType));
			// }

			if (oStartDate && oEndDate) {
				var oDateFormat = DateFormat.getDateTimeInstance({
					pattern: "yyyyMMdd"
				});
				var sFormattedStartDate = oDateFormat.format(oStartDate);
				var sFormattedEndDate = oDateFormat.format(oEndDate);

				// Filter for overlapping date ranges
				aFilters.push(new Filter({
					filters: [
						new Filter("CLASS_BEGIN_DATE", FilterOperator.LE, sFormattedEndDate),
						new Filter("CLASS_END_DATE", FilterOperator.GE, sFormattedStartDate)
					],
					and: true
				}));
			}

			oBinding.filter(aFilters, "Application");
		},

		onItemPress: function (oEvent) {
			var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var sRequestId = oItem.getBindingContext().getProperty("WORKFLOW_ID");
			oRouter.navTo("workflowReportDetails", {
				requestId: sRequestId
			});
		},

		formatDate: function (sDate) {
			if (!sDate) {
				return "";
			}

			// Ensure sDate is a string
			sDate = sDate.toString();

			var sFormattedDate = sDate.substring(0, 19); // Only keep the first 19 characters
			var oDate = new Date(sFormattedDate);
			var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
				style: "medium",
				UTC: true
			});
			return oDateFormat.format(oDate);
		},

		formatDateOnly: function (sDate) {
			if (!sDate) {
				return "";
			}

			// Ensure sDate is a string
			sDate = sDate.toString();

			// Extract year, month, and day
			var year = sDate.substring(0, 4);
			var month = sDate.substring(4, 6);
			var day = sDate.substring(6, 8);
			var formattedDate = year + "-" + month + "-" + day;

			var oDate = new Date(formattedDate);
			var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				style: "medium",
				UTC: true
			});
			return oDateFormat.format(oDate);
		},

		_convertToValidDateFormat: function (date) {
			var oDateFormat = DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-dd'T'HH:mm:ss"
			});
			var sFormattedDate = oDateFormat.format(date);
			return sFormattedDate + ".0000000";
		},

		_parseDate: function (sDate) {
			if (typeof sDate === "string" && sDate.length === 8) {
				var year = parseInt(sDate.substring(0, 4), 10);
				var month = parseInt(sDate.substring(4, 6), 10) - 1; // Months are zero-based in JavaScript
				var day = parseInt(sDate.substring(6, 8), 10);
				return new Date(year, month, day);
			}
			return null;
		}
	});
});
