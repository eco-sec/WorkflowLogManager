/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"managerlms/MangerLMSReport/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});