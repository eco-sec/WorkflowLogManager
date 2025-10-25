sap.ui.define([
	"sap/ui/model/json/JSONModel"
], function (JSONModel) {
	"use strict";

	var WorkflowReportService = {

		// Service URL
		_sServiceUrl: "/lmsproject/hana/xsjs",
		_sServiceOdataUrl: "/lmsproject/hana/xsodata",
		_sCPIUrl: "/cpi",
		// Specific service URL for fetching an event by ID

		// Username and password

		/**
		 * Encodes the username and password in base64 format for basic authentication.
		 * @returns {string} Base64 encoded authorization header value.
		 */
		// _getAuthorizationHeader: function() {
		//     var sToken = btoa(this._username + ":" + this._password);
		//     return "Basic " + sToken;
		// },

		/**
		 * Fetches the business events data from the backend with basic authentication.
		 * @returns {Promise} A promise that resolves with the model data.
		 */
		fetchEvents: function () {
			return new Promise((resolve, reject) => {
				var sServiceUrl = this._sServiceOdataUrl + "/WorkflowReportService.xsodata/WorkflowLog?$format=json";
				var oModel = new sap.ui.model.json.JSONModel();

				oModel.loadData(sServiceUrl, null, true, "GET", false, false, {
					"Content-Type": "application/json"
				});

				oModel.attachRequestCompleted((oEvent) => {
					if (oModel.getData()) {
						resolve(oModel.getData().d.results); // Adjusted to handle OData response format
					} else {
						reject(new Error("Failed to load data from the service."));
					}
				});

				oModel.attachRequestFailed(() => {
					reject(new Error("Data request to the service failed."));
				});
			});
		},

		/**
		 * Fetches a single event by its ID.
		 * @param {string} sEventId - The ID of the event to retrieve.
		 * @returns {Promise} A promise that resolves with the event data.
		 */
		getRequestDetailsById: function (sId) {
			return new Promise((resolve, reject) => {
				var sUrl = this._sCPIUrl + "/lms/instance-work-items" + "?taskId=" + encodeURIComponent(sId);

				var oModel = new JSONModel();
				oModel.loadData(sUrl, "", true, "GET", false, false, {
					// "Authorization": this._getAuthorizationHeader(),
					"Content-Type": "application/json"
				});
				oModel.attachRequestCompleted(function () {
					if (oModel.getData()) {
						resolve(oModel.getData());
					} else {
						reject(new Error("Failed to load event data."));
					}
				});
				oModel.attachRequestFailed(function () {
					reject(new Error("Request failed to load event data."));
				});
			});
		},

		_fetchXcsrfToken: function () {
			var token = "";;
			$.ajax({
				type: 'GET',
				url: this._sServiceUrl + "/WorkflowReportsService.xsjs",
				async: false,
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					"X-Content-Type-Options": "nosniff",
					"X-Frame-Options": "SAMEORIGIN",
					"X-XSS-Protection": "0; mode=block"
				},
				beforeSend: function (requestGET) {
					requestGET.setRequestHeader("X-CSRF-Token", "Fetch");
				},
				success: function (data, textStatus, requestGET) {
					token = requestGET.getResponseHeader("X-CSRF-Token");
					callBackFx(token, data);
				},
				error: function (requestGET) {
					token = requestGET.getResponseHeader("X-CSRF-Token");
				}
			});

		},

		/**
		 * Fetches a single event by its ID.
		 * @param {string} sEventId - The ID of the event to retrieve.
		 * @returns {Promise} A promise that resolves with the event data.
		 */
		getEventById: function (sEventId) {
			return new Promise((resolve, reject) => {
				var sUrl = this._sServiceUrl + "/GetEventById.xsjs" + "?id=" + encodeURIComponent(sEventId);

				var oModel = new JSONModel();
				oModel.loadData(sUrl, "", true, "GET", false, false, {
					// "Authorization": this._getAuthorizationHeader(),
					"Content-Type": "application/json"
				});
				oModel.attachRequestCompleted(function () {
					if (oModel.getData()) {
						resolve(oModel.getData());
					} else {
						reject(new Error("Failed to load event data."));
					}
				});
				oModel.attachRequestFailed(function () {
					reject(new Error("Request failed to load event data."));
				});
			});
		},
		/**
		 * Fetches a single WorkflowLog by WORKFLOW_ID using $filter.
		 * @param {string} sWorkflowId - The WORKFLOW_ID to filter by.
		 * @returns {Promise} A promise that resolves with the first matching WorkflowLog entry.
		 */
		getWorkflowLogById: function (sWorkflowId) {
			return new Promise(function (resolve, reject) {
				var sUrl = WorkflowReportService._sServiceOdataUrl +
					"/WorkflowReportService.xsodata/WorkflowLog?$format=json&$filter=WORKFLOW_INSTANCE_ID eq '" +
					encodeURIComponent(sWorkflowId) + "'";

				var oModel = new JSONModel();
				oModel.loadData(sUrl, null, true, "GET", false, false, {
					"Content-Type": "application/json"
				});

				oModel.attachRequestCompleted(function () {
					var oData = oModel.getData();
					if (oData && oData.d && oData.d.results && oData.d.results.length > 0) {
						resolve(oData.d.results[0]); // Return the first matched result
					} else {
						reject(new Error("No WorkflowLog found with WORKFLOW_ID: " + sWorkflowId));
					}
				});

				oModel.attachRequestFailed(function () {
					reject(new Error("Failed to fetch WorkflowLog for WORKFLOW_ID: " + sWorkflowId));
				});
			});
		},

		createWorkflowReport: function (oEventData) {
			return new Promise((resolve, reject) => {
				var oModel = new JSONModel();
				oModel.loadData(this._sCPIUrl + "/workflowReport/create", JSON.stringify(oEventData), true, "POST", false, false, {
					"Content-Type": "application/json"
				});
				oModel.attachRequestCompleted((oEvent) => {
					if (oModel.getData()) {;
						resolve(oModel.getData());
					} else {

						reject(new Error("Failed to create business event."));
					}
				});
				oModel.attachRequestFailed(() => {

					reject(new Error("Business event creation failed."));
				});
			});
		}

	};

	return WorkflowReportService;
});