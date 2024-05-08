![Logo](../../admin/google-home-nest.png)

# ioBroker.google-home-nest

> [!NOTE]
> This is the documentation in English.<br>
> You can find the German version here: [🇩🇪 German documentation](../de/adapter_setup.md)

## Overview **'Admin Panel'**

![Overview 'Admin Panel'](img/screenshots/adminPanel/v0.2.0/annotated/5868px/screenshot_adminPanel_annotated_v0.2.0_(5868px).png)

|                                                               | Configuration Type         | Description                                                                                                                |
| ------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ![Red annotation dot](../img/annotationDots/redDot.png)       | **Basic-Setup**            | The areas marked with red circles in the overview are required for the **Basic-Setup**.<br><br>The **Basic-Setup** allows the adapter to query fundamental properties of your Google (Nest) devices and create an object tree for your devices in ioBroker.    |
| ![Yellow annotation dot](../img/annotationDots/yellowDot.png) | **Extended-Setup**         | The areas marked with yellow circles in the overview are required for the **Extended-Setup**.<br><br>With the **Advanced-Setup**, the adapter can receive (or fetch) **'Event Messages'** and temporarily reflect them in the corresponding ioBroker objects. |

## Basic-Setup

1. For the **Basic Setup**, you first need to select a port for the HTTP-server under point 1.

> [!IMPORTANT]
> Make sure that the selected port is not already being used by another application or process and is not blocked by a firewall.

2. Subsequently, values 2-4 must be entered. How to obtain these values will be described in the following sections.<br>

3. After entering the required data, you can save them by clicking on **'SAVE'**.<br>

4. Next, the adapter needs to be started.<br>
   Immediately after starting, the adapter will attempt to create an HTTP-server that monitors the port specified in step 1 for incoming communication.<br>

> [!IMPORTANT]
> For the successful completion of the following steps, it is essential that the adapter and thus the HTTP-server have been started, and the HTTP-server is capable of monitoring the specified port.

5. Now, authentication can be initiated by clicking the **'Authenticate'** button in the **'Authentication'** section of the Adapter **'Admin Panel'**.

> [!IMPORTANT]
> To successfully complete the following steps, it is essential that the click on the **'Authenticate'** button is performed in a browser on the same device where ioBroker is installed.

> [!IMPORTANT]
> The **'Authentication'** can only be successfully completed if you are signed in to your browser with the **'Google Account'** associated with your Google (Nest) devices.<br>
> If you are currently not signed in with any **'Google Account'** in your default browser, you will be prompted to sign in with your **'Google Account'** first after clicking the **'Authenticate'** button.<br>
> If, however, you receive an error message after clicking the **'Authenticate'** button, please first check if you are currently signed in with the wrong **'Google Account'**.

6. If you are not already signed in with a **'Google Account'**, please sign in now with the **'Google Account'** associated with your Google (Nest) devices.<br>
   If you are already signed in with the corresponding **'Google Account'**, proceed to the next step.

7. In the next step, you need to grant the adapter permissions to access your Google (Nest) devices.<br>
   To do this, please enable all options and then click the 'Next' button.
   ![Grant Adapter permission](img/screenshots/adminPanel/googleAuthorization/screenshot_adminPanel_googleAuthorization_permissions.png)

> [!NOTE]
> The number of options to be activated here varies based on the number and type of your Google (Nest) devices.
> Accordingly, the screen you see may differ from the screenshot at the top.

> [!TIP]
> Some options may only become available for activation after other options have already been activated.<br>
> Additionally, it may take a short moment for some options to become activatable.

8. In the following step, you may be prompted again to select your **'Google Account'**.<br>
   If prompted, please select the **'Google Account'** associated with your Google (Nest) devices.

9. Now you will be notified that the adapter has not been verified by Google.<br>
   Google requires your consent again here.<br>
   Click the **'Next'** button to proceed.

10. You may now be prompted again to give your consent.

11. If you now receive the message **'*Authorization Code sent to ioBroker successfully. You can close this tab/window now.*'** in your browser, then everything has worked, and the **'Authorization Code'** has been received by the adapter and stored in ioBroker as an object.<br>
    Click on the **'SAVE AND CLOSE'** button in the adapter **'Admin Panel'** to complete the **'Basic-Setup'**.

## Extended-Setup

1. For the **'Extended-Setup'**, you first need to enter the **'Google Cloud - Project-ID'** under point 5.<br>
   If you followed the instructions in the **'Acquiring OAuth-Client-ID & Client Secret'** section, the **'Google Cloud - Project-ID'** was displayed in Step 7 of this section.<br>
   To have the **'Google Cloud - Project-ID'** displayed again, you can use one of the **'Google Cloud Console'** buttons in the adapter **'Admin Panel'** to reopen the **'Google Cloud Console'**.<br>
   Once you have selected your corresponding project in the top left corner of the **'Google Cloud Console'**, the **'Google Cloud - Project-ID'** will be displayed to you on the **'Google Cloud Console'**.

