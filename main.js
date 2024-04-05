"use strict";

/*
 * Created with @iobroker/create-adapter v2.4.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const axios = require("axios").default;

// Load your modules here, e.g.:
// const fs = require("fs");

class GoogleHomeNest extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "google-home-nest",
		});

		// Register Google API-Client
		this.googleApiClient = null;

		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize the adapter here
		// Reset the connection indicator during startup (to 'false')
		this.setState("info.connection", false, true);

		// Create objects to store "Connection Authentication" values
		await this.setObjectNotExistsAsync("info.connection-authentication.clientID", {
			type: "state",
			common: {
				name: "Client-ID",
				type: "string",
				role: "indicator",
				write: false,
				read: true,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync("info.connection-authentication.projectID", {
			type: "state",
			common: {
				name: "Project-ID",
				type: "string",
				role: "indicator",
				write: false,
				read: true,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync("info.connection-authentication.clientSecret", {
			type: "state",
			common: {
				name: "Client Secret",
				type: "string",
				role: "indicator",
				write: false,
				read: true,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync("info.connection-authentication.authorizationCode", {
			type: "state",
			common: {
				name: "Authorization Code",
				type: "string",
				role: "indicator",
				write: false,
				read: true,
			},
			native: {},
		});

		await this.setObjectNotExistsAsync("info.connection-authentication.accessToken", {
			type: "state",
			common: {
				name: "Access-Token",
				type: "string",
				role: "indicator",
				write: false,
				read: true,
			},
			native: {},
		});

		await this.setObjectNotExistsAsync("info.connection-authentication.refreshToken", {
			type: "state",
			common: {
				name: "Refresh-Token",
				type: "string",
				role: "indicator",
				write: false,
				read: true,
			},
			native: {},
		});

		// Set "Connection Authentication" values to the objects
		await this.setStateAsync("info.connection-authentication.clientID", {
			val: this.config.clientID,
			ack: true,
		});

		await this.setStateAsync("info.connection-authentication.projectID", {
			val: this.config.projectID,
			ack: true,
		});

		await this.setStateAsync("info.connection-authentication.clientSecret", {
			val: this.config.clientSecret,
			ack: true,
		});

		await this.setStateAsync("info.connection-authentication.authorizationCode", {
			val: this.config.authorizationCode,
			ack: true,
		});

		// SAMPLE CODE - For setting states with 'expire', 'comment' and 'quality'
		/*
		this.setState("info.connection-authentication.clientID", {
			val: this.config.clientID,
			ack: true,
			expire: 20,
			c: "Test comment",
			q: 1,
		});
		*/

		// Get states into variables
		const clientID = await this.getStateAsync("info.connection-authentication.clientID");
		const projectID = await this.getStateAsync("info.connection-authentication.projectID");
		const clientSecret = await this.getStateAsync("info.connection-authentication.clientSecret");
		const authorizationCode = await this.getStateAsync("info.connection-authentication.authorizationCode");

		// Log
		if (
			clientID?.val != null &&
			clientID?.val != "" &&
			projectID?.val != null &&
			projectID?.val != "" &&
			clientSecret?.val != null &&
			clientSecret?.val != ""
		) {
			this.log.debug(`Connection Authentication: Client-ID: ${clientID?.val}`);
			this.log.debug(`Connection Authentication: Project-ID: ${projectID?.val}`);
			this.log.debug(`Connection Authentication: Client Secret: ${clientSecret?.val}`);
			if (authorizationCode?.val != null && authorizationCode?.val != "") {
				this.log.debug(`Connection Authentication: Authorization Code: ${authorizationCode?.val}`);
			} else {
				this.log.error(
					`Connection Authentication: Authorization Code: NOT YET SET! Please link account first (using 'Client-ID', 'Project-ID' & 'Client Secret') in order to acquire an 'Authorization Code' and paste the code into the designated textfield. Restart the adapter afterwards.`,
				);
			}
		} else {
			this.log.error(
				`Connection Authentication: NOT ALL REQUIRED VALUES SET! Please enter 'Client-ID', 'Project-ID' & 'Client Secret' and link account in order to acquire an 'Authorization Code'. Paste the code into the designated textfield afterwards and restart the adapter.`,
			);
		}

		// If we have an 'Authorization Code' --> Try to acquire an 'Access Token'
		if (authorizationCode?.val != null && authorizationCode?.val != "") {
			// Log
			this.log.info(`Trying to acquire 'Access Token'...`);
			// Try to acquire 'Access Token'
			let acquireAccessTokenResponse = null;

			try {
				const acquireAccessTokenURL = `https://www.googleapis.com/oauth2/v4/token?client_id=${clientID?.val}&client_secret=${clientSecret?.val}&code=${authorizationCode?.val}&grant_type=authorization_code&redirect_uri=http://localhost:8083/google-home-nest/get_authorization_code.html`;
				this.log.silly(`Accuire 'Access Token' URL: ${acquireAccessTokenURL}`);
				acquireAccessTokenResponse = await axios.post(acquireAccessTokenURL);

				this.log.silly(
					`Google API - Acquire 'Access Token' response: ${
						acquireAccessTokenResponse.status
					}: ${JSON.stringify(acquireAccessTokenResponse.data)}`,
				);
			} catch (err) {
				// Log
				this.log.error(`ERROR while acquiring 'Access Token': ${err.code}`);

				// Set connection status (to 'false')
				this.setState("info.connection", false, true);
			}

			if (acquireAccessTokenResponse.data != null && acquireAccessTokenResponse.data != ``) {
				let accessToken = null;
				let accessToken_expiresIn = null;
				let refreshToken = null;

				const jsonObject = JSON.parse(JSON.stringify(acquireAccessTokenResponse.data));

				accessToken = jsonObject.access_token;
				accessToken_expiresIn = jsonObject.expires_in - 10;
				refreshToken = jsonObject.refresh_token;

				this.log.debug(`Connection Authentication: Access-Token: ${accessToken}`);
				this.log.debug(`Connection Authentication: Access-Token - Expires in: ${accessToken_expiresIn}`);
				this.log.debug(`Connection Authentication: Refresh-Token: ${refreshToken}`);

				await this.setStateAsync("info.connection-authentication.accessToken", {
					val: accessToken,
					ack: true,
					expire: accessToken_expiresIn,
				});

				await this.setStateAsync("info.connection-authentication.refreshToken", {
					val: accessToken,
					ack: true,
					expire: accessToken_expiresIn,
				});
			}
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new GoogleHomeNest(options);
} else {
	// otherwise start the instance directly
	new GoogleHomeNest();
}
