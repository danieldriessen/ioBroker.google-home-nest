![Logo](../../admin/google-home-nest.png)

# ioBroker.google-home-nest

> [!NOTE]
> This is the documentation in English.<br>
> You can find the German version here: [🇩🇪 German documentation](../de/requirements.md)

## Basic Requirements
To be able to use the basic functionality of this adapter, the following conditions must be met...

### 1. Your Google (Nest) devices must be linked to a Google user account.
  This is usually the case when you have added your Google (Nest) devices in the Google Home app on your smartphone and are logged in with a user account in the app.
  > [!IMPORTANT]
  > Old Nest accounts are not supported and must be migrated to a Google account before use.

### 2. You must be registered for Google **'Device Access'**.
  You can learn how this works in the 'Adapter setup' section ([here](adapter_setup.md)).
  > [!NOTE]
  > Registration requires acceptance of the terms of use for the 'Google API' and the 'Device Access Sandbox', as well as a **one-time fee** of **$5 (US dollars)** (as of May 2024).

  > [!IMPORTANT]
  > Make sure that the registration for Google **'Device Access'** is done using the same Google account that your Google (Nest) devices are linked to.<br>
  > Old Nest accounts are not supported and must be migrated to a Google account before use.

### 3. A project must be created in the Google **'Device Access Console'**.
  The project can be created in the Google **'Device Access Console'** after successful registration for Google **'Device Access'**.<br>
  You can learn how this works in the 'Adapter setup' section ([here](adapter_setup.md)).

  > [!IMPORTANT]
  > Make sure that the project creation in the Google **'Device Access Console'** is done using the same Google account that your Google (Nest) devices are linked to.<br>
  > Old Nest accounts are not supported and must be migrated to a Google account before use.

### 4. A project must be created in the **'Google Cloud Console'**.
  You can learn how this works in the 'Adapter setup' section ([here](adapter_setup.md)).

  > [!IMPORTANT]
  > Make sure that the creation of the project in the **'Google Cloud Console'** is done using the same Google account that your Google (Nest) devices are linked to.<br>
  > Old Nest accounts are not supported and must be migrated to a Google account before use.

### 5. Through the **'Google Cloud Console'**, credentials in the form of an **'OAuth 2.0 Client-ID'** must be created.
  You can learn how this works in the 'Adapter setup' section ([here](adapter_setup.md)).

### 6. For the created credentials, a valid **'Authorized redirect URI'** must be specified.
  The **'Authorized redirect URI'** can be specified during the creation of the credentials or can be changed or added later.<br>
  You can learn how this works in the 'Adapter setup' section ([here](adapter_setup.md)).

  > [!IMPORTANT]
  > For later retrieval of an **'Authorization Code'**, a properly configured **'Redirect URI'** is mandatory.<br>
  > For most users, the following **'Redirect URI'** will be the recommended choice: http://localhost:{HTTP-SERVER-PORT}.<br>
  > The {HTTP-SERVER-PORT} part of this URI must be replaced with the HTTP-Server port configured in the adapter **'Admin Panel'**.<br>
  > In case of a change of the server port in the **'Admin Panel'** of the adapter, it is mandatory to adjust the 'Redirect URI' accordingly.<br>
  > Please note that the **'Redirect URI'** *http://localhost:{HTTP-SERVER-PORT}* is accepted by Google, while the **'Redirect URI'** *http://127.0.0.1:{HTTP-SERVER-PORT}* is NOT accepted by Google.

  > [!NOTE]
  > It may take between 5 minutes and several hours for the settings to take effect.
