sap.ui.define([
	"sap/ui/model/json/JSONModel"
], function (JSONModel) {
	"use strict";

	var EmployeeService = {

		// Service URL
		_sServiceUrl: "/cpidev",

		/**
		 * Fetches a single employee by their ID.
		 * @param {string} sEmployeeId - The ID of the employee to retrieve.
		 * @returns {Promise} A promise that resolves with the employee data.
		 */
		getEmployeeById: function (sEmployeeId) {
			return new Promise((resolve, reject) => {
				var sUrl = this._sServiceUrl + "/employee/details?employeeId=" + encodeURIComponent(sEmployeeId);

				var oModel = new JSONModel();
				oModel.loadData(sUrl, "", true, "GET", false, false, {
					"Content-Type": "application/json"
				});
				oModel.attachRequestCompleted(function () {
					if (oModel.getData()) {
						resolve(oModel.getData());
					} else {
						reject(new Error("Failed to load employee data."));
					}
				});
				oModel.attachRequestFailed(function () {
					reject(new Error("Request failed to load employee data."));
				});
			});
		},

		/**
		 * Fetches subordinates of a given employee.
		 * @param {string} sEmployeeId - The ID of the employee whose subordinates to retrieve.
		 * @returns {Promise} A promise that resolves with the subordinates data.
		 */
		getSubordinates: function (sEmployeeId) {
			return new Promise((resolve, reject) => {
				var sUrl = this._sServiceUrl + "/employee/getSubordinate?employeeId=" + encodeURIComponent(sEmployeeId);

				jQuery.ajax({
					url: sUrl,
					method: "GET",
					timeout: 60000, // Timeout in milliseconds (60000 ms = 60 seconds)
					headers: {
						"Content-Type": "application/json"
					},
					success: function (data) {
						resolve(data);
					},
					error: function (xhr, status, error) {
						reject(new Error("Request failed: " + status + " - " + error));
					}
				});
			});
		}
	};

	return EmployeeService;
});
