sap.ui.define([
    "sap/ui/model/json/JSONModel"
], function (JSONModel) {
    "use strict";

    var PicklistService = {
        // Service URL
        _sServiceUrl: "/lmsproject/hana/xsjs/PicklistService.xsjs",

        // Username and password
 

        /**
         * Encodes the username and password in base64 format for basic authentication.
         * @returns {string} Base64 encoded authorization header value.
        //  */
        // _getAuthorizationHeader: function() {
        //     var sToken = btoa(this._username + ":" + this._password);
        //     return "Basic " + sToken;
        // },

        /**
         * Fetches all picklist data (classifications, cities, locations, event types) from the backend with basic authentication.
         * @returns {Promise} A promise that resolves with all picklist data.
         */
        fetchAllPicklists: function() {
            return new Promise((resolve, reject) => {
                var oModel = new JSONModel();
                oModel.loadData(this._sServiceUrl, "", true, "GET", false, false, {
                    // "Authorization": this._getAuthorizationHeader(),
                    "Content-Type": "application/json"
                });
                oModel.attachRequestCompleted((oEvent) => {
                    if (oModel.getData()) {
                        resolve(oModel.getData());
                    } else {
                        reject(new Error("Failed to load picklist data from the service."));
                    }
                });
                oModel.attachRequestFailed(() => {
                    reject(new Error("Picklist data request to the service failed."));
                });
            });
        }
    };

    return PicklistService;
});