2. To receive (or fetch) events, the **'Pub/Sub-Topic'** must be activated on the Google **'Device Access Console'**.<br>
   If you followed the instructions in the **'Acquiring Project-ID'** section and decided to already activate the events in Step 8 of the section, the **'Pub/Sub-Topic'** should already be activated on the Google **'Device Access Console'**, and you don't need to worry about anything further.<br>
   Otherwise, please follow the **'Activate Pub/Sub-Topic'** section to activate the **'Pub/Sub-Topic'** on the Google **'Device Access Console'**.

3. Afterwards, the checkbox for **'Enable Events'** (point 6) can be checked.

4. Now you can select the **'Events acquisition method'** under point 7.

> [!WARNING]
> Currently, only **'PULL'** is supported as the **'Events acquisition method**'.

5. Under point 8, you can now define the **'Events Pull timeout'** (in seconds).<br>
   This timeout specifies how long the adapter waits after the last event retrieval before it starts retrieving the events of the Google (Nest) devices again.

6. Now click on the **'SAVE AND CLOSE'** button in the adapter **'Admin Panel'** to complete the **'Extended-Setup'**.

## Acquiring **'OAuth-Client-ID'** & **'Client Secret'**

To obtain an **'OAuth-Client-ID'**, you first need to create a Google Cloud project.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) in your browser.<br>
> [!TIP]
> The **'Google Cloud Console'** can also be accessed via the address 'https://console.cloud.google.com/' or by clicking on one of the corresponding buttons in the Adapter **'Admin Panel'**.

2. If you access the **'Google Cloud Console'** for the first time, you will now be prompted to accept the terms of use for the **'Google Cloud Platform'**.<br>
   ![Google Cloud Console - Terms](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_terms.png)

   To proceed, please agree to the terms of use.
> [!IMPORTANT]
> Make sure you are logged in with the same Google account that is linked to your Google (Nest) devices.

3. Next, a new project needs to be created in the **'Google Cloud Console'**.<br>
   To do this, click on the project selection dropdown menu in the upper section of the **'Google Cloud Console'**.
   ![Google Cloud Console - Select project](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_selectProject.png)

4. Now, in the pop-up window that appears, select **'New Project'** to create a new project.

5. Now, the new project needs to be configured.<br>

   For this, a valid **'Project name'** and a valid **'Project-ID'** must be assigned.<br>
   <br>
   The **'Project name'** serves solely to identify the project in your project library.<br>
   The **'Project-ID'**, on the other hand, identifies your project at a 'global' level and must therefore be unique and cannot be changed afterwards.<br>
   <br>
   When opening the page for project creation, the **'Project name'** text field already contains a suggestion for the project name.<br>
   Similarly, a unique **'Project-ID'** is already displayed, which can be changed by clicking the **'EDIT'** button.<br>
   <br>
   A **'Location'** does not necessarily need to be specified.

   ![Google Cloud Console - Create new project 01](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createNewProject_01.png)

   After you have chosen a **'Project name'** and assigned a unique **'Project-ID'**, click on the **'CREATE'** button to create the project.

> [!TIP]
> It's advisable to assign a custom **'Project name'** to make it easier to identify the project in the future.<br>
> For example: 'ioBroker - Google Home Nest' (as seen in the following image).

> [!TIP]
> Since the **'Project-ID'** uniquely identifies your Google Cloud project among all Google Cloud projects, and therefore must be unique among all Google Cloud projects,
> it's advisable to give the **'Project-ID'** a personal component.<br>
> Your name or parts of your name, your nickname, or your domain (if available) are good examples of personal components for the **'Project-ID'**.<br>
> However, there's also nothing wrong with simply accepting the proposed **'Project-ID'**. In some cases, this may even be the easiest option.

6. Now, select your newly created project from the dropdown menu and navigate to the **'Dashboard'** of the project.<br>

   For this, follow steps 1-4 in the image below.

   ![Google Cloud Console - Go to project dashboard](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_goToProjectDashboard.png)

7. On the **'Dashboard'** of the project, you will now find your **'Project name'**, your **'Project number'**, and your **'Project-ID'** in the **'Project information'** section.
   ![Google Cloud Console - Project information](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_projectInformation.png)

> [!NOTE]
> You will need the **'Project-ID'** for the **Extended-Setup**. It is not required for the **Basic-Setup**.

> [!IMPORTANT]
> The **'Project-ID'** (in the upper image) is the **'Google Cloud - Project-ID'**.<br>
> Please do not confuse this with the **'Project-ID'** of the Google **'Device Access Console'**, which you need for the **Basic-Setup** and is to be entered in the Adapter **'Admin Panel'** under **point 3**.

8. After successfully creating the project in the **'Google Cloud Console'**, the next step is to activate the **'Smart Device Management API'**.<br>

   Ensure that your newly created project is selected in the dropdown menu (Step 1 in the lower image) and then follow steps 2-4.

   ![Google Cloud Console - Activate APIs 01](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_enableAPIs_01.png)

9. Now, on the following page, click on **'+ ACTIVATE APIS AND SERVICES'**.
   ![Google Cloud Console - Activate_APIs 02](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_enableAPIs_02.png)

