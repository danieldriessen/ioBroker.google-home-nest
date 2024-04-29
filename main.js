"use strict";

/***********************************************************************************************************************************************************************************
 Created with @iobroker/create-adapter v2.4.0

	Developed by: Daniel Drießen @ DDProductions

	Development reference documentations:
		Google Device Access - API-Manual: https://developers.google.com/nest/device-access/registration?hl=de
		Google Device Access - Smart Device Management API (incl. Device capability descriptions): https://developers.google.com/nest/device-access/api?hl=de
		Google Cloud Documentation - Create Pub/Sub Subscriptions: https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions/create
		Google Cloud Documentation - Pull Pub/Sub Messages/Events: https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions/pull
 ***********************************************************************************************************************************************************************************/

const utils = require("@iobroker/adapter-core");
const http = require("http");
const axios = require("axios").default;
const os = require("os");

let userDefined_dateFormat = null;

class GoogleHomeNest extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "google-home-nest",
		});

		// Hardcoded values
		this.maxMillisecondIntervalForStoringEvents = 15000;
		this.resetEventAfterXSecondsInterval = 5;
		this.pullGooglePubSubMessagesFirstRetryTimeoutValue = 5000;
		this.pullGooglePubSubMessagesSecondRetryTimeoutValue = 10000;
		this.pullGooglePubSubMessagesThirdRetryTimeoutValue = 30000;

		// Define ioBroker object IDs, names & descriptions:
		this.ioBrokerObjectID_folder_authenticationValues = "info.authentication-values";
		this.ioBrokerObjectName_folder_authenticationValues = "Authentication values";
		this.ioBrokerObjectID_state_clientID = this.ioBrokerObjectID_folder_authenticationValues + "." + "clientID";
		this.ioBrokerObjectName_state_clientID = "Client-ID";
		this.ioBrokerObjectID_state_projectID = this.ioBrokerObjectID_folder_authenticationValues + "." + "projectID";
		this.ioBrokerObjectName_state_projectID = "Project-ID";
		this.ioBrokerObjectID_state_clientSecret = this.ioBrokerObjectID_folder_authenticationValues + "." + "clientSecret";
		this.ioBrokerObjectName_state_clientSecret = "Client Secret";
		this.ioBrokerObjectID_state_authorizationCode = this.ioBrokerObjectID_folder_authenticationValues + "." + "authorizationCode";
		this.ioBrokerObjectName_state_authorizationCode = "Authorization Code";
		this.ioBrokerObjectID_state_accessToken = this.ioBrokerObjectID_folder_authenticationValues + "." + "accessToken";
		this.ioBrokerObjectName_state_accessToken = "Access-Token";
		this.ioBrokerObjectID_state_refreshToken = this.ioBrokerObjectID_folder_authenticationValues + "." + "refreshToken";
		this.ioBrokerObjectName_state_refreshToken = "Refresh-Token";
		this.ioBrokerObjectID_state_pubSubTopic = this.ioBrokerObjectID_folder_authenticationValues + "." + "pubSubTopic";
		this.ioBrokerObjectName_state_pubSubTopic = "Pub-Sub Topic";
		this.ioBrokerObjectID_folder_devices = "devices";
		this.ioBrokerObjectName_folder_devices = "Devices";
		this.ioBrokerObjectID_state_googleCloudProjectID = this.ioBrokerObjectID_folder_authenticationValues + "." + "googleCloud-projectID";
		this.ioBrokerObjectName_state_googleCloudProjectID = "Google Cloud - Project-ID";

		// Define globale authentication variables
		this.clientID = null;
		this.projectID = null;
		this.clientSecret = null;
		this.authorizationCode = null;
		this.accessToken = null;
		this.refreshToken = null;
		this.pubSubTopic = null;
		this.googleCloudProjectID = null;

		// Define HTTP-Server
		this.httpServer = null;

		// Define variables for system conditions
		this.pullingEventMessagesEnabled = null;
		this.pullEventMessagesRetryCount = null;

		// Define Timeouts
		this.refreshAccessTokenTimeout = null;
		this.pullGooglePubSubMessagesTimeout = null;

		// Define variable for monitored states
		this.monitoredEventStates = [];

		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**************************************************************************************************************************************
	 * This function is called when the adapter is ready
	 * (if databases are connected and the adapter has received configuration).
	 * It is also called once the 'storeReceivedAuthorizationCode' function has successfully stored the received 'Authorization Code'.
	 *
	 * It performs initialization tasks when the adapter is ready.
	 *
	 * This function ensures the adapter is properly initialized, sets initial object states,
	 * retrieves user-defined authentication values, creates an 'HTTP-Server', and checks for
	 * missing authentication values.
	 * It also checks for the presence of the 'Authorization Code'
	 * and attempts to acquire an 'Access Token' if available.
	 * If connected, it fetches the device list,
	 * creates device objects and states, and subscribes to Google Pub/Sub if events are enabled.
	 *
	 * @returns {Promise<void>} A promise indicating the completion of initialization tasks.
	 **************************************************************************************************************************************/
	async onReady() {
		// INITIALIZING THE ADAPTER

		// Reset the connection indicator during startup (to 'false')
		this.setState("info.connection", false, true);

		// Get the user defined date format
		// and store it to the designated global (outside of this class available) variable.
		await this.getForeignObjectAsync("system.config")
			.then((result) => {
				if (result?.common.dateFormat) {
					const dateFormat = result.common.dateFormat;
					if (dateFormat == "DD.MM.YYYY" || dateFormat == "YYYY.MM.DD" || dateFormat == "MM/DD/YYYY") {
						userDefined_dateFormat = dateFormat;
					} else {
						userDefined_dateFormat = "MM/DD/YYYY";
					}
				} else {
					userDefined_dateFormat = "MM/DD/YYYY";
				}
			})
			.catch(() => {
				userDefined_dateFormat = "MM/DD/YYYY";
			});

		// Create the initial objects (if they don't already exist).
		try {
			await this.createInitialObjectsIfNecessary();
		} catch (error) {
			//this.log.warn(`WARNING: Adapter stopped due to error!`);
			//this.terminate(`WARNING: Adapter stopped due to error!`);
			return;
		}

		// Set the initial object states.
		try {
			await this.setInitialObjectStates();
		} catch (error) {
			//this.log.warn(`WARNING: Adapter stopped due to error!`);
			//this.terminate(`WARNING: Adapter stopped due to error!`);
			return;
		}

		// Get user defined authentication values from the states into the global authentication variables
		await this.updateGlobalAuthenticationVariables();

		// Create HTTP-Server in order to listen to incoming messages.
		try {
			await this.createHTTPserver();
		} catch (error) {
			//this.log.warn(`WARNING: Adapter stopped due to error!`);
			//this.terminate(`WARNING: Adapter stopped due to error!`);
			return;
		}

		// Check if any of the values required for the authentication are missing.
		try {
			await this.checkForMissingValuesRequiredForAuthentication();
		} catch (error) {
			//this.log.warn(`WARNING: Adapter stopped due to error!`);
			//this.terminate(`WARNING: Adapter stopped due to error!`);
			return;
		}

		// Check if the 'Authorization Code' is already set
		this.log.debug(`Checking for acquired 'Authorization-Code'...`);
		let authorizationCodeAvailable = false;
		if (this.authorizationCode) {
			authorizationCodeAvailable = true;
			this.log.debug(`'Authorization-Code' already acquired and available.`);
		} else {
			const errorMessage = `ERROR: Authentication Values: NOT ALL REQUIRED VALUES SET! 'Authorization-Code' not yet acquired! Please click the 'Authenticate' button in the admin panel in order to acquire an 'Authorization-Code'.`;
			this.log.error(errorMessage);
		}

		// If we have an 'Authorization Code' we can continue to...
		// log the 'Authentication Values' & the 'Authorization Code' and
		// afterwards try to acquire an 'Access Token'.
		if (authorizationCodeAvailable) {
			this.log.debug(`Authentication Value: Client-ID: ${this.clientID}`);
			this.log.debug(`Authentication Value: Project-ID: ${this.projectID}`);
			this.log.debug(`Authentication Value: Client Secret: ${this.clientSecret}`);
			this.log.debug(`Authentication Value: Authorization Code: ${this.authorizationCode}`);

			// If we have an 'Authorization Code' --> try to acquire an 'Access Token'
			try {
				await this.acquireAccessToken();

				// Set the connection indicator to 'true'
				await this.setStateAsync("info.connection", true, true);
			} catch (error) {
				//this.log.warn(`WARNING: Adapter stopped due to error!`);
				//this.terminate(`WARNING: Adapter stopped due to error!`);
				return;
			}

			// If we are connected now we can start acquiring/fetching the device list and storing the devices and their values.
			// IMPORTANT: According to the Google documentation, the initial authentication process isn't completed until the first fetch of the device list
			// (which should occur immediately after the initial 'Access Token' fetch.)
			if (await this.getStateAsync("info.connection")) {
				// Acquire the 'Device List' as a JSON string.
				let deviceListJSONstring = null;
				try {
					deviceListJSONstring = await this.acquireDeviceListAsJSONstring();
				} catch (error) {
					//this.log.warn(`WARNING: Adapter stopped due to error!`);
					//this.terminate(`WARNING: Adapter stopped due to error!`);
					return;
				}

				// Delete all stored devices.
				try {
					await this.deleteAllStoredDevices();
				} catch (error) {
					//this.log.warn(`WARNING: Adapter stopped due to error!`);
					//this.terminate(`WARNING: Adapter stopped due to error!`);
					return;
				}

				// Create device objects and states from the acquired/fetched JSON device list.
				try {
					await this.createDeviceObjectsAndStatesFromJSONDeviceListString(deviceListJSONstring);
				} catch {
					//this.log.warn(`WARNING: Adapter stopped due to error!`);
					//this.terminate(`WARNING: Adapter stopped due to error!`);
					return;
				}

				// If the 'Google Cloud - Project ID' is set on the admin panel & 'Events' are enabled,
				// create the object structure for 'Events' for each device.
				if (this.googleCloudProjectID && this.config.eventsEnabled) {
					try {
						await this.createObjectStructureForEventsForEachDevice();
					} catch (error) {
						// Nothing to do here.
						// If something went wrong here and the object structure for a device or parts of the object structure for a device
						// could not be created we don't want to terminate the Adapter here.
						// The error have been logged already and once 'Events' start to come in and can't be stored we will log errors again.
					}

					// Check for the selected 'Events Acquisition Method' and either start to fetch event messages or start listening to incoming event messages.
					// IMPORTANT: Currently only the 'PULL' acquisition method is implemented!
					if (this.config.eventsAcquisitionMethod == "PULL") {
						// Set the 'Pulling Event Messages' functionality to 'enabled'
						this.pullingEventMessagesEnabled = true;

						// Calculate and store the 'Pub/Sub Topic'.
						let pubSubTopicCalculatedAndStored = false;
						try {
							await this.calculateAndStorePubSubTopic();
							pubSubTopicCalculatedAndStored = true;
						} catch (error) {
							this.log.error(error.message);
							// TODO: Do something here
						}

						// Subscribe to Google's 'Pub/Sub System' with a 'PULL' subscription.
						let subscriptionToGooglePubSubSystemAvailable = false;
						if (pubSubTopicCalculatedAndStored) {
							try {
								await this.subscribeToGooglePubSubSystemWithAPullSubscription();
								subscriptionToGooglePubSubSystemAvailable = true;
							} catch (error) {
								this.log.error(error.message);
								// TODO: Maybe add a retry here, too.
							}
						}

						// Complete the subscription by fetching and listing Google 'Pub/Sub' devices once.
						// Then start pulling Google 'Pub/Sub' messages.
						if (subscriptionToGooglePubSubSystemAvailable) {
							try {
								await this.listGooglePubSubDevices();
							} catch (error) {
								this.log.error(error.message);
								// TODO: Maybe add a retry here, too.
							}

							// Start pulling Google 'Pub/Sub' messages.
							try {
								await this.startPullingGooglePubSubMessages();
							} catch (error) {
								this.log.error(error.message);
								//this.log.warn(`WARNING: Adapter stopped due to error!`);
								//this.terminate(`WARNING: Adapter stopped due to error!`);
								return;
							}
						}
					} else if (this.config.eventsAcquisitionMethod == "PUSH") {
						// Set the 'Pulling Event Messages' functionality to 'disabled'
						this.pullingEventMessagesEnabled = false;

						// TODO: IMPLEMENT THIS!
					}
				}
			}
		}
	}

	/**************************************************************************************************************************************
	 * Updates the global authentication variables of this class with the current values from the object states.
	 *
	 * Currently this function retrieves the latest values for the following object states:
	 * - 'clientID'
	 * - 'projectID'
	 * - 'clientSecret'
	 * - 'authorizationCode'
	 * - 'accessToken'
	 * - 'refreshToken'
	 * - 'pubSubTopic'
	 * - 'googleCloud-projectID'
	 *
	 * IMPORTANT:
	 * This function should be awaited by all methods that utilize any of the above-mentioned global authentication variables
	 * before executing any code that depends on them.
	 *
	 * @returns {Promise<void>} A promise indicating the completion of updating global authentication variables.
	 **************************************************************************************************************************************/
	async updateGlobalAuthenticationVariables() {
		const clientID_state = await this.getStateAsync(this.ioBrokerObjectID_state_clientID);
		this.clientID = clientID_state?.val;

		const projectID_state = await this.getStateAsync(this.ioBrokerObjectID_state_projectID);
		this.projectID = projectID_state?.val;

		const clientSecret_state = await this.getStateAsync(this.ioBrokerObjectID_state_clientSecret);
		this.clientSecret = clientSecret_state?.val;

		const authorizationCode_state = await this.getStateAsync(this.ioBrokerObjectID_state_authorizationCode);
		this.authorizationCode = authorizationCode_state?.val;

		const accessToken_state = await this.getStateAsync(this.ioBrokerObjectID_state_accessToken);
		this.accessToken = accessToken_state?.val;

		const refreshToken_state = await this.getStateAsync(this.ioBrokerObjectID_state_refreshToken);
		this.refreshToken = refreshToken_state?.val;

		const pubSubTopic_state = await this.getStateAsync(this.ioBrokerObjectID_state_pubSubTopic);
		this.pubSubTopic = pubSubTopic_state?.val;

		const googleCloudProjectID_state = await this.getStateAsync(this.ioBrokerObjectID_state_googleCloudProjectID);
		this.googleCloudProjectID = googleCloudProjectID_state?.val;
	}

	/**************************************************************************************************************************************
	 * Creates initial objects such as folder and state objects if they don't exist already.
	 *
	 * @returns {Promise<void>} A promise indicating the completion of creating initial objects.
	 * @throws {Error} Throws an error if there's an issue while creating any of the initial objects.
	 **************************************************************************************************************************************/
	async createInitialObjectsIfNecessary() {
		this.log.debug(`Creating initial objects...`);

		// Create the folder object 'authentication-values' (within the folder object 'info').
		this.log.debug(`Creating folder object '${this.ioBrokerObjectID_folder_authenticationValues}'...`);

		await this.setObjectNotExistsAsync(this.ioBrokerObjectID_folder_authenticationValues, {
			type: "folder",
			common: {
				name: this.ioBrokerObjectName_folder_authenticationValues,
			},
			native: {},
		})
			.then(() => {
				this.log.debug(`Successfully created folder object '${this.ioBrokerObjectID_folder_authenticationValues}'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while creating folder object '${this.ioBrokerObjectID_folder_authenticationValues}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		// Create the state objects for 'clientID', 'projectID', 'clientSecret', 'authorizationCode', 'accessToken', 'refreshToken', 'pubSubTopic' & 'googleCloud-projectID' (within the folder 'info.authentication-values')
		this.log.debug(`Creating state object '${this.ioBrokerObjectID_state_clientID}'...`);
		await this.setObjectNotExistsAsync(this.ioBrokerObjectID_state_clientID, {
			type: "state",
			common: {
				name: this.ioBrokerObjectName_state_clientID,
				type: "string",
				role: "value",
				write: false,
				read: true,
			},
			native: {},
		})
			.then(() => {
				this.log.debug(`Successfully created state object '${this.ioBrokerObjectID_state_clientID}'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while creating state object '${this.ioBrokerObjectID_state_clientID}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Creating state object '${this.ioBrokerObjectID_state_projectID}'...`);
		await this.setObjectNotExistsAsync(this.ioBrokerObjectID_state_projectID, {
			type: "state",
			common: {
				name: this.ioBrokerObjectName_state_projectID,
				type: "string",
				role: "value",
				write: false,
				read: true,
			},
			native: {},
		})
			.then(() => {
				this.log.debug(`Successfully created state object '${this.ioBrokerObjectID_state_projectID}'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while creating state object '${this.ioBrokerObjectID_state_projectID}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Creating state object '${this.ioBrokerObjectID_state_clientSecret}'...`);
		await this.setObjectNotExistsAsync(this.ioBrokerObjectID_state_clientSecret, {
			type: "state",
			common: {
				name: this.ioBrokerObjectName_state_clientSecret,
				type: "string",
				role: "value",
				write: false,
				read: true,
			},
			native: {},
		})
			.then(() => {
				this.log.debug(`Successfully created state object '${this.ioBrokerObjectID_state_clientSecret}'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while creating state object '${this.ioBrokerObjectID_state_clientSecret}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Creating state object '${this.ioBrokerObjectID_state_authorizationCode}'...`);
		await this.setObjectNotExistsAsync(this.ioBrokerObjectID_state_authorizationCode, {
			type: "state",
			common: {
				name: this.ioBrokerObjectName_state_authorizationCode,
				type: "string",
				role: "value",
				write: false,
				read: true,
			},
			native: {},
		})
			.then(() => {
				this.log.debug(`Successfully created state object '${this.ioBrokerObjectID_state_authorizationCode}'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while creating state object '${this.ioBrokerObjectID_state_authorizationCode}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Creating state object '${this.ioBrokerObjectID_state_accessToken}'...`);
		await this.setObjectNotExistsAsync(this.ioBrokerObjectID_state_accessToken, {
			type: "state",
			common: {
				name: this.ioBrokerObjectName_state_accessToken,
				type: "string",
				role: "value",
				write: false,
				read: true,
			},
			native: {},
		})
			.then(() => {
				this.log.debug(`Successfully created state object '${this.ioBrokerObjectID_state_accessToken}'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while creating state object '${this.ioBrokerObjectID_state_accessToken}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Creating state object '${this.ioBrokerObjectID_state_refreshToken}'...`);
		await this.setObjectNotExistsAsync(this.ioBrokerObjectID_state_refreshToken, {
			type: "state",
			common: {
				name: this.ioBrokerObjectName_state_refreshToken,
				type: "string",
				role: "value",
				write: false,
				read: true,
			},
			native: {},
		})
			.then(() => {
				this.log.debug(`Successfully created state object '${this.ioBrokerObjectID_state_refreshToken}'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while creating state object '${this.ioBrokerObjectID_state_refreshToken}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Creating state object '${this.ioBrokerObjectID_state_pubSubTopic}'...`);
		await this.setObjectNotExistsAsync(this.ioBrokerObjectID_state_pubSubTopic, {
			type: "state",
			common: {
				name: this.ioBrokerObjectName_state_pubSubTopic,
				type: "string",
				role: "value",
				write: false,
				read: true,
			},
			native: {},
		})
			.then(() => {
				this.log.debug(`Successfully created state object '${this.ioBrokerObjectID_state_pubSubTopic}'`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while creating state object '${this.ioBrokerObjectID_state_pubSubTopic}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Creating state object '${this.ioBrokerObjectID_state_googleCloudProjectID}'...`);
		await this.setObjectNotExistsAsync(this.ioBrokerObjectID_state_googleCloudProjectID, {
			type: "state",
			common: {
				name: this.ioBrokerObjectName_state_googleCloudProjectID,
				type: "string",
				role: "value",
				write: false,
				read: true,
			},
			native: {},
		})
			.then(() => {
				this.log.debug(`Successfully created state object '${this.ioBrokerObjectID_state_googleCloudProjectID}'`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while creating state object '${this.ioBrokerObjectID_state_googleCloudProjectID}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Successfully created all initial objects.`);
	}

	/**************************************************************************************************************************************
	 * Sets the initial object states for predefined state objects such as 'clientID', 'projectID', and 'clientSecret'
	 * to the values provided by the user in the admin panel.
	 *
	 * @returns {Promise<void>} A promise indicating the completion of setting initial object states.
	 * @throws {Error} Throws an error if there's an issue while setting any of the object states.
	 **************************************************************************************************************************************/
	async setInitialObjectStates() {
		this.log.debug(`Setting initial object states...`);

		// Set the initial object states for the state objects 'clientID', 'projectID', 'clientSecret' & 'googleCloud-projectID' to the values declared by the user in the admin panel.
		this.log.debug(`Setting object state '${this.ioBrokerObjectID_state_clientID}' to value '${this.config.clientID}'...`);
		await this.setStateAsync(this.ioBrokerObjectID_state_clientID, {
			val: this.config.clientID,
			ack: true,
		})
			.then(() => {
				this.log.debug(`Successfully set object state '${this.ioBrokerObjectID_state_clientID}' to value '${this.config.clientID}'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while setting object state '${this.ioBrokerObjectID_state_clientID}' to value '${this.config.clientID}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Setting object state '${this.ioBrokerObjectID_state_projectID}' to value '${this.config.projectID}'...`);
		await this.setStateAsync(this.ioBrokerObjectID_state_projectID, {
			val: this.config.projectID,
			ack: true,
		})
			.then(() => {
				this.log.debug(`Successfully set object state '${this.ioBrokerObjectID_state_projectID}' to value '${this.config.projectID}'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while setting object state '${this.ioBrokerObjectID_state_projectID}' to value '${this.config.projectID}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Setting object state '${this.ioBrokerObjectID_state_clientSecret}' to value '${this.config.clientSecret}'...`);
		await this.setStateAsync(this.ioBrokerObjectID_state_clientSecret, {
			val: this.config.clientSecret,
			ack: true,
		})
			.then(() => {
				this.log.debug(`Successfully set object state '${this.ioBrokerObjectID_state_clientSecret}' to value '${this.config.clientSecret}'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while setting object state '${this.ioBrokerObjectID_state_clientSecret}' to value '${this.config.clientSecret}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Setting object state '${this.ioBrokerObjectID_state_googleCloudProjectID}' to value '${this.config.googleCloudProjectID}'...`);
		await this.setStateAsync(this.ioBrokerObjectID_state_googleCloudProjectID, {
			val: this.config.googleCloudProjectID,
			ack: true,
		})
			.then(() => {
				this.log.debug(`Successfully set object state '${this.ioBrokerObjectID_state_googleCloudProjectID}' to value '${this.config.googleCloudProjectID}'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while setting object state '${this.ioBrokerObjectID_state_googleCloudProjectID}' to value '${this.config.googleCloudProjectID}'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});

		this.log.debug(`Successfully set all initial object states.`);

		/*****************************************************************************************************************
		 * @example
		 * The following is an example code, describing how to set a state with 'expire', 'comment' & 'quality' values.
		 *
		 * // SAMPLE CODE:
		 * this.setState("info.authentication-values.clientID", {
		 *     val: this.config.clientID,
		 *     ack: true,
		 *     expire: 20,
		 *     comment: "Test comment",
		 *     quality: 1,
		 * });
		 *****************************************************************************************************************/
	}

	/**************************************************************************************************************************************
	 * Creates an 'HTTP-Server' to handle incoming requests.
	 * The server listens on the specified port and processes incoming 'Authorization Codes'.
	 * If an 'Authorization Code' is received, it updates the corresponding state in ioBroker.
	 *
	 * @returns {Promise<http.Server | null>} A promise resolving to the created HTTP server instance if successful, or null if the server
	 *                                        is already running.
	 * @throws {Error} Throws an error if there's an issue during server creation, if required parameters are missing, or if an error occurs
	 *                 during server operation.
	 *
	 * @todo Review for potential optimization.
	 **************************************************************************************************************************************/
	async createHTTPserver() {
		this.log.debug(`Creating HTTP-Server with listening port: ${this.config.httpServerPort}...`);

		if (this.httpServer && this.httpServer.listening) {
			return this.httpServer;
		}

		// Retrieve the port that the HTTP-Server should listen to from the admin panel.
		const PORT = this.config.httpServerPort;

		return new Promise((resolve, reject) => {
			this.httpServer = http.createServer((req, res) => {
				// Extract the 'Authorization Code' from the request URL
				if (req.url) {
					this.log.debug(`HTTP-Server received message.`);

					const urlParts = req.url.split("?");
					const queryParams = new URLSearchParams(urlParts[1]);
					const authorizationCode = queryParams.get("code");

					// Process the 'Authorization Code'
					if (authorizationCode) {
						this.log.debug(`Received authorization code: '${authorizationCode}'`);

						// Update the 'Authorization Code' object state.
						this.storeReceivedAuthorizationCode(authorizationCode)
							.then(() => {
								res.writeHead(200, { "Content-Type": "text/plain" });
								res.end("'Authorization Code' sent to ioBroker successfully. You can close this tab/window now.");
							})
							.catch((error) => {
								// If we cannot store the 'Authorization Code', we will be unable to continue.
								// Therefore, we reject the promise with an Error object containing the error message.
								const errorMessage = `An error occurred while storing the 'Authorization Code': ${error}`;
								this.log.error(errorMessage);

								res.writeHead(500, { "Content-Type": "text/plain" });
								res.end(errorMessage);

								this.log.warn(`WARNING: Adapter stopped due to error: ${errorMessage}`);
								this.terminate(`WARNING: Adapter stopped due to error: ${errorMessage}`);

								// Reject the promise with an Error object containing the error message
								return Promise.reject(new Error(errorMessage));
							});
					} else if (req.url === "/favicon.ico") {
						this.log.debug(`Received HTTP-Server message was favicon.ico request --> ignoring received message.`);
					} else {
						this.log.error(`ERROR: HTTP-Server received malformed message! No 'Authorization Code' found!`);
						this.log.debug(`Called URL: ${req.url}`);

						// Send a response back to the client indicating a bad request
						res.writeHead(400, { "Content-Type": "text/plain" });
						res.end("Bad request: Authorization code not found.");
					}
				} else {
					this.log.error(`ERROR: HTTP-Server received malformed message!`);
				}
			});

			// Event listener for handling server errors
			this.httpServer.on("error", (error) => {
				this.log.error(`ERROR: An error occurred while operating the HTTP-Server: ${error}`);

				// Close the server if an error occurs
				if (this.httpServer) {
					this.httpServer.close(() => {
						this.log.warn("HTTP-Server closed due to error!");
					});
				}

				const errorMessage = `An error occurred while operating the HTTP server: ${error}`;
				reject(new Error(errorMessage)); // Reject the promise with an Error object
			});

			if (this.httpServer) {
				this.httpServer.listen(PORT, () => {
					this.log.info(`HTTP-Server successfully created and running at 'http://localhost:${PORT}/'.`);
					resolve(this.httpServer);
				});
			} else {
				// Handle the case where this.httpServer is null
				const errorMessage = "HTTP server instance is null. Unable to create server.";
				this.log.error(errorMessage);
				reject(new Error(errorMessage));
				return; // Stop further execution
			}
		});
	}

	/**************************************************************************************************************************************
	 * Stores the received 'Authorization Code' in the adapter's state tree.
	 * This function sets the received 'Authorization Code' in the corresponding state object
	 * in the adapter's state tree. Upon successful storage, it triggers the 'onReady' function again
	 * to attempt authentication with the newly received 'Authorization Code'.
	 *
	 * @param {string} authorizationCode - The 'Authorization Code' to be stored.
	 * @returns {Promise<void>} A promise indicating the completion of the 'Authorization Code' storage process.
	 * @throws {Error} Throws an error if there is an issue while storing the 'Authorization Code'.
	 **************************************************************************************************************************************/
	async storeReceivedAuthorizationCode(authorizationCode) {
		this.log.debug(`Storing 'Authorization Code': '${authorizationCode}'...`);
		await this.setStateAsync(this.ioBrokerObjectID_state_authorizationCode, {
			val: authorizationCode,
			ack: true,
		})
			.then(() => {
				this.log.debug(`Storing 'Authorization Code' successful.`);

				// Call "OnReady" function again in order to try to authenticate with the newly received authorization code.
				this.onReady();
			})
			.catch((error) => {
				const errorMessage = `ERROR: Error while storing 'Authorization Code'! Error: ${error}`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});
	}

	/**************************************************************************************************************************************
	 * Checks for missing values required for authentication and throws errors if any are missing.
	 * This function ensures that all required authentication values such as the 'HTTP-Server Port',
	 * the 'Client ID', the 'Project ID', and the 'Client Secret' are set.
	 * If any of these values are missing, it logs an error and throws an error.
	 *
	 * @returns {Promise<void>} A promise indicating the completion of the check for missing values.
	 * @throws {Error} Throws an error if any required authentication value is missing.
	 **************************************************************************************************************************************/
	async checkForMissingValuesRequiredForAuthentication() {
		// Update the global authentication variables first.
		await this.updateGlobalAuthenticationVariables();

		// Check for missing values required for the authentication.
		if (!this.config.httpServerPort || !this.config.httpServerPort.toString()) {
			const errorMessage = `ERROR: HTTP-Server Values: NOT ALL REQUIRED VALUES SET! Please set the 'Port' for the HTTP-Server in the admin panel.`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}

		if (!this.clientID) {
			const errorMessage = `ERROR: Authentication Values: NOT ALL REQUIRED VALUES SET! Please set the 'Client-ID' in the admin panel.`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}

		if (!this.projectID) {
			const errorMessage = `ERROR: Authentication Values: NOT ALL REQUIRED VALUES SET! Please set the 'Project-ID' in the admin panel.`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}

		if (!this.clientSecret) {
			const errorMessage = `ERROR: Authentication Values: NOT ALL REQUIRED VALUES SET! Please set the 'Client-Secret' in the admin panel.`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**************************************************************************************************************************************
	 * Acquires the 'Access Token' using different strategies based on the availability of a 'Refresh Token'.
	 * If a 'Refresh Token' is available, it tries to refresh the 'Access Token' using the 'Refresh Token'.
	 * If that fails, it switches to using the 'Authorization Code' to acquire a new 'Access Token'.
	 * If no 'Refresh Token' is available, it directly tries to acquire the 'Access Token' using the 'Authorization Code'.
	 *
	 * @returns {Promise<void>} A promise indicating the completion of the 'Access Token' acquisition process.
	 * @throws {Error} Throws an error if there is an issue during the 'Access Token' acquisition process.
	 **************************************************************************************************************************************/
	async acquireAccessToken() {
		this.log.info(`Acquiring 'Access Token'...`);

		// If we have a 'Refresh Token' try using it first to get a new 'Access Token'
		const refreshToken_state = await this.getStateAsync(this.ioBrokerObjectID_state_refreshToken);

		if (refreshToken_state?.val) {
			try {
				await this.refreshAccessTokenUsingRefreshToken();
			} catch (error) {
				this.log.debug(`Switching 'Access Token' acquisition strategy...`);

				try {
					await this.acquireAccessTokenUsingAuthorizationCode();
				} catch {
					// ERROR while acquiring 'Access Token'!
					const errorMessage = `ERROR: Error while acquiring 'Access Token'! Please go to the admin panel and try to acquire a new "Authorization-Code".`;
					this.log.error(errorMessage);

					// Delete previously acquired 'Authorization Code' and throw error!
					await this.deletePreviouslyAcquiredAuthorizationCode;

					throw new Error(errorMessage);
				}
			}
		} else {
			// If we don't have a 'Refresh Token' try to acquire an 'Access Token' using the acquired 'Authetication Code'.
			try {
				await this.acquireAccessTokenUsingAuthorizationCode();
			} catch {
				// ERROR while acquiring 'Access Token'!
				const errorMessage = `ERROR: Error while acquiring 'Access Token'! Please go to the admin panel and try to acquire a new "Authorization-Code".`;
				this.log.error(errorMessage);

				// Delete previously acquired 'Authorization Code' and throw error!
				await this.deletePreviouslyAcquiredAuthorizationCode;

				throw new Error(errorMessage);
			}
		}
	}

	/**************************************************************************************************************************************
	 * Deletes the previously acquired 'Authorization Code' state.
	 * This function removes the stored 'Authorization Code' from the adapter's object tree.
	 *
	 * @returns {Promise<void>} A promise indicating the completion of the deletion process.
	 * @throws {Error} Throws an error if there is an issue while deleting the 'Authorization Code'.
	 **************************************************************************************************************************************/
	async deletePreviouslyAcquiredAuthorizationCode() {
		this.log.debug(`Deleting previously acquired 'Authorization Code'...`);
		await this.setStateAsync(this.ioBrokerObjectID_state_authorizationCode, {
			val: "",
			ack: true,
		})
			.then(() => {
				this.log.debug(`Successfully deleted previously acquired 'Authorization Code'.`);
			})
			.catch(() => {
				const errorMessage = `ERROR: Error while deleting previously acquired 'Authorization Code'!`;
				this.log.error(errorMessage);
			});
	}

	/**************************************************************************************************************************************
	 * Attempts to refresh the 'Access Token' using the 'Refresh Token'.
	 *
	 * This function attempts to refresh the 'Access Token' by sending a request to the Google OAuth2 token endpoint
	 * with the provided 'Refresh Token'. It updates the 'Access Token' state in the adapter's object tree upon successful
	 * token refresh and schedules the next 'Access Token' refresh.
	 *
	 * @returns {Promise<void>} A promise indicating the completion of the access token refresh process.
	 * @throws {Error} Throws an error if there is an issue with refreshing the 'Access Token'.
	 *
	 * INFOs / TODOs:
	 * @todo Create global variable for refresh timeout
	 * @todo Consider moving the refresh scheduling out of this function and into the 'onReady' function.
	 **************************************************************************************************************************************/
	async refreshAccessTokenUsingRefreshToken() {
		this.log.info(`Trying to refresh the 'Access Token' using the 'Refresh Token'...`);

		// Update the global authentication variables first.
		await this.updateGlobalAuthenticationVariables();

		// Get authentication values from global variables.
		const refreshToken = this.refreshToken;
		const clientID = this.clientID;
		const clientSecret = this.clientSecret;

		// Check authentication values
		if (!refreshToken || !clientID || !clientSecret) {
			if (!refreshToken) {
				const errorMessage = `ERROR: Undefined required authentication value in function: 'refreshAccessTokenUsingRefreshToken': Missing required value for 'Refresh Token'!`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			} else if (!clientID) {
				const errorMessage = `ERROR: Undefined required authentication value in function: 'refreshAccessTokenUsingRefreshToken': Missing required value for 'Client ID'!`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			} else if (!clientSecret) {
				const errorMessage = `ERROR: Undefined required authentication value in function: 'refreshAccessTokenUsingRefreshToken': Missing required value for 'Client Secret'!`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			} else {
				const errorMessage = `ERROR: Undefined required authentication value in function: 'refreshAccessTokenUsingRefreshToken'!`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			}
		}

		this.log.debug(`'Refresh Token': ${refreshToken}`);

		// Prepare response variable
		let refreshAccessTokenResponse = null;

		try {
			const url = `https://www.googleapis.com/oauth2/v4/token?client_id=${clientID}&client_secret=${clientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`;

			this.log.silly(`Refresh 'Access Token' URL: ${url}`);

			refreshAccessTokenResponse = await axios.post(url);

			if (refreshAccessTokenResponse) {
				this.log.debug(`Received "Refresh 'Access Token' response".`);
				this.log.silly(`Refresh Access Token response: ${refreshAccessTokenResponse.status}: ${JSON.stringify(refreshAccessTokenResponse.data)}`);
			}
		} catch (error) {
			// Log
			const errorMessage = `ERROR: An error occurred while trying to refresh the 'Access Token' using the 'Refresh Token'. Error: ${error.code}`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}

		if (refreshAccessTokenResponse?.data) {
			this.log.debug(`Validating received "Refresh 'Access Token' response" data...`);
			const jsonObject = JSON.parse(JSON.stringify(refreshAccessTokenResponse?.data));

			const accessToken = jsonObject.access_token;
			const accessToken_expiresIn = jsonObject.expires_in;

			if (accessToken && accessToken.toString() && accessToken_expiresIn && accessToken_expiresIn.toString() && /^[0-9]+$/.test(accessToken_expiresIn.toString())) {
				this.log.debug(`Received "Refresh 'Access Token' response" data seems valid.`);

				this.log.debug(`Received 'Access Token': ${accessToken}`);
				this.log.debug(`Received 'Access Token - Expiration': ${accessToken_expiresIn} seconds (aprox. ${Math.round(accessToken_expiresIn % 60)} minutes)`);

				this.log.debug(`Setting object state '${this.ioBrokerObjectID_state_accessToken}' to value '${accessToken}' with expiration '${accessToken_expiresIn}' seconds...`);
				await this.setStateAsync(this.ioBrokerObjectID_state_accessToken, {
					val: accessToken,
					ack: true,
					expire: accessToken_expiresIn,
				})
					.then(() => {
						this.log.debug(`Successfully set object state '${this.ioBrokerObjectID_state_accessToken}' to value '${accessToken}' with expiration '${accessToken_expiresIn}' seconds.`);
						this.log.info(`Successfully refreshed 'Access Token'.`);
					})
					.catch(() => {
						const errorMessage = `ERROR: Error while setting object state '${this.ioBrokerObjectID_state_accessToken}' to value '${accessToken}' with expiration '${accessToken_expiresIn}' seconds!`;
						this.log.error(errorMessage);
						throw new Error(errorMessage);
					});

				// Schedule next 'Access Token' refresh
				// (Schedule the next 'Access Token' refresh after half the time of the expiration of the current 'Access Token' has passed.)
				this.scheduleNextAccessTokenRefresh((accessToken_expiresIn / 2) * 1000);
			} else {
				if (!accessToken || !accessToken.toString()) {
					const errorMessage = `ERROR: Error while validating received "Refresh 'Access Token' response" data: Received 'Access Token' seems to be invalid!`;
					this.log.error(errorMessage);
					throw new Error(errorMessage);
				} else if (!accessToken_expiresIn || !accessToken_expiresIn.toString() || /[^0-9]/.test(accessToken_expiresIn.toString())) {
					const errorMessage = `ERROR: Error while validating received "Refresh 'Access Token' response" data: Received 'Access Token - Expiration' seems to be invalid!`;
					this.log.error(errorMessage);
					throw new Error(errorMessage);
				} else {
					const errorMessage = `ERROR: Error while validating received "Refresh 'Access Token' response" data!`;
					this.log.error(errorMessage);
					throw new Error(errorMessage);
				}
			}
		} else {
			const errorMessage = `ERROR: An error occurred while trying to refresh the 'Access Token' using the 'Refresh Token'. Error: No response data was received!`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**************************************************************************************************************************************
	 * Schedules the next refresh of the 'Access Token'.
	 *
	 * This function schedules the next refresh of the 'Access Token' to occur after a specified timeout.
	 * It clears any existing timeout for refreshing the 'Access Token' before setting a new one.
	 *
	 * @param {number} timeoutInMilliseconds - The timeout duration in milliseconds after which the next 'Access Token' refresh should occur.
	 * @returns {Promise<void>} A promise indicating that the next 'Access Token' refresh has been scheduled.
	 **************************************************************************************************************************************/
	async scheduleNextAccessTokenRefresh(timeoutInMilliseconds) {
		this.log.debug(`Scheduling next 'Access Token' refresh...`);

		if (this.refreshAccessTokenTimeout) {
			this.clearTimeout(this.refreshAccessTokenTimeout);
			this.refreshAccessTokenTimeout = null;
		}
		this.refreshAccessTokenTimeout = this.setTimeout(() => this.acquireAccessToken(), timeoutInMilliseconds);

		const timeoutInSeconds = timeoutInMilliseconds / 1000;
		let minutes = Math.floor(timeoutInSeconds / 60); // Round down minutes
		let seconds = Math.round(timeoutInSeconds % 60); // Round seconds
		if (seconds === 60) {
			minutes++;
			seconds = 0;

			this.log.debug(`Next 'Access Token' refresh scheduled in '${Math.round(timeoutInSeconds)} seconds (${minutes} minutes)'.`);
		} else {
			this.log.debug(`Next 'Access Token' refresh scheduled in '${timeoutInSeconds} seconds (${minutes} minutes & ${seconds} seconds)'.`);
		}
	}

	/**************************************************************************************************************************************
	 * Attempts to acquire a new 'Access Token' using the provided 'Authorization Code'.
	 *
	 * This function is responsible for acquiring a new 'Access Token' by sending a POST request
	 * to the Google OAuth2 endpoint with the provided 'Client ID', 'Client Secret', 'Authorization Code', and redirect URI.
	 * If successful, it stores the acquired 'Access Token' (and its expiration time) & the 'Refresh Token' in the adapter's state.
	 * It also schedules the next 'Access Token' refresh to occur after half of the current access token's expiration time.
	 *
	 * @returns {Promise<void>} A promise that resolves if the 'Access Token' is successfully acquired,
	 *                          or rejects with an error message if an issue occurs during the process.
	 * @throws {Error} If there is an issue acquiring the 'Access Token' or validating the response data.
	 *
	 * INFOs / TODOs:
	 * @todo Create global variable for refresh timeout
	 * @todo Consider moving the refresh scheduling out of this function and into the 'onReady' function.
	 **************************************************************************************************************************************/
	async acquireAccessTokenUsingAuthorizationCode() {
		this.log.info(`Trying to acquire new 'Access Token' using the 'Authorization Code'...`);

		// Update the global authentication variables first.
		await this.updateGlobalAuthenticationVariables();

		// Get authentication values from global variables.
		const clientID = this.clientID;
		const clientSecret = this.clientSecret;
		const authorizationCode = this.authorizationCode;
		const httpServerPort = this.config.httpServerPort;

		// Check authentication values
		if (!clientID || !clientSecret || !authorizationCode || !httpServerPort || !httpServerPort.toString()) {
			if (clientID == null || clientID == undefined || clientID == "") {
				const errorMessage = `ERROR: Undefined required authentication value in function: 'acquireAccessTokenUsingAuthorizationCode'. Missing required value for 'Client ID'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			} else if (!clientSecret) {
				const errorMessage = `ERROR: Undefined required authentication value in function: 'acquireAccessTokenUsingAuthorizationCode'. Missing required value for 'Client Secret'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			} else if (!authorizationCode) {
				const errorMessage = `ERROR: Undefined required authentication value in function: 'acquireAccessTokenUsingAuthorizationCode'. Missing required value for 'Authorization Code'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			} else if (!httpServerPort || !httpServerPort.toString()) {
				const errorMessage = `ERROR: Undefined required authentication value in function: 'acquireAccessTokenUsingAuthorizationCode'. Missing required value for 'HTTP-Server Port'.`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			} else {
				const errorMessage = `ERROR: Undefined required authentication value in function: 'acquireAccessTokenUsingAuthorizationCode'`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			}
		}

		this.log.debug(`'Authorization Code': ${authorizationCode}`);

		// Prepare response variable
		let acquireAccessTokenResponse = null;

		try {
			const url = `https://www.googleapis.com/oauth2/v4/token?client_id=${clientID}&client_secret=${clientSecret}&code=${authorizationCode}&grant_type=authorization_code&redirect_uri=http://localhost:${httpServerPort}`;

			this.log.silly(`Acquire 'Access Token' URL: ${url}`);

			acquireAccessTokenResponse = await axios.post(url);

			if (acquireAccessTokenResponse) {
				this.log.debug(`Received "Acquire 'Access Token' response".`);
				this.log.silly(`Acquire 'Access Token' response: ${acquireAccessTokenResponse.status}: ${JSON.stringify(acquireAccessTokenResponse.data)}`);
			}
		} catch (error) {
			const errorMessage = `ERROR: An error occurred while trying to acquire an 'Access Token' using the 'Authorization Code'. Error: ${error.code}`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}

		if (acquireAccessTokenResponse?.data) {
			this.log.debug(`Validating received "Acquire 'Access Token' response" data...`);
			const jsonObject = JSON.parse(JSON.stringify(acquireAccessTokenResponse?.data));

			const accessToken = jsonObject.access_token;
			const accessToken_expiresIn = jsonObject.expires_in;
			const refreshToken = jsonObject.refresh_token;

			if (accessToken && accessToken.toString() && accessToken_expiresIn && accessToken_expiresIn.toString() && /^[0-9]+$/.test(accessToken_expiresIn.toString()) && refreshToken && refreshToken.toString()) {
				this.log.debug(`Received "Acquire 'Access Token' response" data seems valid.`);

				this.log.debug(`Received 'Access Token': ${accessToken}`);
				this.log.debug(`Received 'Access Token - Expiration': ${accessToken_expiresIn} seconds (aprox. ${Math.round(accessToken_expiresIn % 60)} minutes)`);
				this.log.debug(`Received 'Refresh Token': ${refreshToken}`);

				this.log.debug(`Setting object state '${this.ioBrokerObjectID_state_accessToken}' to value '${accessToken}' with expiration '${accessToken_expiresIn}' seconds...`);
				await this.setStateAsync(this.ioBrokerObjectID_state_accessToken, {
					val: accessToken,
					ack: true,
					expire: accessToken_expiresIn,
				})
					.then(() => {
						this.log.debug(`Successfully set object state '${this.ioBrokerObjectID_state_accessToken}' to value '${accessToken}' with expiration '${accessToken_expiresIn}' seconds.`);
						this.log.info(`Successfully acquired 'Access Token'.`);
					})
					.catch(() => {
						const errorMessage = `ERROR: Error while setting object state '${this.ioBrokerObjectID_state_accessToken}' to value '${accessToken}' with expiration '${accessToken_expiresIn}' seconds!`;
						this.log.error(errorMessage);
						throw new Error(errorMessage);
					});

				this.log.debug(`Setting object state '${this.ioBrokerObjectID_state_refreshToken}' to value '${refreshToken}'...`);
				await this.setStateAsync(this.ioBrokerObjectID_state_refreshToken, {
					val: refreshToken,
					ack: true,
				})
					.then(() => {
						this.log.debug(`Successfully set object state '${this.ioBrokerObjectID_state_refreshToken}' to value '${refreshToken}'.`);
					})
					.catch(() => {
						const errorMessage = `ERROR: Error while setting object state '${this.ioBrokerObjectID_state_refreshToken}' to value '${refreshToken}'.`;
						this.log.error(errorMessage);
						throw new Error(errorMessage);
					});

				// Schedule next 'Access Token' refresh
				// (Schedule the next 'Access Token' refresh after half the time of the expiration of the current 'Access Token' has passed.)
				this.scheduleNextAccessTokenRefresh((accessToken_expiresIn / 2) * 1000);
			} else {
				if (!accessToken || !accessToken.toString()) {
					const errorMessage = `ERROR: Error while validating received "Acquire 'Access Token' response" data: Received 'Access Token' seems to be invalid!`;
					this.log.error(errorMessage);
					throw new Error(errorMessage);
				} else if (!accessToken_expiresIn || !accessToken_expiresIn.toString() || /[^0-9]/.test(accessToken_expiresIn.toString())) {
					const errorMessage = `ERROR: Error while validating received "Acquire 'Access Token' response" data: Received 'Access Token - Expiration' seems to be invalid!`;
					this.log.error(errorMessage);
					throw new Error(errorMessage);
				} else if (!refreshToken || !refreshToken.toString()) {
					const errorMessage = `ERROR: Error while validating received "Acquire 'Access Token' response" data: Received 'Refresh Token' seems to be invalid!`;
					this.log.error(errorMessage);
					throw new Error(errorMessage);
				} else {
					const errorMessage = `ERROR: Error while validating received "Acquire 'Access Token' response" data!`;
					this.log.error(errorMessage);
					throw new Error(errorMessage);
				}
			}
		} else {
			const errorMessage = `ERROR: An error occurred while trying to acquire the 'Access Token' using the 'Authorization Code'. Error: No response data was received!`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**************************************************************************************************************************************
	 * Acquires the list of devices as a JSON string from the Smart Device Management API.
	 *
	 * This function retrieves the list of devices associated with the specified project
	 * from the Smart Device Management API. It requires authentication values for the
	 * 'Project ID' and 'Access Token' to be available in the adapter's state. If successful,
	 * it resolves with the JSON string representation of the device list. If unsuccessful,
	 * it rejects with an error message describing the encountered issue.
	 *
	 * ADDITIONAL INFO: According to the Google documentation, the initial authentication process isn't completed until the first fetch of the device list
	 * 				    (which should occur immediately after the initial 'Access Token' fetch.)
	 *
	 * @returns {Promise<string>} A promise that resolves with the JSON string representation
	 *                            of the device list, or rejects with an error message.
	 * @throws {Error} If there is an issue acquiring the device list.
	 **************************************************************************************************************************************/
	acquireDeviceListAsJSONstring() {
		return new Promise((resolve, reject) => {
			this.log.info(`Acquiring 'Device List'...`);

			// Get the required authentication object states
			const projectIDPromise = this.getStateAsync(this.ioBrokerObjectID_state_projectID);
			const accessTokenPromise = this.getStateAsync(this.ioBrokerObjectID_state_accessToken);

			Promise.all([projectIDPromise, accessTokenPromise])
				.then(([projectID_state, accessToken_state]) => {
					// Get the authentication values into variables
					const projectID = projectID_state?.val;
					const accessToken = accessToken_state?.val;

					// Check for missing authentication values
					if (!projectID || !accessToken) {
						const errorMessage = `ERROR: Undefined required authentication value in function: 'acquireDeviceListAsJSONstring'. Missing required value${!projectID ? " for Project ID" : ""}${!accessToken ? " for Access Token" : ""}!`;
						this.log.error(errorMessage);
						reject(new Error(errorMessage));
						return;
					}

					// Define request parameters
					const baseURL = "https://smartdevicemanagement.googleapis.com/v1/enterprises";

					// Construct the URL with parameters embedded
					const url = `${baseURL}/${projectID}/devices`;

					// Define request headers
					const headers = {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					};

					this.log.silly(`Acquire 'Device List' URL: ${url}`);

					// Make the GET request using Axios
					axios
						.get(url, { headers })
						.then((response) => {
							let jsonString = null;
							let parsedJSON = null;

							// Check if the response (which should be JSON) can be converted to a string.
							try {
								jsonString = JSON.stringify(response.data);
							} catch (error) {
								const errorMessage = `ERROR: Error while acquiring 'Device List': The received response seems to be invalid: Received JSON could not be converted to a string!`;
								this.log.error(errorMessage);
								reject(new Error(errorMessage));
								return;
							}

							// Check if the JSON string seems to be valid JSON that can be parsed.
							try {
								parsedJSON = JSON.parse(jsonString);
							} catch {
								const errorMessage = `ERROR: Error while acquiring 'Device List': The received response seems to be invalid: JSON string could not be parsed!`;
								this.log.error(errorMessage);
								reject(new Error(errorMessage));
								return;
							}

							// Check if the parsed JSON has a "key" named "devices" and therefore seems to be a valid 'Device List'.
							if (parsedJSON.devices) {
								this.log.info(`Successfully acquired 'Device List'.`);
								this.log.silly(`Acquire 'Device List' response: ${response.status}: ${jsonString}`);

								resolve(jsonString);
							} else {
								const errorMessage = `ERROR: Error while acquiring 'Device List': The received response seems to be invalid: JSON string doesn't seem to be a valid 'Device List'!`;
								this.log.error(errorMessage);
								reject(new Error(errorMessage));
							}
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while acquiring 'Device List'! Error: ${error}`;
							this.log.error(errorMessage);
							reject(new Error(errorMessage));
						});
				})
				.catch((error) => {
					const errorMessage = `ERROR: Error while acquiring 'Device List'! Error: ${error}`;
					this.log.error(errorMessage);
					reject(new Error(errorMessage));
				});
		});
	}

	/**************************************************************************************************************************************
	 * Deletes all stored devices from the adapter.
	 *
	 * This function retrieves all stored devices, iterates through them, and attempts to delete each one.
	 * It logs information about the devices found and deleted.
	 * If any error occurs during deletion, it logs an error message and throws an error.
	 *
	 * @returns {Promise<boolean>} A promise indicating the success or failure of the deletion process.
	 *                             Returns true if no devices were stored, false if errors occurred during deletion.
	 * @throws {Error} If any error occurs during the deletion process.
	 **************************************************************************************************************************************/
	async deleteAllStoredDevices() {
		this.log.debug(`Deleting all stored devices...`);

		let storedDevices = await this.getDevicesAsync();

		if (storedDevices.length > 0) {
			this.log.debug(`Amount of stored devices: ${storedDevices.length}`);

			let errorWhileDeletingDevices = false;

			for (const storedDevice of storedDevices) {
				this.log.silly(`Found stored device: '${storedDevice.common.name}' (Device ID: '${storedDevice._id}')`);

				try {
					await this.deleteStoredDevice(storedDevice._id, storedDevice.common.name.toString());
				} catch {
					errorWhileDeletingDevices = true;
				}
			}

			if (!errorWhileDeletingDevices) {
				// Check if all devices have been deleted
				storedDevices = await this.getDevicesAsync();
				if (storedDevices.length == 0) {
					this.log.debug(`Successfully deleted all stored devices.`);
					return true; // All devices successfully deleted
				} else {
					const errorMessage = `ERROR: Error while deleting all stored devices! Not all devices could be deleted! Remaining/undeleted devices: ${storedDevices.length}`;
					this.log.error(errorMessage);
					throw new Error(errorMessage);
				}
			} else {
				const errorMessage = `ERROR: Error while deleting devices!`;
				throw new Error(errorMessage);
			}
		} else {
			this.log.debug(`No devices have been stored yet.`);
			return true;
		}
	}

	/**************************************************************************************************************************************
	 * Deletes a stored device from the adapter.
	 *
	 * This function deletes a device with the specified 'Device ID' and 'Device Name'.
	 * It logs information about the device being deleted and handles any errors that occur during the deletion process.
	 *
	 * @param {string} deviceID - The ID of the device to be deleted.
	 * @param {string} deviceName - The name of the device to be deleted.
	 * @returns {Promise<boolean>} A promise indicating the success or failure of the deletion process. Returns true if the device
	 *                             is successfully deleted, false otherwise.
	 * @throws {Error} If any error occurs during the deletion process.
	 **************************************************************************************************************************************/
	async deleteStoredDevice(deviceID, deviceName) {
		this.log.debug(`Deleting stored device: '${deviceName}' (Device ID: '${deviceID}')...`);
		try {
			await this.delObjectAsync(deviceID, { recursive: true });
			this.log.debug(`Successfully deleted device: '${deviceName}'.`);
			return true;
		} catch (error) {
			const errorMessage = `ERROR: Error while deleting device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**************************************************************************************************************************************
	 * @toto Optimize/change code
	 * @todo Add documentation
	 **************************************************************************************************************************************/
	async createDeviceObjectsAndStatesFromJSONDeviceListString(jsonDeviceList) {
		// Create folder for "devices" if it doesn't already exist.
		try {
			await this.createFolderForDevicesIfItDoesNotExist();
		} catch (error) {
			this.log.error(error);
			throw new Error(error);
		}

		const jsonObject = JSON.parse(jsonDeviceList);
		const devices = jsonObject.devices;

		this.log.debug(`Counting found devices...`);
		if (devices.length > 0) {
			this.log.info(`Amount of found devices: ${devices.length}`);
			this.log.debug(`Listing found devices...`);

			let count = 1;
			try {
				for (const device of devices) {
					const deviceID = this.getDeviceIDfromDeviceName(device.name);

					const deviceName = device.traits["sdm.devices.traits.Info"].customName;

					let deviceType = device.type;
					const parts = deviceType.split(".");
					const lastPart = parts[parts.length - 1];
					deviceType = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).toLowerCase();

					this.log.info(`${count}. found device: '${deviceName}' of type: '${deviceType}' (with ID: '${deviceID}') ...`);
					count++;
				}
			} catch (error) {
				const errorMessage = `ERROR: Error while listing found devices! => ${error}`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			}

			this.log.debug(`Finished listing found devices.`);

			// Create the states for each device
			this.log.debug(`Creating states for found devices...`);

			// Prepare error array
			const errorsOccurredDuringStateCreationForDevicesWithID = [];

			for (const device of devices) {
				const deviceID = this.getDeviceIDfromDeviceName(device.name);

				const deviceName = device.traits["sdm.devices.traits.Info"].customName;

				let deviceType = device.type;
				const parts = deviceType.split(".");
				const lastPart = parts[parts.length - 1];
				deviceType = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).toLowerCase();

				// Check if the type of the device is a valid device type.
				this.log.debug(`Checking if device type '${deviceType}' of found device '${deviceName}' is a valid device type...`);
				try {
					const isValidDeviceType = this.validateDeviceType(deviceType);
					if (isValidDeviceType) {
						this.log.debug(`Device type '${deviceType}' of found device '${deviceName}' is valid.`);
					} else {
						// Since there was an error, we should skip the device and move on with the next one.
						this.log.warn(`Device type '${deviceType}' of found device '${deviceName}' is invalid! Skipping found device!`);
						continue;
					}
				} catch (error) {
					const errorMessage = `ERROR: Error while checking if device type '${deviceType}' of found device '${deviceName}' is a valid device type!`;
					this.log.error(errorMessage);
					throw new Error(errorMessage);
				}

				this.log.debug(`Creating states for found device: '${deviceName}' of type: '${deviceType}' (Device ID: '${deviceID}')...`);

				// Create the device object (folder for the device)
				this.log.debug(`Creating folder for device '${deviceName}' (Device ID: '${deviceID}')...`);
				try {
					await this.setObjectAsync("devices." + deviceID, {
						type: "device",
						common: {
							name: deviceName,
							// @ts-ignore
							desc: deviceType,
						},
						native: {},
					})
						.then(() => {
							this.log.debug(`Successfully created folder for device '${deviceName}' (Device ID: '${deviceID}').`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while creating folder for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});
				} catch (error) {
					if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
						errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
					}

					// Since there was an error, we should skip the device and move on with the next one.
					this.log.warn(`Skipping found device due to error on device folder creation!`);
					continue;
				}

				// Now create the actual states and set their values...

				// 'Device ID'
				// (This key is actually called 'name' in the retrieved JSON. However we consider this to be the 'ID' of the device.)
				this.log.debug(`Creating 'deviceID' state for device '${deviceName}' (Device ID: '${deviceID}')...`);
				try {
					await this.setObjectAsync("devices." + deviceID + ".deviceID", {
						type: "state",
						common: {
							name: "Device ID",
							type: "string",
							role: "value",
							write: false,
							read: true,
						},
						native: {},
					})
						.then(() => {
							this.log.debug(`Successfully created 'deviceID' state for device '${deviceName}' (Device ID: '${deviceID}').`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while creating 'deviceID' state for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});

					this.log.debug(`Setting 'deviceID' state for device '${deviceName}' (Device ID: '${deviceID}')  to '${deviceID}'...`);
					await this.setStateAsync("devices." + deviceID + ".deviceID", {
						val: deviceID,
						ack: true,
					})
						.then(() => {
							this.log.debug(`Successfully set 'deviceID' state for device '${deviceName}' (Device ID: '${deviceID}') to '${deviceID}'.`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while setting 'deviceID' state for device: '${deviceName}' (Device ID: '${deviceID}') to '${deviceID}': ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});
				} catch (error) {
					if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
						errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
					}
				}

				// 'Device Name'
				this.log.debug(`Creating 'deviceName' state for device '${deviceName}' (Device ID: '${deviceID}')...`);
				try {
					await this.setObjectAsync("devices." + deviceID + ".deviceName", {
						type: "state",
						common: {
							name: "Device Name",
							type: "string",
							role: "value",
							write: false,
							read: true,
						},
						native: {},
					})
						.then(() => {
							this.log.debug(`Successfully created 'deviceName' state for device '${deviceName}' (Device ID: '${deviceID}').`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while creating 'deviceName' state for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});

					this.log.debug(`Setting 'deviceName' state for device '${deviceName}' (Device ID: '${deviceID}')  to '${deviceName}'...`);
					await this.setStateAsync("devices." + deviceID + ".deviceName", {
						val: deviceName,
						ack: true,
					})
						.then(() => {
							this.log.debug(`Successfully set 'deviceName' state for device '${deviceName}' (Device ID: '${deviceID}') to '${deviceName}'.`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while setting 'deviceName' state for device: '${deviceName}' (Device ID: '${deviceID}') to '${deviceName}': ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});
				} catch (error) {
					if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
						errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
					}
				}

				// 'Device Type'
				this.log.debug(`Creating 'deviceType' state for device '${deviceName}' (Device ID: '${deviceID}')...`);
				try {
					await this.setObjectAsync("devices." + deviceID + ".deviceType", {
						type: "state",
						common: {
							name: "Device Type",
							type: "string",
							role: "value",
							write: false,
							read: true,
						},
						native: {},
					})
						.then(() => {
							this.log.debug(`Successfully created 'deviceType' state for device '${deviceName}' (Device ID: '${deviceID}').`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while creating 'deviceType' state for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});

					this.log.debug(`Setting 'deviceType' state for device '${deviceName}' (Device ID: '${deviceID}')  to '${deviceType}'...`);
					await this.setStateAsync("devices." + deviceID + ".deviceType", {
						val: deviceType,
						ack: true,
					})
						.then(() => {
							this.log.debug(`Successfully set 'deviceType' state for device '${deviceName}' (Device ID: '${deviceID}') to '${deviceType}'.`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while setting 'deviceType' state for device: '${deviceName}' (Device ID: '${deviceID}') to '${deviceType}': ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});
				} catch {
					if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
						errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
					}
				}

				// For CAMERAS, DOORBELLS & DISPLAYS ...
				if (deviceType.toLowerCase() === "camera" || deviceType.toLowerCase() === "doorbell" || deviceType.toLowerCase() === "display") {
					let creatingCapabilitiesChannelSuccess = false;
					try {
						await this.createChannelWithNameAndDescriptionAtPathIfNotExists("devices." + deviceID + ".capabilities", "Capabilities", "The devices' capabilities", deviceID, deviceName);
						creatingCapabilitiesChannelSuccess = await this.checkIfChannelExists("devices." + deviceID + ".capabilities");
					} catch {
						if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
							errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
						}
					}

					// Trait: CameraImage
					if (creatingCapabilitiesChannelSuccess && device.traits["sdm.devices.traits.CameraImage"]) {
						let creatingCameraImageChannelSuccess = false;
						try {
							await this.createChannelWithNameAndDescriptionAtPathIfNotExists("devices." + deviceID + ".capabilities.cameraImage", "Camera Image", "", deviceID, deviceName);
							creatingCameraImageChannelSuccess = await this.checkIfChannelExists("devices." + deviceID + ".capabilities.cameraImage");
						} catch {
							if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
								errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
							}
						}

						// maxImageResolution
						if (creatingCapabilitiesChannelSuccess && creatingCameraImageChannelSuccess && device.traits["sdm.devices.traits.CameraImage"].maxImageResolution) {
							let creatingMaxImageResolutionChannelSuccess = false;
							try {
								await this.createChannelWithNameAndDescriptionAtPathIfNotExists("devices." + deviceID + ".capabilities.cameraImage.maxImageResolution", "Max Image Resolution", "The maximum image resolution for images taken by the camera", deviceID, deviceName);
								creatingMaxImageResolutionChannelSuccess = await this.checkIfChannelExists("devices." + deviceID + ".capabilities.cameraImage.maxImageResolution");
							} catch {
								if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
									errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
								}
							}

							// width
							if (creatingCapabilitiesChannelSuccess && creatingCameraImageChannelSuccess && creatingMaxImageResolutionChannelSuccess && device.traits["sdm.devices.traits.CameraImage"].maxImageResolution.width) {
								this.log.debug(`Creating state 'width' ('.capabilities.cameraImage.maxImageResolution.width') for device '${deviceName}' (Device ID: '${deviceID}')...`);
								try {
									await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.cameraImage.maxImageResolution.width", {
										type: "state",
										common: {
											name: "Width",
											type: "number",
											role: "value",
											write: false,
											read: true,
										},
										native: {},
									})
										.then(() => {
											this.log.debug(`Successfully created state 'width' ('.capabilities.cameraImage.maxImageResolution.width') for device '${deviceName}' (Device ID: '${deviceID}').`);
										})
										.catch((error) => {
											const errorMessage = `ERROR: Error while creating state 'width' ('.capabilities.cameraImage.maxImageResolution.width') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
											this.log.error(errorMessage);
											throw new Error(errorMessage);
										});

									const maxImageResolution_width = device.traits["sdm.devices.traits.CameraImage"].maxImageResolution.width;
									this.log.debug(`Setting state 'width' ('.capabilities.cameraImage.maxImageResolution.width') for device '${deviceName}' (Device ID: '${deviceID}') to '${maxImageResolution_width}'...`);
									await this.setStateAsync("devices." + deviceID + ".capabilities.cameraImage.maxImageResolution.width", {
										val: maxImageResolution_width,
										ack: true,
									})
										.then(() => {
											this.log.debug(`Successfully set state 'width' ('.capabilities.cameraImage.maxImageResolution.width') for device '${deviceName}' (Device ID: '${deviceID}') to '${maxImageResolution_width}'.`);
										})
										.catch((error) => {
											const errorMessage = `ERROR: Error while setting state 'width' ('.capabilities.cameraImage.maxImageResolution.width') for device: '${deviceName}' (Device ID: '${deviceID}') to '${maxImageResolution_width}': ${error}`;
											this.log.error(errorMessage);
											throw new Error(errorMessage);
										});
								} catch {
									if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
										errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
									}
								}
							}

							// height
							if (creatingCapabilitiesChannelSuccess && creatingCameraImageChannelSuccess && creatingMaxImageResolutionChannelSuccess && device.traits["sdm.devices.traits.CameraImage"].maxImageResolution.height) {
								this.log.debug(`Creating state 'height' ('.capabilities.cameraImage.maxImageResolution.height') for device '${deviceName}' (Device ID: '${deviceID}')...`);
								try {
									await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.cameraImage.maxImageResolution.height", {
										type: "state",
										common: {
											name: "Height",
											type: "number",
											role: "value",
											write: false,
											read: true,
										},
										native: {},
									})
										.then(() => {
											this.log.debug(`Successfully created state 'height' ('.capabilities.cameraImage.maxImageResolution.height') for device '${deviceName}' (Device ID: '${deviceID}').`);
										})
										.catch((error) => {
											const errorMessage = `ERROR: Error while creating state 'height' ('.capabilities.cameraImage.maxImageResolution.height') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
											this.log.error(errorMessage);
											throw new Error(errorMessage);
										});

									const maxImageResolution_height = device.traits["sdm.devices.traits.CameraImage"].maxImageResolution.height;
									this.log.debug(`Setting state 'height' ('.capabilities.cameraImage.maxImageResolution.height') for device '${deviceName}' (Device ID: '${deviceID}') to '${maxImageResolution_height}'...`);
									await this.setStateAsync("devices." + deviceID + ".capabilities.cameraImage.maxImageResolution.height", {
										val: maxImageResolution_height,
										ack: true,
									})
										.then(() => {
											this.log.debug(`Successfully set state 'height' ('.capabilities.cameraImage.maxImageResolution.height') for device '${deviceName}' (Device ID: '${deviceID}') to '${maxImageResolution_height}'.`);
										})
										.catch((error) => {
											const errorMessage = `ERROR: Error while setting state 'height' ('.capabilities.cameraImage.maxImageResolution.height') for device: '${deviceName}' (Device ID: '${deviceID}') to '${maxImageResolution_height}': ${error}`;
											this.log.error(errorMessage);
											throw new Error(errorMessage);
										});
								} catch {
									if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
										errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
									}
								}
							}
						}
					}

					// Trait: CameraLiveStream
					if (creatingCapabilitiesChannelSuccess && device.traits["sdm.devices.traits.CameraLiveStream"]) {
						let creatingCameraLiveStreamChannelSuccess = false;
						try {
							await this.createChannelWithNameAndDescriptionAtPathIfNotExists("devices." + deviceID + ".capabilities.cameraLiveStream", "Camera Live Stream", "", deviceID, deviceName);
							creatingCameraLiveStreamChannelSuccess = await this.checkIfChannelExists("devices." + deviceID + ".capabilities.cameraLiveStream");
						} catch {
							if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
								errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
							}
						}

						// maxImageResolution
						if (creatingCapabilitiesChannelSuccess && creatingCameraLiveStreamChannelSuccess && device.traits["sdm.devices.traits.CameraLiveStream"].maxVideoResolution) {
							let creatingMaxVideoResolutionChannelSuccess = false;
							try {
								await this.createChannelWithNameAndDescriptionAtPathIfNotExists("devices." + deviceID + ".capabilities.cameraLiveStream.maxVideoResolution", "Max Video Resolution", "The maximum video resolution for the camera live stream", deviceID, deviceName);
								creatingMaxVideoResolutionChannelSuccess = await this.checkIfChannelExists("devices." + deviceID + ".capabilities.cameraLiveStream.maxVideoResolution");
							} catch {
								if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
									errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
								}
							}

							// width
							if (creatingCapabilitiesChannelSuccess && creatingCameraLiveStreamChannelSuccess && creatingMaxVideoResolutionChannelSuccess && device.traits["sdm.devices.traits.CameraLiveStream"].maxVideoResolution.width) {
								this.log.debug(`Creating state 'width' ('.capabilities.cameraLiveStream.maxVideoResolution.width') for device '${deviceName}' (Device ID: '${deviceID}')...`);
								try {
									await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.cameraLiveStream.maxVideoResolution.width", {
										type: "state",
										common: {
											name: "Width",
											type: "number",
											role: "value",
											write: false,
											read: true,
										},
										native: {},
									})
										.then(() => {
											this.log.debug(`Successfully created state 'width' ('.capabilities.cameraLiveStream.maxVideoResolution.width') for device '${deviceName}' (Device ID: '${deviceID}').`);
										})
										.catch((error) => {
											const errorMessage = `ERROR: Error while creating state 'width' ('.capabilities.cameraLiveStream.maxVideoResolution.width') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
											this.log.error(errorMessage);
											throw new Error(errorMessage);
										});

									const maxVideoResolution_width = device.traits["sdm.devices.traits.CameraLiveStream"].maxVideoResolution.width;
									this.log.debug(`Setting state 'width' ('.capabilities.cameraLiveStream.maxVideoResolution.width') for device '${deviceName}' (Device ID: '${deviceID}') to '${maxVideoResolution_width}'...`);
									await this.setStateAsync("devices." + deviceID + ".capabilities.cameraLiveStream.maxVideoResolution.width", {
										val: maxVideoResolution_width,
										ack: true,
									})
										.then(() => {
											this.log.debug(`Successfully set state 'width' ('.capabilities.cameraLiveStream.maxVideoResolution.width') for device '${deviceName}' (Device ID: '${deviceID}') to '${maxVideoResolution_width}'.`);
										})
										.catch((error) => {
											const errorMessage = `ERROR: Error while setting state 'width' ('.capabilities.cameraLive.maxVideoResolution.width') for device: '${deviceName}' (Device ID: '${deviceID}') to '${maxVideoResolution_width}': ${error}`;
											this.log.error(errorMessage);
											throw new Error(errorMessage);
										});
								} catch {
									if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
										errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
									}
								}
							}

							// height
							if (creatingCapabilitiesChannelSuccess && creatingCameraLiveStreamChannelSuccess && creatingMaxVideoResolutionChannelSuccess && device.traits["sdm.devices.traits.CameraLiveStream"].maxVideoResolution.height) {
								this.log.debug(`Creating state 'height' ('.capabilities.cameraLiveStream.maxVideoResolution.height') for device '${deviceName}' (Device ID: '${deviceID}')...`);
								try {
									await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.cameraLiveStream.maxVideoResolution.height", {
										type: "state",
										common: {
											name: "Height",
											type: "number",
											role: "value",
											write: false,
											read: true,
										},
										native: {},
									})
										.then(() => {
											this.log.debug(`Successfully created state 'height' ('.capabilities.cameraLiveStream.maxVideoResolution.height') for device '${deviceName}' (Device ID: '${deviceID}').`);
										})
										.catch((error) => {
											const errorMessage = `ERROR: Error while creating state 'height' ('.capabilities.cameraLiveStream.maxVideoResolution.height') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
											this.log.error(errorMessage);
											throw new Error(errorMessage);
										});

									const maxVideoResolution_height = device.traits["sdm.devices.traits.CameraLiveStream"].maxVideoResolution.height;
									this.log.debug(`Setting state 'height' ('.capabilities.cameraLiveStream.maxVideoResolution.height') for device '${deviceName}' (Device ID: '${deviceID}') to '${maxVideoResolution_height}'...`);
									await this.setStateAsync("devices." + deviceID + ".capabilities.cameraLiveStream.maxVideoResolution.height", {
										val: maxVideoResolution_height,
										ack: true,
									})
										.then(() => {
											this.log.debug(`Successfully set state 'height' ('.capabilities.cameraLiveStream.maxVideoResolution.height') for device '${deviceName}' (Device ID: '${deviceID}') to '${maxVideoResolution_height}'.`);
										})
										.catch((error) => {
											const errorMessage = `ERROR: Error while setting state 'height' ('.capabilities.cameraLiveStream.maxVideoResolution.height') for device: '${deviceName}' (Device ID: '${deviceID}') to '${maxVideoResolution_height}': ${error}`;
											this.log.error(errorMessage);
											throw new Error(errorMessage);
										});
								} catch {
									if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
										errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
									}
								}
							}
						}

						// videoCodecs
						if (creatingCapabilitiesChannelSuccess && creatingCameraLiveStreamChannelSuccess && device.traits["sdm.devices.traits.CameraLiveStream"].videoCodecs) {
							let creatingSupportedVideoCodecsChannelSuccess = false;
							try {
								await this.createChannelWithNameAndDescriptionAtPathIfNotExists("devices." + deviceID + ".capabilities.cameraLiveStream.supportedVideoCodecs", "Supported Video Codecs", "The supported video codecs for the camera live stream", deviceID, deviceName);
								creatingSupportedVideoCodecsChannelSuccess = await this.checkIfChannelExists("devices." + deviceID + ".capabilities.cameraLiveStream.supportedVideoCodecs");
							} catch {
								if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
									errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
								}
							}

							if (creatingSupportedVideoCodecsChannelSuccess && device.traits["sdm.devices.traits.CameraLiveStream"].videoCodecs.length > 0) {
								let codecNumber = 1;
								for (const videoCodec of device.traits["sdm.devices.traits.CameraLiveStream"].videoCodecs) {
									this.log.debug(`Creating state 'video-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedVideoCodecs.video-codec_${codecNumber}') for device '${deviceName}' (Device ID: '${deviceID}')...`);
									try {
										await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.cameraLiveStream.supportedVideoCodecs.video-codec_" + codecNumber, {
											type: "state",
											common: {
												name: `Video-Codec ${codecNumber}`,
												type: "string",
												role: "value",
												write: false,
												read: true,
											},
											native: {},
										})
											.then(() => {
												this.log.debug(`Successfully created state 'video-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedVideoCodecs.video-codec_${codecNumber}') for device '${deviceName}' (Device ID: '${deviceID}').`);
											})
											.catch((error) => {
												const errorMessage = `ERROR: Error while creating state 'video-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedVideoCodecs.video-codec_${codecNumber}') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
												this.log.error(errorMessage);
												throw new Error(errorMessage);
											});

										this.log.debug(`Setting state 'video-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedVideoCodecs.video-codec_${codecNumber}') for device '${deviceName}' (Device ID: '${deviceID}') to '${videoCodec}'...`);
										await this.setStateAsync("devices." + deviceID + ".capabilities.cameraLiveStream.supportedVideoCodecs.video-codec_" + codecNumber, {
											val: videoCodec,
											ack: true,
										})
											.then(() => {
												this.log.debug(`Successfully set state 'video-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedVideoCodecs.video-codec_${codecNumber}') for device '${deviceName}' (Device ID: '${deviceID}') to '${videoCodec}'.`);
											})
											.catch((error) => {
												const errorMessage = `ERROR: Error while setting state 'video-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedVideoCodecs.video-codec_${codecNumber}') for device: '${deviceName}' (Device ID: '${deviceID}') to '${videoCodec}': ${error}`;
												this.log.error(errorMessage);
												throw new Error(errorMessage);
											});
									} catch {
										if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
											errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
										}
									}

									codecNumber = codecNumber + 1;
								}
							}
						}

						// audioCodecs
						if (creatingCapabilitiesChannelSuccess && creatingCameraLiveStreamChannelSuccess && device.traits["sdm.devices.traits.CameraLiveStream"].audioCodecs) {
							let creatingSupportedAudioCodecsChannelSuccess = false;
							try {
								await this.createChannelWithNameAndDescriptionAtPathIfNotExists("devices." + deviceID + ".capabilities.cameraLiveStream.supportedAudioCodecs", "Supported Audio Codecs", "The supported audio codecs for the camera live stream", deviceID, deviceName);
								creatingSupportedAudioCodecsChannelSuccess = await this.checkIfChannelExists("devices." + deviceID + ".capabilities.cameraLiveStream.supportedAudioCodecs");
							} catch {
								if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
									errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
								}
							}

							if (creatingSupportedAudioCodecsChannelSuccess && device.traits["sdm.devices.traits.CameraLiveStream"].audioCodecs.length > 0) {
								let codecNumber = 1;
								for (const audioCodec of device.traits["sdm.devices.traits.CameraLiveStream"].audioCodecs) {
									this.log.debug(`Creating state 'audio-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedAudioCodecs.audio-codec_${codecNumber}') for device '${deviceName}' (Device ID: '${deviceID}')...`);
									try {
										await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.cameraLiveStream.supportedAudioCodecs.audio-codec_" + codecNumber, {
											type: "state",
											common: {
												name: `Audio-Codec ${codecNumber}`,
												type: "string",
												role: "value",
												write: false,
												read: true,
											},
											native: {},
										})
											.then(() => {
												this.log.debug(`Successfully created state 'audio-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedAudioCodecs.audio-codec_${codecNumber}') for device '${deviceName}' (Device ID: '${deviceID}').`);
											})
											.catch((error) => {
												const errorMessage = `ERROR: Error while creating state 'audio-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedAudioCodecs.audio-codec_${codecNumber}') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
												this.log.error(errorMessage);
												throw new Error(errorMessage);
											});

										this.log.debug(`Setting state 'audio-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedAudioCodecs.audio-codec_${codecNumber}') for device '${deviceName}' (Device ID: '${deviceID}') to '${audioCodec}'...`);
										await this.setStateAsync("devices." + deviceID + ".capabilities.cameraLiveStream.supportedAudioCodecs.audio-codec_" + codecNumber, {
											val: audioCodec,
											ack: true,
										})
											.then(() => {
												this.log.debug(`Successfully set state 'audio-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedAudioCodecs.audio-codec_${codecNumber}') for device '${deviceName}' (Device ID: '${deviceID}') to '${audioCodec}'.`);
											})
											.catch((error) => {
												const errorMessage = `ERROR: Error while setting state 'audio-codec_${codecNumber}' ('.capabilities.cameraLiveStream.supportedAudioCodecs.audio-codec_${codecNumber}') for device: '${deviceName}' (Device ID: '${deviceID}') to '${audioCodec}': ${error}`;
												this.log.error(errorMessage);
												throw new Error(errorMessage);
											});
									} catch {
										if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
											errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
										}
									}

									codecNumber = codecNumber + 1;
								}
							}
						}

						// supportedProtocols
						if (creatingCapabilitiesChannelSuccess && creatingCameraLiveStreamChannelSuccess && device.traits["sdm.devices.traits.CameraLiveStream"].supportedProtocols) {
							let creatingSupportedProtocolsChannelSuccess = false;
							try {
								await this.createChannelWithNameAndDescriptionAtPathIfNotExists("devices." + deviceID + ".capabilities.cameraLiveStream.supportedProtocols", "Supported Protocols", "The supported protocols for the camera live stream", deviceID, deviceName);
								creatingSupportedProtocolsChannelSuccess = await this.checkIfChannelExists("devices." + deviceID + ".capabilities.cameraLiveStream.supportedProtocols");
							} catch {
								if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
									errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
								}
							}

							if (creatingSupportedProtocolsChannelSuccess && device.traits["sdm.devices.traits.CameraLiveStream"].supportedProtocols.length > 0) {
								let protocolNumber = 1;
								for (const protocol of device.traits["sdm.devices.traits.CameraLiveStream"].supportedProtocols) {
									this.log.debug(`Creating state 'protocol_${protocolNumber}' ('.capabilities.cameraLiveStream.supportedProtocols.protocol_${protocolNumber}') for device '${deviceName}' (Device ID: '${deviceID}')...`);
									try {
										await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.cameraLiveStream.supportedProtocols.protocol_" + protocolNumber, {
											type: "state",
											common: {
												name: `Protocol ${protocolNumber}`,
												type: "string",
												role: "value",
												write: false,
												read: true,
											},
											native: {},
										})
											.then(() => {
												this.log.debug(`Successfully created state 'protocol_${protocolNumber}' ('.capabilities.cameraLiveStream.supportedProtocols.protocol_${protocolNumber}') for device '${deviceName}' (Device ID: '${deviceID}').`);
											})
											.catch((error) => {
												const errorMessage = `ERROR: Error while creating state 'protocol_${protocolNumber}' ('.capabilities.cameraLiveStream.supportedProtocols.protocol_${protocolNumber}') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
												this.log.error(errorMessage);
												throw new Error(errorMessage);
											});

										this.log.debug(`Setting state 'protocol_${protocolNumber}' ('.capabilities.cameraLiveStream.supportedProtocols.protocol_${protocolNumber}') for device '${deviceName}' (Device ID: '${deviceID}') to '${protocol}'...`);
										await this.setStateAsync("devices." + deviceID + ".capabilities.cameraLiveStream.supportedProtocols.protocol_" + protocolNumber, {
											val: protocol,
											ack: true,
										})
											.then(() => {
												this.log.debug(`Successfully set state 'protocol_${protocolNumber}' ('.capabilities.cameraLiveStream.supportedProtocols.protocol_${protocolNumber}') for device '${deviceName}' (Device ID: '${deviceID}') to '${protocol}'.`);
											})
											.catch((error) => {
												const errorMessage = `ERROR: Error while setting state 'protocol_${protocolNumber}' ('.capabilities.cameraLiveStream.supportedProtocols.protocol_${protocolNumber}') for device: '${deviceName}' (Device ID: '${deviceID}') to '${protocol}': ${error}`;
												this.log.error(errorMessage);
												throw new Error(errorMessage);
											});
									} catch {
										if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
											errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
										}
									}

									protocolNumber = protocolNumber + 1;
								}
							}
						}
					}

					// Trait: CameraMotion (supports motion detection events)
					this.log.debug(`Creating state 'supportsMotionDetectionEvents' ('.capabilities.supportsMotionDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}')...`);
					try {
						await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.supportsMotionDetectionEvents", {
							type: "state",
							common: {
								name: "Supports Motion Detection Events",
								type: "boolean",
								role: "indicator",
								write: false,
								read: true,
							},
							native: {},
						})
							.then(() => {
								this.log.debug(`Successfully created state 'supportsMotionDetectionEvents' ('.capabilities.supportsMotionDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}').`);
							})
							.catch((error) => {
								const errorMessage = `ERROR: Error while creating state 'supportsMotionDetectionEvents' ('.capabilities.supportsMotionDetectionEvents') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
								this.log.error(errorMessage);
								throw new Error(errorMessage);
							});

						if (device.traits["sdm.devices.traits.CameraMotion"]) {
							this.log.debug(`Setting state 'supportsMotionDetectionEvents' ('.capabilities.supportsMotionDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'...`);
							await this.setStateAsync("devices." + deviceID + ".capabilities.supportsMotionDetectionEvents", {
								val: true,
								ack: true,
							})
								.then(() => {
									this.log.debug(`Successfully set state 'supportsMotionDetectionEvents' ('.capabilities.supportsMotionDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'.`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while setting state 'supportsMotionDetectionEvents' ('.capabilities.supportsMotionDetectionEvents') for device: '${deviceName}' (Device ID: '${deviceID}') to 'TRUE': ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});
						} else {
							this.log.debug(`Setting state 'supportsMotionDetectionEvents' ('.capabilities.supportsMotionDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'...`);
							await this.setStateAsync("devices." + deviceID + ".capabilities.supportsMotionDetectionEvents", {
								val: false,
								ack: true,
							})
								.then(() => {
									this.log.debug(`Successfully set state 'supportsMotionDetectionEvents' ('.capabilities.supportsMotionDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'.`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while setting state 'supportsMotionDetectionEvents' ('.capabilities.supportsMotionDetectionEvents') for device: '${deviceName}' (Device ID: '${deviceID}') to 'FALSE': ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});
						}
					} catch {
						if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
							errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
						}
					}

					// Trait: CameraPerson (supports person detection events)
					this.log.debug(`Creating state 'supportsPersonDetectionEvents' ('.capabilities.supportsPersonDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}')...`);
					try {
						await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.supportsPersonDetectionEvents", {
							type: "state",
							common: {
								name: "Supports Person Detection Events",
								type: "boolean",
								role: "indicator",
								write: false,
								read: true,
							},
							native: {},
						})
							.then(() => {
								this.log.debug(`Successfully created state 'supportsPersonDetectionEvents' ('.capabilities.supportsPersonDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}').`);
							})
							.catch((error) => {
								const errorMessage = `ERROR: Error while creating state 'supportsPersonDetectionEvents' ('.capabilities.supportsPersonDetectionEvents') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
								this.log.error(errorMessage);
								throw new Error(errorMessage);
							});

						if (device.traits["sdm.devices.traits.CameraPerson"]) {
							this.log.debug(`Setting state 'supportsPersonDetectionEvents' ('.capabilities.supportsPersonDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'...`);
							await this.setStateAsync("devices." + deviceID + ".capabilities.supportsPersonDetectionEvents", {
								val: true,
								ack: true,
							})
								.then(() => {
									this.log.debug(`Successfully set state 'supportsPersonDetectionEvents' ('.capabilities.supportsPersonDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'.`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while setting state 'supportsPersonDetectionEvents' ('.capabilities.supportsPersonDetectionEvents') for device: '${deviceName}' (Device ID: '${deviceID}') to 'TRUE': ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});
						} else {
							this.log.debug(`Setting state 'supportsPersonDetectionEvents' ('.capabilities.supportsPersonDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'...`);
							await this.setStateAsync("devices." + deviceID + ".capabilities.supportsPersonDetectionEvents", {
								val: false,
								ack: true,
							})
								.then(() => {
									this.log.debug(`Successfully set state 'supportsPersonDetectionEvents' ('.capabilities.supportsPersonDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'.`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while setting state 'supportsPersonDetectionEvents' ('.capabilities.supportsPersonDetectionEvents') for device: '${deviceName}' (Device ID: '${deviceID}') to 'FALSE': ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});
						}
					} catch {
						if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
							errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
						}
					}

					// Trait: CameraSound (supports sound detection events)
					this.log.debug(`Creating state 'supportsSoundDetectionEvents' ('.capabilities.supportsSoundDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}')...`);
					try {
						await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.supportsSoundDetectionEvents", {
							type: "state",
							common: {
								name: "Supports Sound Detection Events",
								type: "boolean",
								role: "indicator",
								write: false,
								read: true,
							},
							native: {},
						})
							.then(() => {
								this.log.debug(`Successfully created state 'supportsSoundDetectionEvents' ('.capabilities.supportsSoundDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}').`);
							})
							.catch((error) => {
								const errorMessage = `ERROR: Error while creating state 'supportsSoundDetectionEvents' ('.capabilities.supportsSoundDetectionEvents') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
								this.log.error(errorMessage);
								throw new Error(errorMessage);
							});

						if (device.traits["sdm.devices.traits.CameraSound"]) {
							this.log.debug(`Setting state 'supportsSoundDetectionEvents' ('.capabilities.supportsSoundDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'...`);
							await this.setStateAsync("devices." + deviceID + ".capabilities.supportsSoundDetectionEvents", {
								val: true,
								ack: true,
							})
								.then(() => {
									this.log.debug(`Successfully set state 'supportsSoundDetectionEvents' ('.capabilities.supportsSoundDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'.`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while setting state 'supportsSoundDetectionEvents' ('.capabilities.supportsSoundDetectionEvents') for device: '${deviceName}' (Device ID: '${deviceID}') to 'TRUE': ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});
						} else {
							this.log.debug(`Setting state 'supportsSoundDetectionEvents' ('.capabilities.supportsSoundDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'...`);
							await this.setStateAsync("devices." + deviceID + ".capabilities.supportsSoundDetectionEvents", {
								val: false,
								ack: true,
							})
								.then(() => {
									this.log.debug(`Successfully set state 'supportsSoundDetectionEvents' ('.capabilities.supportsSoundDetectionEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'.`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while setting state 'supportsSoundDetectionEvents' ('.capabilities.supportsSoundDetectionEvents') for device: '${deviceName}' (Device ID: '${deviceID}') to 'FALSE': ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});
						}
					} catch {
						if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
							errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
						}
					}

					// Trait: CameraEventImage (supports generating event images)
					this.log.debug(`Creating state 'supportsGeneratingEventImages' ('.capabilities.supportsGeneratingEventImages') for device '${deviceName}' (Device ID: '${deviceID}')...`);
					try {
						await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.supportsGeneratingEventImages", {
							type: "state",
							common: {
								name: "Supports Generating Event Images",
								type: "boolean",
								role: "indicator",
								write: false,
								read: true,
							},
							native: {},
						})
							.then(() => {
								this.log.debug(`Successfully created state 'supportsGeneratingEventImages' ('.capabilities.supportsGeneratingEventImages') for device '${deviceName}' (Device ID: '${deviceID}').`);
							})
							.catch((error) => {
								const errorMessage = `ERROR: Error while creating state 'supportsGeneratingEventImages' ('.capabilities.supportsGeneratingEventImages') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
								this.log.error(errorMessage);
								throw new Error(errorMessage);
							});

						if (device.traits["sdm.devices.traits.CameraEventImage"]) {
							this.log.debug(`Setting state 'supportsGeneratingEventImages' ('.capabilities.supportsGeneratingEventImages') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'...`);
							await this.setStateAsync("devices." + deviceID + ".capabilities.supportsGeneratingEventImages", {
								val: true,
								ack: true,
							})
								.then(() => {
									this.log.debug(`Successfully set state 'supportsGeneratingEventImages' ('.capabilities.supportsGeneratingEventImages') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'.`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while setting state 'supportsGeneratingEventImages' ('.capabilities.supportsGeneratingEventImages') for device: '${deviceName}' (Device ID: '${deviceID}') to 'TRUE': ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});
						} else {
							this.log.debug(`Setting state 'supportsGeneratingEventImages' ('.capabilities.supportsGeneratingEventImages') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'...`);
							await this.setStateAsync("devices." + deviceID + ".capabilities.supportsGeneratingEventImages", {
								val: false,
								ack: true,
							})
								.then(() => {
									this.log.debug(`Successfully set state 'supportsGeneratingEventImages' ('.capabilities.supportsGeneratingEventImages') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'.`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while setting state 'supportsGeneratingEventImages' ('.capabilities.supportsGeneratingEventImages') for device: '${deviceName}' (Device ID: '${deviceID}') to 'FALSE': ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});
						}
					} catch {
						if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
							errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
						}
					}

					// ONLY for DOORBELLS
					if (deviceType.toLowerCase() === "doorbell") {
						// Trait: CameraClipPreview (supports download of clip preview)
						this.log.debug(`Creating state 'supportsDownloadOfClipPreview' ('.capabilities.supportsDownloadOfClipPreview') for device '${deviceName}' (Device ID: '${deviceID}')...`);
						try {
							await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.supportsDownloadOfClipPreview", {
								type: "state",
								common: {
									name: "Supports Download of Clip Preview",
									type: "boolean",
									role: "indicator",
									write: false,
									read: true,
								},
								native: {},
							})
								.then(() => {
									this.log.debug(`Successfully created state 'supportsDownloadOfClipPreview' ('.capabilities.supportsDownloadOfClipPreview') for device '${deviceName}' (Device ID: '${deviceID}').`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while creating state 'supportsDownloadOfClipPreview' ('.capabilities.supportsDownloadOfClipPreview') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});

							if (device.traits["sdm.devices.traits.CameraClipPreview"]) {
								this.log.debug(`Setting state 'supportsDownloadOfClipPreview' ('.capabilities.supportsDownloadOfClipPreview') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'...`);
								await this.setStateAsync("devices." + deviceID + ".capabilities.supportsDownloadOfClipPreview", {
									val: true,
									ack: true,
								})
									.then(() => {
										this.log.debug(`Successfully set state 'supportsDownloadOfClipPreview' ('.capabilities.supportsDownloadOfClipPreview') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'.`);
									})
									.catch((error) => {
										const errorMessage = `ERROR: Error while setting state 'supportsDownloadOfClipPreview' ('.capabilities.supportsDownloadOfClipPreview') for device: '${deviceName}' (Device ID: '${deviceID}') to 'TRUE': ${error}`;
										this.log.error(errorMessage);
										throw new Error(errorMessage);
									});
							} else {
								this.log.debug(`Setting state 'supportsDownloadOfClipPreview' ('.capabilities.supportsDownloadOfClipPreview') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'...`);
								await this.setStateAsync("devices." + deviceID + ".capabilities.supportsDownloadOfClipPreview", {
									val: false,
									ack: true,
								})
									.then(() => {
										this.log.debug(`Successfully set state 'supportsDownloadOfClipPreview' ('.capabilities.supportsDownloadOfClipPreview') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'.`);
									})
									.catch((error) => {
										const errorMessage = `ERROR: Error while setting state 'supportsDownloadOfClipPreview' ('.capabilities.supportsDownloadOfClipPreview') for device: '${deviceName}' (Device ID: '${deviceID}') to 'FALSE': ${error}`;
										this.log.error(errorMessage);
										throw new Error(errorMessage);
									});
							}
						} catch {
							if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
								errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
							}
						}

						// Trait: DoorbellChime (supports doorbell chime and related press events)
						this.log.debug(`Creating state 'supportsDoorbellChimeAndRelatedPressEvents' ('.capabilities.supportsDoorbellChimeAndRelatedPressEvents') for device '${deviceName}' (Device ID: '${deviceID}')...`);
						try {
							await this.setObjectNotExistsAsync("devices." + deviceID + ".capabilities.supportsDoorbellChimeAndRelatedPressEvents", {
								type: "state",
								common: {
									name: "Supports Doorbell Chime & related Press Events",
									type: "boolean",
									role: "indicator",
									write: false,
									read: true,
								},
								native: {},
							})
								.then(() => {
									this.log.debug(`Successfully created state 'supportsDoorbellChimeAndRelatedPressEvents' ('.capabilities.supportsDoorbellChimeAndRelatedPressEvents') for device '${deviceName}' (Device ID: '${deviceID}').`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while creating state 'supportsDoorbellChimeAndRelatedPressEvents' ('.capabilities.supportsDoorbellChimeAndRelatedPressEvents') for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});

							if (device.traits["sdm.devices.traits.DoorbellChime"]) {
								this.log.debug(`Setting state 'supportsDoorbellChimeAndRelatedPressEvents' ('.capabilities.supportsDoorbellChimeAndRelatedPressEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'...`);
								await this.setStateAsync("devices." + deviceID + ".capabilities.supportsDoorbellChimeAndRelatedPressEvents", {
									val: true,
									ack: true,
								})
									.then(() => {
										this.log.debug(`Successfully set state 'supportsDoorbellChimeAndRelatedPressEvents' ('.capabilities.supportsDoorbellChimeAndRelatedPressEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'TRUE'.`);
									})
									.catch((error) => {
										const errorMessage = `ERROR: Error while setting state 'supportsDoorbellChimeAndRelatedPressEvents' ('.capabilities.supportsDoorbellChimeAndRelatedPressEvents') for device: '${deviceName}' (Device ID: '${deviceID}') to 'TRUE': ${error}`;
										this.log.error(errorMessage);
										throw new Error(errorMessage);
									});
							} else {
								this.log.debug(`Setting state 'supportsDoorbellChimeAndRelatedPressEvents' ('.capabilities.supportsDoorbellChimeAndRelatedPressEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'...`);
								await this.setStateAsync("devices." + deviceID + ".capabilities.supportsDoorbellChimeAndRelatedPressEvents", {
									val: false,
									ack: true,
								})
									.then(() => {
										this.log.debug(`Successfully set state 'supportsDoorbellChimeAndRelatedPressEvents' ('.capabilities.supportsDoorbellChimeAndRelatedPressEvents') for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'.`);
									})
									.catch((error) => {
										const errorMessage = `ERROR: Error while setting state 'supportsDoorbellChimeAndRelatedPressEvents' ('.capabilities.supportsDoorbellChimeAndRelatedPressEvents') for device: '${deviceName}' (Device ID: '${deviceID}') to 'FALSE': ${error}`;
										this.log.error(errorMessage);
										throw new Error(errorMessage);
									});
							}
						} catch {
							if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
								errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
							}
						}
					}

					// ONLY for THERMOSTATS
					if (deviceType.toLowerCase() === "thermostat") {
						// TODO: IMPLEMENT THIS.
					}
				}

				// For THERMOSTATS...
				if (deviceType.toLowerCase() === "thermostat") {
					let creatingCapabilitiesChannelSuccess = false;
					try {
						await this.createChannelWithNameAndDescriptionAtPathIfNotExists("devices." + deviceID + ".capabilities", "Capabilities", "The devices' capabilities", deviceID, deviceName);
						creatingCapabilitiesChannelSuccess = await this.checkIfChannelExists("devices." + deviceID + ".capabilities");
					} catch {
						if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
							errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
						}
					}

					// Trait: Connectivity
					if (creatingCapabilitiesChannelSuccess && device.traits["sdm.devices.traits.Connectivity"].status) {
						this.log.debug(`Creating state 'connectivityStatus' for device '${deviceName}' (Device ID: '${deviceID}')...`);
						try {
							await this.setObjectNotExistsAsync("devices." + deviceID + ".connectivityStatus", {
								type: "state",
								common: {
									name: "Connectivity Status",
									type: "string",
									role: "indicator.state",
									write: false,
									read: true,
								},
								native: {},
							})
								.then(() => {
									this.log.debug(`Successfully created state 'connectivityStatus' for device '${deviceName}' (Device ID: '${deviceID}').`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while creating state 'connectivityStatus' for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});

							const connectivityStatus = device.traits["sdm.devices.traits.Connectivity"].status;
							this.log.debug(`Setting state 'connectivityStatus' for device '${deviceName}' (Device ID: '${deviceID}') to '${connectivityStatus}'...`);
							await this.setStateAsync("devices." + deviceID + ".connectivityStatus", {
								val: connectivityStatus,
								ack: true,
							})
								.then(() => {
									this.log.debug(`Successfully set state 'connectivityStatus' for device '${deviceName}' (Device ID: '${deviceID}') to '${connectivityStatus}'.`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while setting state 'connectivityStatus' for device: '${deviceName}' (Device ID: '${deviceID}') to '${connectivityStatus}': ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});
						} catch {
							if (!errorsOccurredDuringStateCreationForDevicesWithID.includes(deviceID)) {
								errorsOccurredDuringStateCreationForDevicesWithID.push(deviceID);
							}
						}
					}
				}
			}

			this.log.debug(`Finished creating states for found devices!`);

			if (errorsOccurredDuringStateCreationForDevicesWithID.length > 0) {
				this.log.warn(`Errors occurred during the creation of states for following devices: ${errorsOccurredDuringStateCreationForDevicesWithID}`);
			}
		} else {
			this.log.debug(`No devices found`);
			return true;
		}
	}

	/**************************************************************************************************************************************
	 * Validates the provided device type (device type name as a string).
	 *
	 * This function checks if the provided device type (device type name as a string) is valid by comparing it against a predefined list
	 * of supported device types (device type names as strings).
	 *
	 * Currently (as of April 23rd 2024) the only valid device types are: 'Camera', 'Doorbell', 'Thermostat' & 'Display'.
	 *
	 * @param {string} type - The device type to validate (device type name as a string).
	 * @returns {boolean} True if the device type is valid, false otherwise.
	 * @throws {Error} If the provided device type is undefined, not a string, or empty.
	 **************************************************************************************************************************************/
	validateDeviceType(type) {
		if (typeof type === "undefined") {
			throw new Error("Undefined parameter for function 'validateDeviceType': The 'type' parameter must be provided!");
		} else if (typeof type !== "string") {
			throw new Error("Invalid parameter for function 'validateDeviceType': The 'type' parameter must be of type 'string'!");
		} else if (type === "" || type.length === 0) {
			throw new Error("Invalid parameter for function 'validateDeviceType': The 'type' parameter must have a value!");
		}

		if (["camera", "doorbell", "thermostat", "display"].includes(type.toLowerCase())) {
			return true;
		} else {
			return false;
		}
	}

	/**************************************************************************************************************************************
	 * Creates a folder for devices if it does not already exist in the adapter's object structure.
	 *
	 * This function checks if a folder named "Devices" exists in the adapter's object structure. If the folder does not exist, it creates
	 * the folder. If the folder already exists, it logs a message indicating that the folder is already present.
	 *
	 * @returns {Promise<void>} A promise indicating the completion of the folder creation process.
	 * @throws {Error} If an error occurs during the folder creation process.
	 **************************************************************************************************************************************/
	async createFolderForDevicesIfItDoesNotExist() {
		this.log.debug(`Creating folder for devices if necessary...`);

		await this.setObjectNotExistsAsync(this.ioBrokerObjectID_folder_devices, {
			type: "folder",
			common: {
				name: this.ioBrokerObjectName_folder_devices,
			},
			native: {},
		})
			.then((folderCreationResult) => {
				if (folderCreationResult) {
					this.log.debug(`Folder for devices successfully created.`);
				} else {
					this.log.debug(`Folder for devices does already exist.`);
				}
			})
			.catch((error) => {
				const errorMessage = `ERROR: Error while creating folder for devices: ${error}`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});
	}

	/**************************************************************************************************************************************
	 * Retrieves the 'Device ID' from the given 'JSON Device Name'.
	 *
	 * This function extracts the 'Device ID' from the provided 'JSON Device Name'.
	 * In the context of Google Smart Home devices, the JSON response includes both a technical identifier and a user-friendly custom name.
	 * While the JSON structure includes two keys, 'name' and 'customName',
	 * this adapter considers the 'customName' to be the primary human-readable name of the device: "Device Name".
	 * The value of the 'name' key of the JSON response is considered to include the 'Device ID' as a substring.
	 *
	 * The 'name' key in the JSON response typically follows this format:
	 * 'enterprises/{'SOME_ENTERPRISE_ID'}/devices/{'VALUE_BEING_CONSIDERED_AS_DEVICE_ID'}'.
	 * This adapter considers the 'VALUE_BEING_CONSIDERED_AS_DEVICE_ID' part of this value to be the 'Device ID'.
	 *
	 * However, for this function, the parameter 'jsonDeviceName' should receive the full value of the 'name' key from the returned JSON,
	 * as the target of this function is to retrieve the 'Device ID' part from the 'JSON Device Name'.
	 *
	 * @param {string} jsonDeviceName - The JSON device name, which includes the 'Device ID'.
	 * @returns {string} The 'Device ID' extracted from the 'JSON Device Name', or the original 'JSON Device Name' if no 'Device ID' could be extracted from the 'JSON Device Name'.
	 * @throws {Error} If the provided 'JSON Device Name' is undefined, not a string, or empty.
	 **************************************************************************************************************************************/
	getDeviceIDfromDeviceName(jsonDeviceName) {
		if (typeof jsonDeviceName === "undefined") {
			throw new Error("Undefined parameter for function 'getDeviceIDfromDeviceName': The 'deviceType' parameter must be provided!");
		} else if (typeof jsonDeviceName !== "string") {
			throw new Error("Invalid parameter for function 'getDeviceIDfromDeviceName': The 'deviceType' parameter must be of type 'string'!");
		} else if (jsonDeviceName === "" || jsonDeviceName.length === 0) {
			throw new Error("Invalid parameter for function 'getDeviceIDfromDeviceName': The 'deviceType' parameter must have a value!");
		}

		if (jsonDeviceName.includes("/devices/")) {
			// Find the index of "/devices/"
			const indexAfterDevices = jsonDeviceName.indexOf("/devices/") + "/devices/".length;

			// Extract the substring after "/devices/"
			const deviceID = jsonDeviceName.substring(indexAfterDevices);

			return deviceID;
		} else {
			return jsonDeviceName;
		}
	}

	/**************************************************************************************************************************************
	 * Creates a channel with the specified name and description at the given path if it does not already exist.
	 *
	 * This function creates a channel with the specified name and description at the provided path if it does not already exist.
	 * If the description is not provided, the channel is created without a description.
	 * The 'path' parameter specifies the path where the channel should be created.
	 * The 'channelName' parameter specifies the name of the channel.
	 * The 'description' parameter, if provided, specifies the description of the channel.
	 * Optionally, you can provide the 'deviceID' and 'deviceName' parameters to log additional information about the associated device.
	 *
	 * @param {string} path - The path where the channel should be created.
	 * @param {string} channelName - The name of the channel.
	 * @param {string} [description] - The description of the channel (optional).
	 * @param {string} [deviceID] - The ID of the associated device (optional).
	 * @param {string} [deviceName] - The name of the associated device (optional).
	 * @returns {Promise<void>} A promise that resolves after the channel is created or rejects if an error occurs.
	 * @throws {Error} If any of the required parameters are undefined, not of the correct type, or have an empty value.
	 **************************************************************************************************************************************/
	async createChannelWithNameAndDescriptionAtPathIfNotExists(path, channelName, description, deviceID, deviceName) {
		if (typeof path === "undefined") {
			throw new Error("Undefined parameter for function 'createChannelWithNameAndDescriptionAtPathIfNotExists': The 'path' parameter must be provided!");
		} else if (typeof path !== "string") {
			throw new Error("Invalid parameter for function 'createChannelWithNameAndDescriptionAtPathIfNotExists': The 'path' parameter must be of type 'string'!");
		} else if (path === "" || path.length === 0) {
			throw new Error("Invalid parameter for function 'createChannelWithNameAndDescriptionAtPathIfNotExists': The 'path' parameter must have a value!");
		}

		if (typeof channelName === "undefined") {
			throw new Error("Undefined parameter for function 'createChannelWithNameAndDescriptionAtPathIfNotExists': The 'channelName' parameter must be provided!");
		} else if (typeof channelName !== "string") {
			throw new Error("Invalid parameter for function 'createChannelWithNameAndDescriptionAtPathIfNotExists': The 'channelName' parameter must be of type 'string'!");
		} else if (channelName === "" || channelName.length === 0) {
			throw new Error("Invalid parameter for function 'createChannelWithNameAndDescriptionAtPathIfNotExists': The 'channelName' parameter must have a value!");
		}

		if (typeof description !== "undefined") {
			if (typeof description !== "string") {
				throw new Error("Invalid parameter for function 'createChannelWithNameAndDescriptionAtPathIfNotExists': The 'description' parameter (if defined) must be of type 'string'!");
			}
		}

		if (deviceID && deviceName) {
			this.log.debug(`Creating channel with name '${channelName}' for device with name '${deviceName}' (Device ID: '${deviceID}')...`);
		} else {
			this.log.debug(`Creating channel with name '${channelName}' for device...`);
		}
		await this.setObjectNotExistsAsync(path, {
			type: "channel",
			common: {
				name: channelName,
				desc: description,
			},
			native: {},
		})
			.then(() => {
				if (deviceID && deviceName) {
					this.log.debug(`Successfully created channel with name '${channelName}' for device with name '${deviceName}' (Device ID: '${deviceID}').`);
				} else {
					this.log.debug(`Successfully created channel with name '${channelName}' for device.`);
				}
			})
			.catch((error) => {
				let errorMessage;
				if (deviceID && deviceName) {
					errorMessage = `ERROR: Error while creating channel with name '${channelName}' for device with name '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
				} else {
					errorMessage = `ERROR: Error while creating channel with name '${channelName}' for device: ${error}`;
				}
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			});
	}

	/**************************************************************************************************************************************
	 * Checks if a channel exists at the specified path.
	 *
	 * This function validates the input parameter 'path' to ensure it's provided, of type string, and not empty.
	 * It attempts to retrieve an object at the specified path using 'getObjectAsync'. If the retrieval is successful,
	 * it returns true, indicating that the channel exists. If there's an error during the retrieval process,
	 * it logs the error and returns false.
	 *
	 * @param {string} path - The path of the channel to check.
	 * @returns {Promise<boolean>} A boolean value indicating whether the channel exists at the specified path.
	 * @throws {Error} If the provided path is undefined, not a string, or empty.
	 **************************************************************************************************************************************/
	async checkIfChannelExists(path) {
		if (typeof path === "undefined") {
			throw new Error("Undefined parameter for function 'checkIfChannelExists': The 'path' parameter must be provided!");
		} else if (typeof path !== "string") {
			throw new Error("Invalid parameter for function 'checkIfChannelExists': The 'path' parameter must be of type 'string'!");
		} else if (path === "" || path.length === 0) {
			throw new Error("Invalid parameter for function 'checkIfChannelExists': The 'path' parameter must have a value!");
		}

		try {
			const object = await this.getObjectAsync(path);
			return !!object; // Convert object to boolean
		} catch (error) {
			console.error(`Error checking if channel exists at ${path}:`, error);
			return false; // Return false in case of error
		}
	}

	/**************************************************************************************************************************************
	 * Creates the object structure for 'Events' for each device.
	 * Retrieves stored devices, creates 'Events' channels for each device, and sets up boolean states for various event types.
	 * The boolean state for each event type will be initially set to 'false'.
	 *
	 * @returns {Promise<void>} A Promise that resolves once the object structure for 'Events' for each device has been created.
	 *
	 * @todo Maybe the way the device capabilites are acquired from the objects here should be changed later once we added a class for
	 * 		 'Device' and 'DeviceCapabilities' and changed the function that creates the object structure for the devices.
	 **************************************************************************************************************************************/
	async createObjectStructureForEventsForEachDevice() {
		this.log.info(`Creating object structure for 'Events' for each device...`);

		// Get stored devices
		const storedDevices = await this.getDevicesAsync();

		for (const device of storedDevices) {
			const deviceID_object = await this.getStateAsync(device._id + ".deviceID");
			const deviceID = deviceID_object?.val?.toString();
			const deviceName_object = await this.getStateAsync(device._id + ".deviceName");
			const deviceName = deviceName_object?.val?.toString();

			this.log.info(`Creating object structure for 'Events' for device: '${deviceName}' (Device ID: '${deviceID}')...`);

			// Create 'Events' channel for device
			try {
				await this.createChannelWithNameAndDescriptionAtPathIfNotExists("devices." + deviceID + ".events", "Events", "The events that occurred for the device", deviceID, deviceName);
			} catch (error) {
				const errorMessage = `ERROR: Error while creating channel for events of device: '${deviceName}' (Device ID: '${deviceID}')!`;
				this.log.error(errorMessage);
				continue;
			}

			// Get device capabilities (for capabilities that support events)
			const ioBrokerObjectID_channel_capabilities = "devices." + deviceID + ".capabilities";
			let errorOccurred = false;

			const supportsMotionDetectionEvents_state = await this.getStateAsync(ioBrokerObjectID_channel_capabilities + ".supportsMotionDetectionEvents");
			if (supportsMotionDetectionEvents_state && supportsMotionDetectionEvents_state.val) {
				try {
					const ioBrokerObjectID_state_motionDetected = "devices." + deviceID + ".events.motionDetected";
					const ioBrokerObjectName_state_motionDetected = "Motion detected";

					this.log.debug(`Creating state '${ioBrokerObjectName_state_motionDetected}' for device '${deviceName}' (Device ID: '${deviceID}')...`);
					await this.setObjectNotExistsAsync(ioBrokerObjectID_state_motionDetected, {
						type: "state",
						common: {
							name: ioBrokerObjectName_state_motionDetected,
							type: "boolean",
							role: "indicator.state",
							write: false,
							read: true,
						},
						native: {},
					})
						.then(() => {
							this.log.debug(`Successfully created state '${ioBrokerObjectName_state_motionDetected}' for device '${deviceName}' (Device ID: '${deviceID}').`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while creating state '${ioBrokerObjectName_state_motionDetected}' for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});

					this.log.debug(`Setting state '${ioBrokerObjectName_state_motionDetected}' for device '${deviceName}' (Device ID: '${deviceID}')  to 'FALSE'...`);
					await this.setStateAsync(ioBrokerObjectID_state_motionDetected, {
						val: false,
						ack: true,
					})
						.then(() => {
							this.log.debug(`Successfully set state '${ioBrokerObjectName_state_motionDetected}' for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'.`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while setting state '${ioBrokerObjectName_state_motionDetected}' for device: '${deviceName}' (Device ID: '${deviceID}') to 'FALSE': ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});
				} catch {
					errorOccurred = true;
				}

				// Start monitoring the state for changes
				try {
					const ioBrokerObjectID_state_motionDetected = "devices." + deviceID + ".events.motionDetected";
					await this.subscribeStatesAsync(ioBrokerObjectID_state_motionDetected);
					this.monitoredEventStates.push(ioBrokerObjectID_state_motionDetected);
				} catch (error) {
					errorOccurred = true;
				}
			}

			const supportsPersonDetectionEvents_state = await this.getStateAsync(ioBrokerObjectID_channel_capabilities + ".supportsPersonDetectionEvents");
			if (supportsPersonDetectionEvents_state && supportsPersonDetectionEvents_state.val) {
				try {
					const ioBrokerObjectID_state_personDetected = "devices." + deviceID + ".events.personDetected";
					const ioBrokerObjectName_state_personDetected = "Person detected";

					this.log.debug(`Creating state '${ioBrokerObjectName_state_personDetected}' for device '${deviceName}' (Device ID: '${deviceID}')...`);
					await this.setObjectNotExistsAsync(ioBrokerObjectID_state_personDetected, {
						type: "state",
						common: {
							name: ioBrokerObjectName_state_personDetected,
							type: "boolean",
							role: "indicator.state",
							write: false,
							read: true,
						},
						native: {},
					})
						.then(() => {
							this.log.debug(`Successfully created state '${ioBrokerObjectName_state_personDetected}' for device '${deviceName}' (Device ID: '${deviceID}').`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while creating state '${ioBrokerObjectName_state_personDetected}' for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});

					this.log.debug(`Setting state '${ioBrokerObjectName_state_personDetected}' for device '${deviceName}' (Device ID: '${deviceID}')  to 'FALSE'...`);
					await this.setStateAsync(ioBrokerObjectID_state_personDetected, {
						val: false,
						ack: true,
					})
						.then(() => {
							this.log.debug(`Successfully set state '${ioBrokerObjectName_state_personDetected}' for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'.`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while setting state '${ioBrokerObjectName_state_personDetected}' for device: '${deviceName}' (Device ID: '${deviceID}') to 'FALSE': ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});
				} catch {
					errorOccurred = true;
				}

				// Start monitoring the state for changes
				try {
					const ioBrokerObjectID_state_motionDetected = "devices." + deviceID + ".events.personDetected";
					await this.subscribeStatesAsync(ioBrokerObjectID_state_motionDetected);
					this.monitoredEventStates.push(ioBrokerObjectID_state_motionDetected);
				} catch (error) {
					errorOccurred = true;
				}
			}

			const supportsSoundDetectionEvents_state = await this.getStateAsync(ioBrokerObjectID_channel_capabilities + ".supportsSoundDetectionEvents");
			if (supportsSoundDetectionEvents_state && supportsSoundDetectionEvents_state.val) {
				try {
					const ioBrokerObjectID_state_soundDetected = "devices." + deviceID + ".events.soundDetected";
					const ioBrokerObjectName_state_soundDetected = "Sound detected";

					this.log.debug(`Creating state '${ioBrokerObjectName_state_soundDetected}' for device '${deviceName}' (Device ID: '${deviceID}')...`);
					await this.setObjectNotExistsAsync(ioBrokerObjectID_state_soundDetected, {
						type: "state",
						common: {
							name: ioBrokerObjectName_state_soundDetected,
							type: "boolean",
							role: "indicator.state",
							write: false,
							read: true,
						},
						native: {},
					})
						.then(() => {
							this.log.debug(`Successfully created state '${ioBrokerObjectName_state_soundDetected}' for device '${deviceName}' (Device ID: '${deviceID}').`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while creating state '${ioBrokerObjectName_state_soundDetected}' for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});

					this.log.debug(`Setting state '${ioBrokerObjectName_state_soundDetected}' for device '${deviceName}' (Device ID: '${deviceID}')  to 'FALSE'...`);
					await this.setStateAsync(ioBrokerObjectID_state_soundDetected, {
						val: false,
						ack: true,
					})
						.then(() => {
							this.log.debug(`Successfully set state '${ioBrokerObjectName_state_soundDetected}' for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'.`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while setting state '${ioBrokerObjectName_state_soundDetected}' for device: '${deviceName}' (Device ID: '${deviceID}') to 'FALSE': ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});
				} catch {
					errorOccurred = true;
				}

				// Start monitoring the state for changes
				try {
					const ioBrokerObjectID_state_motionDetected = "devices." + deviceID + ".events.soundDetected";
					await this.subscribeStatesAsync(ioBrokerObjectID_state_motionDetected);
					this.monitoredEventStates.push(ioBrokerObjectID_state_motionDetected);
				} catch (error) {
					errorOccurred = true;
				}
			}

			const supportsDoorbellChimeAndRelatedPressEvents_state = await this.getStateAsync(ioBrokerObjectID_channel_capabilities + ".supportsDoorbellChimeAndRelatedPressEvents");
			if (supportsDoorbellChimeAndRelatedPressEvents_state && supportsDoorbellChimeAndRelatedPressEvents_state.val) {
				try {
					const ioBrokerObjectID_state_doorbellPressDetected = "devices." + deviceID + ".events.doorbellPressDetected";
					const ioBrokerObjectName_state_doorbellPressDetected = "Doorbell press detected";

					this.log.debug(`Creating state '${ioBrokerObjectName_state_doorbellPressDetected}' for device '${deviceName}' (Device ID: '${deviceID}')...`);
					await this.setObjectNotExistsAsync(ioBrokerObjectID_state_doorbellPressDetected, {
						type: "state",
						common: {
							name: ioBrokerObjectName_state_doorbellPressDetected,
							type: "boolean",
							role: "indicator.state",
							write: false,
							read: true,
						},
						native: {},
					})
						.then(() => {
							this.log.debug(`Successfully created state '${ioBrokerObjectName_state_doorbellPressDetected}' for device '${deviceName}' (Device ID: '${deviceID}').`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while creating state '${ioBrokerObjectName_state_doorbellPressDetected}' for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});

					this.log.debug(`Setting state '${ioBrokerObjectName_state_doorbellPressDetected}' for device '${deviceName}' (Device ID: '${deviceID}')  to 'FALSE'...`);
					await this.setStateAsync(ioBrokerObjectID_state_doorbellPressDetected, {
						val: false,
						ack: true,
					})
						.then(() => {
							this.log.debug(`Successfully set state '${ioBrokerObjectName_state_doorbellPressDetected}' for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'.`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while setting state '${ioBrokerObjectName_state_doorbellPressDetected}' for device: '${deviceName}' (Device ID: '${deviceID}') to 'FALSE': ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});
				} catch {
					errorOccurred = true;
				}

				// Start monitoring the state for changes
				try {
					const ioBrokerObjectID_state_motionDetected = "devices." + deviceID + ".events.doorbellPressDetected";
					await this.subscribeStatesAsync(ioBrokerObjectID_state_motionDetected);
					this.monitoredEventStates.push(ioBrokerObjectID_state_motionDetected);
				} catch (error) {
					errorOccurred = true;
				}
			}

			const supportsDownloadOfClipPreview_state = await this.getStateAsync(ioBrokerObjectID_channel_capabilities + ".supportsDownloadOfClipPreview");
			if (supportsDownloadOfClipPreview_state && supportsDownloadOfClipPreview_state.val) {
				try {
					const ioBrokerObjectID_state_videoClipAvailableForDownload = "devices." + deviceID + ".events.videoClipAvailableForDownload";
					const ioBrokerObjectName_state_videoClipAvailableForDownload = "Video Clip available for download";

					this.log.debug(`Creating state '${ioBrokerObjectName_state_videoClipAvailableForDownload}' for device '${deviceName}' (Device ID: '${deviceID}')...`);
					await this.setObjectNotExistsAsync(ioBrokerObjectID_state_videoClipAvailableForDownload, {
						type: "state",
						common: {
							name: ioBrokerObjectName_state_videoClipAvailableForDownload,
							type: "boolean",
							role: "indicator.state",
							write: false,
							read: true,
						},
						native: {},
					})
						.then(() => {
							this.log.debug(`Successfully created state '${ioBrokerObjectName_state_videoClipAvailableForDownload}' for device '${deviceName}' (Device ID: '${deviceID}').`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while creating state '${ioBrokerObjectName_state_videoClipAvailableForDownload}' for device: '${deviceName}' (Device ID: '${deviceID}'): ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});

					this.log.debug(`Setting state '${ioBrokerObjectName_state_videoClipAvailableForDownload}' for device '${deviceName}' (Device ID: '${deviceID}')  to 'FALSE'...`);
					await this.setStateAsync(ioBrokerObjectID_state_videoClipAvailableForDownload, {
						val: false,
						ack: true,
					})
						.then(() => {
							this.log.debug(`Successfully set state '${ioBrokerObjectName_state_videoClipAvailableForDownload}' for device '${deviceName}' (Device ID: '${deviceID}') to 'FALSE'.`);
						})
						.catch((error) => {
							const errorMessage = `ERROR: Error while setting state '${ioBrokerObjectName_state_videoClipAvailableForDownload}' for device: '${deviceName}' (Device ID: '${deviceID}') to 'FALSE': ${error}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						});
				} catch {
					errorOccurred = true;
				}

				// Start monitoring the state for changes
				try {
					const ioBrokerObjectID_state_motionDetected = "devices." + deviceID + ".events.videoClipAvailableForDownload";
					await this.subscribeStatesAsync(ioBrokerObjectID_state_motionDetected);
					this.monitoredEventStates.push(ioBrokerObjectID_state_motionDetected);
				} catch (error) {
					errorOccurred = true;
				}
			}

			if (!errorOccurred) {
				this.log.info(`Successfully created object structure for 'Events' for device: '${deviceName}' (Device ID: '${deviceID}').`);
			} else {
				const errorMessage = `ERROR: Error while creating object structure for events of device: '${deviceName}' (Device ID: '${deviceID}')! At least one object couldn't be created, set or subscribed too!`;
				this.log.error(errorMessage);
				continue;
			}
		}
	}

	/**************************************************************************************************************************************
	 * Calculates and stores the 'Pub/Sub Topic'.
	 *
	 * This function retrieves the project ID from the ioBroker state and uses it to calculate the 'Pub/Sub Topic'.
	 * If the 'Project ID' is valid, the 'Pub/Sub Topic' is calculated and stored in the ioBroker state.
	 * Otherwise, an error is thrown.
	 *
	 * IMPORTANT INFORMATION:
	 * This function assumes that the 'Pub/Sub Topic' follows the format:
	 * 'projects/sdm-prod/topics/enterprise-{'Project ID'}'.
	 * If this assumption is incorrect, adjustments to the code and the 'jsonConfig.json' may be necessary to allow manual declaration of the 'Pub/Sub Topic'.
	 *
	 * @throws {Error} If there is an error during the calculation or storing of the 'Pub/Sub Topic'.
	 **************************************************************************************************************************************/
	async calculateAndStorePubSubTopic() {
		this.log.info(`Calculating 'Pub/Sub Topic'...`);

		try {
			const projectID_state = await this.getStateAsync(this.ioBrokerObjectID_state_projectID);
			const projectID = projectID_state?.val;

			if (projectID) {
				const pubSubTopic = "projects/sdm-prod/topics/enterprise-" + projectID;
				this.log.debug(`Successfully calculated 'Pub/Sub Topic': ${pubSubTopic}`);

				this.log.debug(`Storing 'Pub/Sub Topic'... Setting object state '${this.ioBrokerObjectID_state_pubSubTopic}' to value '${pubSubTopic}'...`);
				await this.setStateAsync(this.ioBrokerObjectID_state_pubSubTopic, {
					val: pubSubTopic,
					ack: true,
				});

				this.log.debug(`Successfully stored 'Pub/Sub Topic'.`);
			} else {
				throw new Error(`Error while calculating 'Pub/Sub Topic'! Invalid 'Project ID': '${projectID}'!`);
			}
		} catch (error) {
			const errorMessage = `ERROR: ${error.message}`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**************************************************************************************************************************************
	 * Subscribes to Google's 'Pub/Sub System' with a 'PULL' subscription.
	 *
	 * @returns {Promise<void>} A Promise that resolves once the subscription process is completed.
	 * @throws {Error} If there is an error during the subscription process.
	 **************************************************************************************************************************************/
	async subscribeToGooglePubSubSystemWithAPullSubscription() {
		this.log.info(`Subscribing to Google's 'Pub/Sub System' with a 'PULL' subscription...`);

		// Update the global authentication variables first.
		await this.updateGlobalAuthenticationVariables();

		// Get authentication values from global variables.
		const accessToken = this.accessToken;
		const googleCloudProjectID = this.googleCloudProjectID;
		const pubSubTopic = this.pubSubTopic;

		if (accessToken) {
			if (googleCloudProjectID) {
				const hostname = os.hostname();

				// Construct the request data
				const requestData = {
					topic: pubSubTopic,
					name: `projects/${googleCloudProjectID}/subscriptions/${hostname}`,
					messageRetentionDuration: "600s",
				};

				// Set up the request config
				const config = {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				};

				// Construct URL
				const url = `https://pubsub.googleapis.com/v1/projects/${googleCloudProjectID}/subscriptions/${hostname}`;
				this.log.silly(`Subscribing to Google's 'Pub/Sub System' URL: ${url}`);

				// Send the HTTP request using axios
				await axios
					.put(url, requestData, config)
					.then((response) => {
						if (response) {
							this.log.debug(`Received "Subscribing to Google's 'Pub/Sub System'" response".`);
							this.log.silly(`Subscribing to Google's 'Pub/Sub System' response: ${response.status}: ${JSON.stringify(response.data)}`);
							if (response.status == 200) {
								this.log.info(`Successfully subscribed to Google's 'Pub/Sub System' with a 'PULL' subscription with 'Abo ID': '${hostname}'`);
							} else {
								this.log.info(`Subscription to Google's 'Pub/Sub System' with a 'PULL' subscription with 'Abo ID': '${hostname}' should have been successful.`);
							}
						}
					})
					.catch((error) => {
						if (error.response) {
							// The request was made and the server responded with a status code
							// that falls out of the range of 2xx

							// Check for already existing subscription error
							if (error.response.data.error.code == "409" && error.response.data.error.status == "ALREADY_EXISTS") {
								this.log.info(`Subscription does already exist.`);
							} else {
								const errorMessage = `ERROR: Error while subscribing to Google's 'Pub/Sub System' with a 'PULL' subscription! Error: ${error.response.status} ('${error.response.data.error.status}'): ${error.response.data.error.message}`;
								this.log.error(errorMessage);
								throw new Error(errorMessage);
							}
						} else if (error.request) {
							// The request was made but no response was received
							const errorMessage = `ERROR: No response received while subscribing to Google's 'Pub/Sub System' with a 'PULL' subscription!`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						} else {
							// Something happened in setting up the request that triggered an Error
							const errorMessage = `ERROR: Error while setting up request to subscribe to Google's 'Pub/Sub System' with a 'PULL' subscription! Error: ${error.message}`;
							this.log.error(errorMessage);
							throw new Error(errorMessage);
						}
					});
			} else {
				const errorMessage = `ERROR: Error while subscribing to Google's 'Pub/Sub System' with a 'PULL' subscription! Undefined 'Google Cloud - Project ID'!`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			}
		} else {
			const errorMessage = `ERROR: Error while subscribing to Google's 'Pub/Sub System' with a 'PULL' subscription! Undefined 'Access Token'!`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**************************************************************************************************************************************
	 * Lists available 'Pub/Sub' devices on Google's 'Pub/Sub System'.
	 *
	 * @returns {Promise<void>} A Promise that resolves once the device listing process is completed.
	 * @throws {Error} If there is an error during the device listing process.
	 **************************************************************************************************************************************/
	async listGooglePubSubDevices() {
		this.log.info(`Listing available 'Pub/Sub' devices on Google's 'Pub/Sub System'...`);

		// Update the global authentication variables first.
		await this.updateGlobalAuthenticationVariables();

		// Get authentication values from global variables.
		const accessToken = this.accessToken;
		const projectID = this.projectID;

		if (accessToken) {
			if (projectID) {
				// Set up the request config
				const config = {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				};

				// Construct URL
				const parent = `enterprises/${projectID}`;
				const url = `https://smartdevicemanagement.googleapis.com/v1/${parent}/devices`;
				this.log.silly(`Listing available 'Pub/Sub' devices URL: ${url}`);

				await axios
					.get(url, config)
					.then((response) => {
						this.log.debug(`Received "Listing available 'Pub/Sub' devices" response.`);

						const devices = response.data.devices;

						if (devices) {
							if (devices.length > 0) {
								this.log.info(`Number of 'Pub/Sub' devices found on Google's 'Pub/Sub System': ${devices.length}`);
							} else {
								this.log.info(`No 'Pub/Sub' device found on Google's 'Pub/Sub System'...`);
							}

							let foundDeviceNumber = 1;
							for (const device of devices) {
								const deviceJSONString = JSON.stringify(device, null, 2);
								const decodedDeviceJSON = JSON.parse(deviceJSONString);

								this.log.info(`'Pub/Sub' device ${foundDeviceNumber}: ${this.getDeviceIDfromDeviceName(decodedDeviceJSON.name)}`);

								foundDeviceNumber = foundDeviceNumber + 1;
							}
						} else {
							this.log.info(`No 'Pub/Sub' device found on Google's 'Pub/Sub System'...`);
						}
					})
					.catch((error) => {
						let errorMessage = null;
						if (error.response) {
							// The request was made and the server responded with a status code
							// that falls out of the range of 2xx
							errorMessage = `ERROR: Error while listing available 'Pub/Sub' devices! Error: ${error.response.status} - '${JSON.stringify(error.response.data)}'`;
						} else if (error.request) {
							// The request was made but no response was received
							errorMessage = `ERROR: Error while listing available 'Pub/Sub' devices! No response received! Error: ${error.request}`;
						} else {
							// Something happened in setting up the request that triggered an Error
							errorMessage = `ERROR: Error while listing available 'Pub/Sub' devices! Error while setting up request! Message: ${error.message}`;
						}

						this.log.error(errorMessage);
						throw new Error(errorMessage);
					});
			} else {
				const errorMessage = `ERROR: Error while listing available 'Pub/Sub' devices on Google's 'Pub/Sub System'! Undefined 'Project ID'!`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			}
		} else {
			const errorMessage = `ERROR: Error while listing available 'Pub/Sub' devices on Google's 'Pub/Sub System'! Undefined 'Access Token'!`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**************************************************************************************************************************************
	 *
	 **************************************************************************************************************************************/
	async startPullingGooglePubSubMessages() {
		if (this.config.eventsEnabled && this.pullingEventMessagesEnabled) {
			let errorWhilePullingGooglePubSubMessage = false;
			try {
				await this.pullGooglePubSubMessages();
			} catch {
				errorWhilePullingGooglePubSubMessage = true;
			}

			if (!errorWhilePullingGooglePubSubMessage) {
				if (this.pullGooglePubSubMessagesTimeout) {
					this.clearTimeout(this.pullGooglePubSubMessagesTimeout);
					this.pullGooglePubSubMessagesTimeout = null;
				}
				this.pullGooglePubSubMessagesTimeout = this.setTimeout(() => this.startPullingGooglePubSubMessages(), this.config.eventsPullTimeout);
			} else {
				if (this.pullEventMessagesRetryCount == null) {
					this.pullEventMessagesRetryCount = 1;

					this.log.warn(`WARNING: Scheduling 1st retry of pulling 'Pub/Sub' messages in ${this.pullGooglePubSubMessagesFirstRetryTimeoutValue / 1000} seconds.`);

					if (this.pullGooglePubSubMessagesTimeout) {
						this.clearTimeout(this.pullGooglePubSubMessagesTimeout);
						this.pullGooglePubSubMessagesTimeout = null;
					}
					this.pullGooglePubSubMessagesTimeout = this.setTimeout(() => this.startPullingGooglePubSubMessages(), this.pullGooglePubSubMessagesFirstRetryTimeoutValue);
				} else if (this.pullEventMessagesRetryCount == 1) {
					this.pullEventMessagesRetryCount = 2;

					this.log.warn(`WARNING: Scheduling 2ndt retry of pulling 'Pub/Sub' messages in ${this.pullGooglePubSubMessagesFirstRetryTimeoutValue / 1000} seconds.`);

					if (this.pullGooglePubSubMessagesTimeout) {
						this.clearTimeout(this.pullGooglePubSubMessagesTimeout);
						this.pullGooglePubSubMessagesTimeout = null;
					}
					this.pullGooglePubSubMessagesTimeout = this.setTimeout(() => this.startPullingGooglePubSubMessages(), this.pullGooglePubSubMessagesSecondRetryTimeoutValue);
				} else if (this.pullEventMessagesRetryCount == 2) {
					this.pullEventMessagesRetryCount = 3;

					this.log.warn(`WARNING: Scheduling 3rd retry of pulling 'Pub/Sub' messages in ${this.pullGooglePubSubMessagesFirstRetryTimeoutValue / 1000} seconds.`);

					if (this.pullGooglePubSubMessagesTimeout) {
						this.clearTimeout(this.pullGooglePubSubMessagesTimeout);
						this.pullGooglePubSubMessagesTimeout = null;
					}
					this.pullGooglePubSubMessagesTimeout = this.setTimeout(() => this.startPullingGooglePubSubMessages(), this.pullGooglePubSubMessagesThirdRetryTimeoutValue);
				} else if (this.pullEventMessagesRetryCount == 3) {
					// We stop and crash after the third retry
					const errorMessage = `ERROR: Error while pulling messages from Google's 'Pub/Sub System'! Stopping after 3rd failed retry attempt!`;
					this.log.error(errorMessage);
					throw new Error(errorMessage);
				}
			}
		}
	}

	/**************************************************************************************************************************************
	 *
	 **************************************************************************************************************************************/
	async pullGooglePubSubMessages() {
		this.log.info(`Pulling Pub/Sub messages from Google's 'Pub/Sub System'...`);

		// Update the global authentication variables first.
		await this.updateGlobalAuthenticationVariables();

		// Get authentication values from global variables.
		const accessToken = this.accessToken;
		const googleCloudProjectID = this.googleCloudProjectID;

		if (accessToken) {
			if (googleCloudProjectID) {
				const hostname = os.hostname();

				// Construct URL
				const url = `https://pubsub.googleapis.com/v1/projects/${googleCloudProjectID}/subscriptions/${hostname}:pull`;
				this.log.silly(`Pulling messages from Google's 'Pub/Sub System' URL: ${url}`);

				const requestData = {
					returnImmediately: false, // Set to true to return immediately, or false to wait until messages are available
					maxMessages: 1000, // Maximum number of messages to pull
				};

				const config = {
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
				};

				try {
					const response = await axios.post(url, requestData, config);
					const messages = response.data.receivedMessages || [];

					this.log.info(`Successfully pulled messages from Google's 'Pub/Sub System'. Amount of pulled messages: ${messages.length}`);

					// Iterate through messages using a for...of loop to allow await inside the loop
					for (const message of messages) {
						try {
							// Process and acknowledge the message one at a time
							await this.processAndAcknowledgeGooglePubSubMessage(message);
						} catch (error) {
							this.log.error(`ERROR: Error while processing Google 'Pub/Sub' message with ID '${message.message.messageId}'! Error: ${error}`);
							this.log.warn(`Skipping processing Google 'Pub/Sub' message with ID: '${message.message.messageID}' due to error!`);
							continue;
						}
					}
				} catch (error) {
					const errorMessage = `ERROR: Error while pulling messages from Google's 'Pub/Sub System'! Error: ${error}`;
					this.log.error(errorMessage);
					throw new Error(errorMessage);
				}
			} else {
				const errorMessage = `ERROR: Error while pulling messages from Google's 'Pub/Sub System'! Undefined 'Google Cloud - Project ID'!`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			}
		} else {
			const errorMessage = `ERROR: Error while pulling messages from Google's 'Pub/Sub System'! Undefined 'Access Token'!`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**************************************************************************************************************************************
	 *
	 **************************************************************************************************************************************/
	async processAndAcknowledgeGooglePubSubMessage(message) {
		this.log.debug(`Processing Google 'Pub/Sub' message with ID: ${message.message.messageId}`);

		const data = Buffer.from(message.message.data, "base64").toString();

		this.log.silly(`Content of received Pub/Sub message with ID '${message.message.messageId}': ${data}`);

		try {
			const jsonData = JSON.parse(data);

			// Create 'DeviceEvent'
			const deviceEvent = await DeviceEvent.fromJSON(jsonData);

			// For debugging...
			/*
			this.log.debug(`Device Event - Event ID: ${deviceEvent.eventID}`);
			this.log.debug(`Device Event - Device ID: ${deviceEvent.deviceID}`);
			this.log.debug(`Device Event - User ID: ${deviceEvent.userID}`);
			this.log.debug(`Device Event - Timestamp: ${deviceEvent.timestamp}`);
			this.log.debug(`Device Event - Local Date String: ${deviceEvent.localDateString}`);
			this.log.debug(`Device Event - Unix Timestamp: ${deviceEvent.unixTimestamp}`);
			this.log.debug(`Device Event - Event Type Key: ${deviceEvent.event.eventTypeKey}`);
			this.log.debug(`Device Event - Event Type: ${deviceEvent.event.eventType}`);
			this.log.debug(`Device Event - Event Type Description: ${deviceEvent.event.eventTypeDescription}`);
			this.log.debug(`Device Event - Event Session ID: ${deviceEvent.event.eventSessionID}`);
			this.log.debug(`Device Event - Event ID: ${deviceEvent.event.eventID}`);
			*/

			// Store deviceEvent
			await this.storeEvent(deviceEvent);
		} catch (error) {
			// Error logged already.
		}

		try {
			// Acknowledge 'Pub/Sub' message.
			await this.acknowledgeGooglePubSubMessage(message.message.messageId, message.ackId);
		} catch (error) {
			// Error logged already.
		}
	}

	/**************************************************************************************************************************************
	 *
	 **************************************************************************************************************************************/
	async storeEvent(deviceEvent) {
		this.log.debug(`Checking if 'Event': '${deviceEvent.eventID}' ('${deviceEvent.event.eventTypeDescription}') should be stored...`);

		// Get stored devices
		const devices = await this.getDevicesAsync();

		let foundDevice = false;
		for (const device of devices) {
			const deviceID_object = await this.getStateAsync(device._id + ".deviceID");
			const deviceID = deviceID_object?.val;
			const deviceName_object = await this.getStateAsync(device._id + ".deviceName");
			const deviceName = deviceName_object?.val;

			if (deviceID == deviceEvent.deviceID) {
				this.log.debug(`'Event': '${deviceEvent.eventID}' ('${deviceEvent.event.eventTypeDescription}') belongs to device: ${deviceName} (Device ID: '${deviceID}')`);
				foundDevice = true;

				// We should only store the event if its not too old
				const currentDate = new Date();
				const currentUnixTimestamp = currentDate.getTime();

				if (currentUnixTimestamp - deviceEvent.unixTimestamp <= this.maxMillisecondIntervalForStoringEvents) {
					const eventStateID = "devices." + deviceID + ".events." + deviceEvent.event.eventTypeDescription;
					const eventState_object = await this.getStateAsync(eventStateID);

					if (eventState_object) {
						// We should also only store the event if it is newer than the currently stored event.
						if (deviceEvent.unixTimestamp > eventState_object.lc) {
							this.log.debug(`'Event': '${deviceEvent.eventID}' ('${deviceEvent.event.eventTypeDescription}') should be stored for device: ${deviceName} (Device ID: '${deviceID}').`);
							this.log.info(`Storing 'Event': '${deviceEvent.eventID}' ('${deviceEvent.event.eventTypeDescription}') for device: ${deviceName} (Device ID: '${deviceID}')...`);

							await this.setStateAsync(eventStateID, {
								val: true,
								ack: true,
								expire: this.resetEventAfterXSecondsInterval,
							})
								.then(() => {
									this.log.info(`Successfully stored 'Event': '${deviceEvent.eventID}' ('${deviceEvent.event.eventTypeDescription}') for device: ${deviceName} (Device ID: '${deviceID}')`);
								})
								.catch((error) => {
									const errorMessage = `ERROR: Error while storing 'Event': '${deviceEvent.eventID}' ('${deviceEvent.event.eventTypeDescription}') for device: ${deviceName} (Device ID: '${deviceID}')! Error: ${error}`;
									this.log.error(errorMessage);
									throw new Error(errorMessage);
								});
						} else {
							this.log.debug(`Skipping storing of 'Event' '${deviceEvent.eventID}' ('${deviceEvent.event.eventTypeDescription}') for device: ${deviceName} (Device ID: '${deviceID}')! Event is older than currently stored Event!`);
						}
					} else {
						// A state for this event type does not exist.
						const errorMessage = `ERROR: Error while storing 'Event': '${deviceEvent.eventID}' ('${deviceEvent.event.eventTypeDescription}') for device: ${deviceName} (Device ID: '${deviceID}')! State for event type does not exist!`;
						this.log.error(errorMessage);
						throw new Error(errorMessage);
					}
				} else {
					this.log.debug(`Skipping storing of 'Event' '${deviceEvent.eventID}' ('${deviceEvent.event.eventTypeDescription}') for device: ${deviceName} (Device ID: '${deviceID}')! Event is older than '${this.maxMillisecondIntervalForStoringEvents} milliseconds!'`);
				}
			}
		}

		if (!foundDevice) {
			const errorMessage = `ERROR: Error while checking if 'Event': '${deviceEvent.eventID}' ('${deviceEvent.event.eventTypeDescription}') should be stored! No device found for Event!`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**************************************************************************************************************************************
	 *
	 **************************************************************************************************************************************/
	async acknowledgeGooglePubSubMessage(messageID, acknowledgementID) {
		this.log.debug(`Acknowledging Google 'Pub/Sub' message with ID: ${messageID}...`);

		// Update the global authentication variables first.
		await this.updateGlobalAuthenticationVariables();

		// Get authentication values from global variables.
		const accessToken = this.accessToken;
		const googleCloudProjectID = this.googleCloudProjectID;

		if (accessToken) {
			if (googleCloudProjectID) {
				const hostname = os.hostname();

				const url = `https://pubsub.googleapis.com/v1/projects/${googleCloudProjectID}/subscriptions/${hostname}:acknowledge`;
				this.log.silly(`Acknowledging Google 'Pub/Sub' message URL: ${url}`);

				const requestData = {
					ackIds: [acknowledgementID],
				};

				const config = {
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
				};

				try {
					await axios.post(url, requestData, config).then((response) => {
						const decodedResponseData = JSON.stringify(response.data, null, 2);
						if (decodedResponseData == "{}") {
							this.log.debug(`Successfully acknowledged Google 'Pub/Sub' message with ID: ${messageID}. RESPONSE: OK`);
						} else {
							this.log.error(`ERROR: Error while acknowledging Google 'Pub/Sub' message with ID: ${messageID}! RESPONSE: NOT OK!`);
						}
					});
				} catch (error) {
					this.log.error(`ERROR: Error while acknowledging Google 'Pub/Sub' message with ID: ${messageID}! Error: ${error}`);
				}
			} else {
				const errorMessage = `ERROR: Error while acknowledging Google 'Pub/Sub' message with ID: ${messageID}! Undefined 'Google Cloud - Project ID'!`;
				this.log.error(errorMessage);
				throw new Error(errorMessage);
			}
		} else {
			const errorMessage = `ERROR: Error while acknowledging Google 'Pub/Sub' message with ID: ${messageID}! Undefined 'Access Token'!`;
			this.log.error(errorMessage);
			throw new Error(errorMessage);
		}
	}

	/**************************************************************************************************************************************
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param {() => void} callback
	 **************************************************************************************************************************************/
	onUnload(callback) {
		try {
			// Clear any active timeouts or intervals
			if (this.refreshAccessTokenTimeout) {
				this.clearTimeout(this.refreshAccessTokenTimeout);
				this.refreshAccessTokenTimeout = null;
			}
			if (this.pullGooglePubSubMessagesTimeout) {
				this.clearTimeout(this.pullGooglePubSubMessagesTimeout);
				this.pullGooglePubSubMessagesTimeout = null;
			}

			// Close the HTTP server if it exists
			if (this.httpServer) {
				this.httpServer.close(() => {
					this.log.info("HTTP server closed");
					callback(); // Call callback once after all cleanup is completed
				});
			} else {
				callback(); // Call callback if there is no HTTP server to close
			}
		} catch (error) {
			this.log.error(`ERROR: Error during adapter unload: ${error}`);
			callback(); // Always call callback to ensure adapter unloads even in case of errors
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

	/**************************************************************************************************************************************
	 * Is called if a subscribed state changes
	 *
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 **************************************************************************************************************************************/
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			//this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			//this.log.info(`state ${id} deleted`);

			const idParts = id.split(".");
			const stateIDWithoutAdapterInfo = idParts.slice(2).join(".");

			if (this.monitoredEventStates.includes(stateIDWithoutAdapterInfo)) {
				this.log.debug(`Re-setting state: ${stateIDWithoutAdapterInfo} to 'FALSE'.`);
				this.setStateAsync(id, {
					val: false,
					ack: true,
				});
			}
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

class DeviceEvent {
	constructor(eventID, deviceID, userID, timestamp, event) {
		this.eventID = eventID;
		this.deviceID = deviceID;
		this.userID = userID;
		this.timestamp = timestamp;
		this.localDateString = DeviceEvent.convertTimestampStringToLocalDateString(timestamp);
		this.unixTimestamp = DeviceEvent.convertTimestampStringToUnixTimestamp(timestamp);
		this.event = event;
	}

	static fromJSON(json) {
		const { eventId, timestamp, resourceUpdate, userId } = json;
		return new DeviceEvent(eventId, this.getDeviceIDFromResourceUpdateObject(resourceUpdate), userId, timestamp, EventObject.createFromResourceUpdate(resourceUpdate));
	}

	/**************************************************************************************************************************************
	 * Extracts the 'Device ID' from the 'resourceUpdate' object.
	 *
	 * @param {object} resourceUpdate - The 'resourceUpdate' object containing information about the device.
	 * @returns {string|null} The 'Device ID' extracted from the 'resourceUpdate' object, or null if no 'Device ID' is found.
	 **************************************************************************************************************************************/
	static getDeviceIDFromResourceUpdateObject(resourceUpdate) {
		if (resourceUpdate.name) {
			// Define a regular expression pattern to match the device ID
			const pattern = /\/devices\/([^\s/]+)/;

			// Use the pattern to search for matches in the input string
			const matches = resourceUpdate.name.match(pattern);

			// If matches are found, return the captured device ID
			if (matches && matches.length > 1) {
				return matches[1]; // Return the captured group
			} else {
				return null;
			}
		} else {
			return null;
		}
	}

	/**************************************************************************************************************************************
	 * Converts a given timestamp string (similar to an ISO 8601 timestamp string) into a local date and time string based on the user's ioBroker settings.
	 * The possible output formats are:
	 * - "DD.MM.YYYY": Date formatted as day.month.year, with hours, minutes, and seconds.
	 * - "YYYY.MM.DD": Date formatted as year.month.day, with hours, minutes, and seconds.
	 * - "MM/DD/YYYY": Date formatted as month/day/year, with hours, minutes, and seconds.
	 *
	 * @param {string} timestamp - The timestamp string (similar to an ISO 8601 timestamp string) to convert (in the format "YYYY-MM-DDTHH:MM:SS.MSZ").
	 * @returns {string} The local date and time string formatted according to the user's preference. If the user-defined date format is not recognized, it defaults to the "MM/DD/YYYY" format.
	 **************************************************************************************************************************************/
	static convertTimestampStringToLocalDateString(timestamp) {
		// Parse the UTC timestamp into a Date object
		const date = new Date(timestamp);

		try {
			let formattedDate;

			// Adjust the date format based on the user's ioBroker settings.
			if (userDefined_dateFormat == "DD.MM.YYYY") {
				// Format date as DD.MM.YYYY
				formattedDate = date.toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".") + " " + date.toLocaleTimeString("de-DE", { hour12: false });
			} else if (userDefined_dateFormat == "YYYY.MM.DD") {
				// Format date as YYYY.MM.DD
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, "0"); // Add 1 to month because it is zero-based
				const day = String(date.getDate()).padStart(2, "0");
				formattedDate = `${year}.${month}.${day} ${date.toLocaleTimeString("en-US", { hour12: false })}`;
			} else if (userDefined_dateFormat == "MM/DD/YYYY") {
				// Format date as MM/DD/YYYY
				formattedDate = date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "/") + " " + date.toLocaleTimeString("en-US", { hour12: false });
			} else {
				// If no specific format is specified, use MM/DD/YYYY format
				formattedDate = date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "/") + " " + date.toLocaleTimeString("en-US", { hour12: false });
			}

			return formattedDate;
		} catch (error) {
			// In case of error, fallback to converting the UTC date to a local date string
			const localDateString = date.toLocaleString();
			return localDateString;
		}
	}

	/**************************************************************************************************************************************
	 * Converts a given timestamp string (similar to an ISO 8601 timestamp string) into a Unix timestamp (milliseconds since Jan 1, 1970).
	 *
	 * @param {string} timestamp - The timestamp string (similar to an ISO 8601 timestamp string) to convert (in the format "YYYY-MM-DDTHH:MM:SS.MSZ").
	 * @returns {number} The Unix timestamp (milliseconds since Jan 1, 1970).
	 **************************************************************************************************************************************/
	static convertTimestampStringToUnixTimestamp(timestamp) {
		// Parse the ISO 8601 timestamp into a Date object
		const date = new Date(timestamp);

		// Get the Unix timestamp (milliseconds since Jan 1, 1970)
		const unixTimestamp = date.getTime();

		return unixTimestamp;
	}
}

class EventObject {
	constructor(eventTypeKey, eventType, eventTypeStateID, eventTypeDescription, eventSessionID, eventID) {
		this.eventTypeKey = eventTypeKey;
		this.eventType = eventType;
		this.eventTypeDescription = eventTypeDescription;
		this.eventTypeStateID = eventTypeStateID;
		this.eventSessionID = eventSessionID;
		this.eventID = eventID;
	}

	static createFromResourceUpdate(resourceUpdate) {
		if (resourceUpdate) {
			// Extract necessary information from resourceUpdate and create an event object
			const eventTypeKey = EventObject.getEventTypeKeyFromResourceUpdateObject(resourceUpdate);
			let eventType = null;
			let eventTypeDescription = null;
			let eventTypeStateID = null;
			if (eventTypeKey) {
				eventType = EventObject.getEventTypeFromEventTypeKey(eventTypeKey);
				eventTypeDescription = EventObject.getEventTypeDescriptionFromEventTypeKey(eventTypeKey);
				eventTypeStateID = EventObject.getEventTypeStateIDFromEventTypeKey(eventTypeKey);
			}

			const eventSessionID = EventObject.getEventSessionIDFromResourceUpdateObject(resourceUpdate);
			const eventID = EventObject.getEventIDFromResourceUpdateObject(resourceUpdate);

			// Return a new instance of EventObject
			return new EventObject(eventTypeKey, eventType, eventTypeDescription, eventTypeStateID, eventSessionID, eventID);
		} else {
			return null;
		}
	}

	/**************************************************************************************************************************************
	 * Retrieves the 'Event Type Key' from the provided 'resourceUpdate' object.
	 *
	 * @param {object} resourceUpdate - The 'resourceUpdate' object containing event data.
	 * @returns {string|null} The 'Event Type Key' if found, or null if not found or if the 'resourceUpdate' object is invalid.
	 **************************************************************************************************************************************/
	static getEventTypeKeyFromResourceUpdateObject(resourceUpdate) {
		if (resourceUpdate) {
			if (resourceUpdate.events) {
				if (resourceUpdate.events["sdm.devices.events.CameraPerson.Person"]) {
					return "sdm.devices.events.CameraPerson.Person";
				} else if (resourceUpdate.events["sdm.devices.events.CameraMotion.Motion"]) {
					return "sdm.devices.events.CameraMotion.Motion";
				} else if (resourceUpdate.events["sdm.devices.events.CameraSound.Sound"]) {
					return "sdm.devices.events.CameraSound.Sound";
				} else if (resourceUpdate.events["sdm.devices.events.CameraClipPreview.ClipPreview"]) {
					return "sdm.devices.events.CameraClipPreview.ClipPreview";
				} else if (resourceUpdate.events["sdm.devices.events.DoorbellChime.Chime"]) {
					return "sdm.devices.events.DoorbellChime.Chime";
				} else {
					return null;
				}
			} else {
				return null;
			}
		} else {
			return null;
		}
	}

	/**************************************************************************************************************************************
	 * Retrieves the 'Event Type' from the given 'Event Type Key'.
	 *
	 * @param {string} eventTypeKey - The 'Event Type Key' to retrieve the 'Event Type' for.
	 * @returns {string|null} The 'Event Type' corresponding to the 'Event Type Key', or null if the 'Event Type Key' is invalid or not recognized.
	 **************************************************************************************************************************************/
	static getEventTypeFromEventTypeKey(eventTypeKey) {
		if (eventTypeKey) {
			if (eventTypeKey == "sdm.devices.events.CameraPerson.Person") {
				return "Person";
			} else if (eventTypeKey == "sdm.devices.events.CameraMotion.Motion") {
				return "Motion";
			} else if (eventTypeKey == "sdm.devices.events.CameraSound.Sound") {
				return "Sound";
			} else if (eventTypeKey == "sdm.devices.events.CameraClipPreview.ClipPreview") {
				return "ClipPreview";
			} else if (eventTypeKey == "sdm.devices.events.DoorbellChime.Chime") {
				return "Chime";
			} else {
				return null;
			}
		} else {
			return null;
		}
	}

	/**************************************************************************************************************************************
	 * Retrieves the 'Event Type Description' from the given 'Event Type Key'.
	 *
	 * @param {string} eventTypeKey - The 'Event Type Key' to retrieve the 'Event Type Description' for.
	 * @returns {string|null} The 'Event Type Description' corresponding to the 'Event Type Key', or null if the 'Event Type Key' is invalid or not recognized.
	 **************************************************************************************************************************************/
	static getEventTypeDescriptionFromEventTypeKey(eventTypeKey) {
		if (eventTypeKey) {
			if (eventTypeKey == "sdm.devices.events.CameraPerson.Person") {
				return "Person detected";
			} else if (eventTypeKey == "sdm.devices.events.CameraMotion.Motion") {
				return "Motion detected";
			} else if (eventTypeKey == "sdm.devices.events.CameraSound.Sound") {
				return "Sound detected";
			} else if (eventTypeKey == "sdm.devices.events.CameraClipPreview.ClipPreview") {
				return "Clip preview available";
			} else if (eventTypeKey == "sdm.devices.events.DoorbellChime.Chime") {
				return "Doorbell pressed";
			} else {
				return null;
			}
		} else {
			return null;
		}
	}

	/**************************************************************************************************************************************
	 * Returns the corresponding 'Event Type State ID' based on the provided 'Event Type Key'.
	 *
	 * @param {string} eventTypeKey - The 'Event Type Key' to map to the 'Event Type State ID'.
	 * @returns {string|null} - The 'Event Type State ID' if a matching key is found, otherwise null.
	 **************************************************************************************************************************************/
	static getEventTypeStateIDFromEventTypeKey(eventTypeKey) {
		if (eventTypeKey) {
			if (eventTypeKey == "sdm.devices.events.CameraPerson.Person") {
				return "personDetected";
			} else if (eventTypeKey == "sdm.devices.events.CameraMotion.Motion") {
				return "motionDetected";
			} else if (eventTypeKey == "sdm.devices.events.CameraSound.Sound") {
				return "soundDetected";
			} else if (eventTypeKey == "sdm.devices.events.CameraClipPreview.ClipPreview") {
				return "clipPreviewAvailable";
			} else if (eventTypeKey == "sdm.devices.events.DoorbellChime.Chime") {
				return "doorbellPressDetected";
			} else {
				return null;
			}
		} else {
			return null;
		}
	}

	/**************************************************************************************************************************************
	 * Retrieves the 'Event Session ID' from the given 'resourceUpdate' object.
	 *
	 * @param {object} resourceUpdate - The 'resourceUpdate' object containing events.
	 * @returns {string|null} The 'Event Session ID' if found in the 'resourceUpdate' object, or null if not found or if the input is invalid.
	 **************************************************************************************************************************************/
	static getEventSessionIDFromResourceUpdateObject(resourceUpdate) {
		if (resourceUpdate) {
			if (resourceUpdate.events) {
				if (resourceUpdate.events["sdm.devices.events.CameraPerson.Person"]) {
					const event = resourceUpdate.events["sdm.devices.events.CameraPerson.Person"];
					if (event.eventSessionId) {
						return event.eventSessionId;
					} else {
						return null;
					}
				} else if (resourceUpdate.events["sdm.devices.events.CameraMotion.Motion"]) {
					const event = resourceUpdate.events["sdm.devices.events.CameraMotion.Motion"];
					if (event.eventSessionId) {
						return event.eventSessionId;
					} else {
						return null;
					}
				} else if (resourceUpdate.events["sdm.devices.events.CameraSound.Sound"]) {
					const event = resourceUpdate.events["sdm.devices.events.CameraSound.Sound"];
					if (event.eventSessionId) {
						return event.eventSessionId;
					} else {
						return null;
					}
				} else if (resourceUpdate.events["sdm.devices.events.CameraClipPreview.ClipPreview"]) {
					const event = resourceUpdate.events["sdm.devices.events.CameraClipPreview.ClipPreview"];
					if (event.eventSessionId) {
						return event.eventSessionId;
					} else {
						return null;
					}
				} else if (resourceUpdate.events["sdm.devices.events.DoorbellChime.Chime"]) {
					const event = resourceUpdate.events["sdm.devices.events.DoorbellChime.Chime"];
					if (event.eventSessionId) {
						return event.eventSessionId;
					} else {
						return null;
					}
				} else {
					return null;
				}
			} else {
				return null;
			}
		} else {
			return null;
		}
	}

	/**************************************************************************************************************************************
	 * Retrieves the 'Event ID' from the given 'resourceUpdate' object.
	 *
	 * @param {object} resourceUpdate - The 'resourceUpdate' object containing events.
	 * @returns {string|null} The 'Event ID' if found in the 'resourceUpdate' object, or null if not found or if the input is invalid.
	 **************************************************************************************************************************************/
	static getEventIDFromResourceUpdateObject(resourceUpdate) {
		if (resourceUpdate) {
			if (resourceUpdate.events) {
				if (resourceUpdate.events["sdm.devices.events.CameraPerson.Person"]) {
					const event = resourceUpdate.events["sdm.devices.events.CameraPerson.Person"];
					if (event.eventId) {
						return event.eventId;
					} else {
						return null;
					}
				} else if (resourceUpdate.events["sdm.devices.events.CameraMotion.Motion"]) {
					const event = resourceUpdate.events["sdm.devices.events.CameraMotion.Motion"];
					if (event.eventId) {
						return event.eventId;
					} else {
						return null;
					}
				} else if (resourceUpdate.events["sdm.devices.events.CameraSound.Sound"]) {
					const event = resourceUpdate.events["sdm.devices.events.CameraSound.Sound"];
					if (event.eventId) {
						return event.eventId;
					} else {
						return null;
					}
				} else if (resourceUpdate.events["sdm.devices.events.CameraClipPreview.ClipPreview"]) {
					const event = resourceUpdate.events["sdm.devices.events.CameraClipPreview.ClipPreview"];
					if (event.eventId) {
						return event.eventId;
					} else {
						return null;
					}
				} else if (resourceUpdate.events["sdm.devices.events.DoorbellChime.Chime"]) {
					const event = resourceUpdate.events["sdm.devices.events.DoorbellChime.Chime"];
					if (event.eventId) {
						return event.eventId;
					} else {
						return null;
					}
				} else {
					return null;
				}
			} else {
				return null;
			}
		} else {
			return null;
		}
	}
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
