'use strict';

export const options = {
	"notification_support": {
		"type": "checkbox",
		"value": true
	},
	/*			Theme			*/
	"theme": {
		"type": "menulist",
		"value": "dark",
		"sync": true
	},
	"background_color": {
		"type": "color",
		"value": "#000000",
		"sync": true
	},
	/*		    NewTab			*/
	"newTabStylesheet": {
		"type": "text",
		"value": "",
		"sync": true
	},
	"newTab_folders": {
		"type": "json",
		"value": ['Speed Dial'],
		"sync": true
	},
	/*		    Panel			*/
	"panelAlwaysShowMoveInNewWindow": {
		"type": "checkbox",
		"value": false,
		"sync": true
	},
};