10. Use the search bar on the following page to search the Google **'API Library'** for the **'Smart Device Management API'**.
   ![Google Cloud Console - Search APIs](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_searchAPIs.png)

11. Select the **'Smart Device Management API'** from the search results.
    ![Google Cloud Console - Search APIs - Smart Device Management API](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_searchAPI_smartDeviceManagementAPI.png)

12. On the **'Smart Device Management API'** page, click the **'ACTIVATE'** button to activate the API.
    ![Google Cloud Console - Activate API - Smart Device Management API](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_activateAPI_smartManagementAPI.png)

13. Now that the **'Smart Device Management API'** is activated, the credentials need to be created.<br>

    To do this, first click on **'Credentials'** in the menu on the left side to access the corresponding page.
    ![Google Cloud Console - Go to credentials 01](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_goToCredentials_01.png)

14. On the **'Credentials'** page, click the **'+ CREATE CREDENTIALS'** button in the top menu bar, then click on **'OAuth client ID'** (Step 2 in the lower image).
    ![Google Cloud Console - Create credentials 01](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_01.png)

15. If you have just created a new project, you will now be shown that before creating an **'OAuth client ID'**, you need to configure the **'Consent Screen'**.<br>

    You can do this by clicking on the **'CONFIGURE CONSENT SCREEN'** button.

    ![Google Cloud Console - Configure consent screen 01](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_01.png)

16. Now, on the next page, select **'External'** for the **'User Type'** and then click on the **'CREATE'** button.
    ![Google Cloud Console - Configure consent screen 02](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_02.png)

17. On the next page, you now need to provide some information for the **'Consent Screen'**.

    | Point | Field name                                         | mandatory?     | Description                                                                                                                  |
    | ----- | -------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
    | 1     | App Name                                           | Yes            | Enter a name for the application requesting consent here.<br>For example: *'ioBroker Adapter: Google-Home-Nest'*             |
    | 2     | User support email                                 | Yes            | Select your email address from the dropdown menu, here.                                                                      |
    | 3     | EMail addresses<br>(Developer contact information) | Yes            | Here, you enter your email address again.                                                                                    |
    | 4     | Logo file to upload                                | No             | Here, a logo for the application requesting consent can be uploaded.<br>This is not mandatory and can be skipped.<br>However, if desired, for example, the adapter logo can be uploaded here.<br>You can download the adapter logo from [here](https://github.com/danieldriessen/ioBroker.google-home-nest/blob/main/admin/google-home-nest.png) if needed. |

    Once you have provided all the information, click on the **'SAVE AND CONTINUE'** button to save your settings and proceed to the next screen.

    ![Google Cloud Console - Configure consent screen 03](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_03.png)

18. You can simply skip the next screen by clicking on **'SAVE AND CONTINUE'**.
    ![Google Cloud Console - Configure consent screen 04](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_04.png)

19. On the next screen, a **Test User** needs to be created.<br>

    To do this, first click on **'+ ADD USER'**.
    ![Google Cloud Console - Configure consent screen 05](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_05.png)

    In the displayed dialog box, a **Google user account** must now be specified.
    ![Google Cloud Console - Configure consent screen 06](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_06.png)
    Then click on the **'ADD'** button in the dialog box, and then on the **'SAVE AND CONTINUE'** button on the main page.

> [!IMPORTANT]
> Make sure to specify the **Google user account** here, which is also linked to your Google (Nest) devices.

20. On the next screen, which displays a summary of the settings made, click on **'BACK TO DASHBOARD'**.
    ![Google Cloud Console - Configure consent screen 07](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_07.png)

21. Now that the **'Consent Screen'** is configured, you can proceed to create your **'Credentials'**.<br>
    To do this, click on **'Credentials'** again in the left menu bar.
    ![Google Cloud Console - Go to credentials 02](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_goToCredentials_02.png)

22. Now, on the **'Credentials'** page, click the **'+ CREATE CREDENTIALS'** button again in the top menu bar, then click on **'OAuth client ID'** (Step 2 in the lower image).
    ![Google Cloud Console - Create credentials 02](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_02.png)

23. On the page for creating the **'OAuth client ID'**, select **'Web application'** from the dropdown menu.
    ![Google Cloud Console - Create credentials 03](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_03.png)

24. In the field **'Name'** that appears (which is already pre-filled with '*Web client 1*'), you can now specify the name of the 'application' (the web client) that requests access to the resource.
    ![Google Cloud Console - Create credentials 04](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_04.png)

> [!TIP]
> A good name at this point would be, for example: '*ioBroker*'.

25. Next, please click on the **'+ ADD URI'** button.
    ![Google Cloud Console - Create credentials 05](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_05.png)

26. Now, another text field **'URI 1'** appears, where the **'Redirect URI'** must be specified.<br>

    At this point, please enter the following **URI**: **'http://localhost:{HTTP-SERVER-PORT}'**.<br>
    Replace the **'{HTTP-SERVER-PORT}'** part of the **URI** with the **'HTTP-Server Port'** you configured in the adapter **'Admin Panel'**.
