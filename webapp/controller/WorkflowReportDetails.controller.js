sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"workflowLogManager/workflowLogManager/service/WorkflowReportService"
], function (Controller, JSONModel, MessageToast, WorkflowReportService) {
	"use strict";

	return Controller.extend("workflowLogManager.workflowLogManager.controller.WorkflowReportDetails", {

		onInit: function () {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("workflowReportDetails").attachPatternMatched(this._onObjectMatched, this);
		},

		_onObjectMatched: function (oEvent) {
			var sEventId = oEvent.getParameter("arguments").requestId;
			console.log("📋 Details page - Loading workflow:", sEventId);
			if (sEventId) {
				this._loadEventData(sEventId);
			}
		},
		formatter: {
			formatEpochDate: function (sValue) {
				if (!sValue) return "";
				const match = sValue.match(/\d+/);
				if (!match) return "";
				return new Date(parseInt(match[0], 10)).toISOString().slice(0, 10); // yyyy-MM-dd
			},

			formatISOTime: function (sValue) {
				if (!sValue) return "";
				return sValue.replace("PT", "").replace("H", ":").replace("M", ":").replace("S", "");
			},

			formatDateTime: function (sDate, sTime) {
				if (!sDate || !sTime) return "";
				const dateMatch = sDate.match(/\d+/);
				if (!dateMatch) return "";
				const formattedDate = new Date(parseInt(dateMatch[0], 10)).toISOString().slice(0, 10);
				const formattedTime = sTime.substring(0, 2) + ":" + sTime.substring(2, 4) + ":" + sTime.substring(4, 6);
				return formattedDate + " " + formattedTime;
			}
		},

		_loadEventData: function (sEventId) {
			var that = this;

			console.log("  → Step 1: Fetching WorkflowLog for ID:", sEventId);

			// Step 1: Get WorkflowLog by ID
			WorkflowReportService.getWorkflowLogById(sEventId)
				.then(function (workflowLogData) {
					console.log("  ✅ WorkflowLog data received:", workflowLogData);
					// Optional: Set the WorkflowLog data in a model if needed
					that.getView().setModel(new JSONModel(workflowLogData), "workflowLogModel");
					var trainingTypeId = workflowLogData.TRAINING_TYPE_ID;

					// Step 2: Check if this is a Business Event type (TRAINING_TYPE === "12")
					var isBusinessEvent = workflowLogData.TRAINING_TYPE_ID === "12";

					// If it is a business event, load the businessEventModel first
					var businessEventPromise = Promise.resolve();
					if (isBusinessEvent) {
						businessEventPromise = WorkflowReportService.getEventById(workflowLogData.REQUEST_ID)
							.then(function (eventData) {
								var oBusinessEventModel = new JSONModel({
									eventDetails: eventData.eventDetails,
									attachments: Array.isArray(eventData.attachments) ? eventData.attachments : [eventData.attachments]
								});
								that.getView().setModel(oBusinessEventModel, "businessEventModel");
							});
					}

					// Step 3: After handling the business event (if needed), get workflow request details
					return businessEventPromise.then(function () {
						return WorkflowReportService.getRequestDetailsById(sEventId)
							.then(function (oData) {
								var oModel = new JSONModel(oData);
								that.getView().setModel(oModel, "workflowReportModel");

								// Set tab visibility based on available data
								var oTabVisibility = {
									showWorkflowLogInfoTab: trainingTypeId === "11",
									showInfoTab: trainingTypeId !== "11" && trainingTypeId !== "12",
									showBusinessEventTab: trainingTypeId === "12",
									showCurrentApproverList: !!(oData.currentApproverList && oData.currentApproverList.length > 0),
									showApproverList: !!(oData.approverList && oData.approverList.length > 0),
									showApproverCommentList: !!(oData.ApproverCommentList && oData.ApproverCommentList.length > 0)
								};

								that.getView().setModel(new JSONModel(oTabVisibility), "tabVisibility");
							});
					});
				})
				.catch(function (oError) {
					sap.m.MessageToast.show("Event data could not be retrieved.");
					console.error("Error retrieving event data:", oError);
				});
		}

	});

});