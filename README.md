![Logo](admin/google-home-nest.png)

# ioBroker.google-home-nest

[![NPM version](https://img.shields.io/npm/v/iobroker.google-home-nest?style=flat-square)](https://www.npmjs.com/package/iobroker.google-home-nest)
[![Downloads](https://img.shields.io/npm/dm/iobroker.google-home-nest?label=npm%20downloads&style=flat-square)](https://www.npmjs.com/package/iobroker.google-home-nest)
![node-lts](https://img.shields.io/node/v-lts/iobroker.google-home-nest?style=flat-square)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/iobroker.google-home-nest?label=npm%20dependencies&style=flat-square)

![GitHub](https://img.shields.io/github/license/danieldriessen/iobroker.google-home-nest?style=flat-square)
![GitHub repo size](https://img.shields.io/github/repo-size/danieldriessen/iobroker.google-home-nest?logo=github&style=flat-square)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/danieldriessen/iobroker.google-home-nest?logo=github&style=flat-square)
![GitHub last commit](https://img.shields.io/github/last-commit/danieldriessen/iobroker.google-home-nest?logo=github&style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/danieldriessen/iobroker.google-home-nest?logo=github&style=flat-square)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/danieldriessen/iobroker.google-home-nest/test-and-release.yml?branch=master&logo=github&style=flat-square)

[![NPM](https://nodei.co/npm/iobroker.google-home-nest.png?downloads=true)](https://nodei.co/npm/iobroker.google-home-nest/)

<!-- **Tests:** ![Test and Release](https://github.com/danieldriessen/ioBroker.google-home-nest/workflows/Test%20and%20Release/badge.svg) -->

## Versions

![Beta](https://img.shields.io/npm/v/iobroker.google-home-nest.svg?color=red&label=beta)
![Stable](https://iobroker.live/badges/google-home-nest-stable.svg)
![Installed](https://iobroker.live/badges/google-home-nest-installed.svg)

## Description

Integrates your Google Home (Nest) devices like Cameras, Doorbells, Displays, Thermostats etc., into the ioBroker system.<br>

You can find more information about the Google Home (Nest) devices here: [Google Home (Nest)](https://store.google.com/de/category/connected_home) and here: [Google Device Access](https://developers.google.com/nest/device-access).<br>

Please be aware that this adapter is currently in development and in beta status. See section "Current development status, limitations & future goals" for more information.<br>
You can also join the discussions about this adapter in the ioBroker forum here:<br>
[🇬🇧 English discussion](https://forum.iobroker.net/topic/74450/new-adapter-google-home-nest?_=1715579743163)<br>
[🇩🇪 German discussion](https://forum.iobroker.net/topic/74453/neuer-adapter-google-home-nest?_=1715579743160)

> [!IMPORTANT]
> In order to use this adapter, you must be registered for Google **'Device Access'**.<br>
> Registration for Google **'Device Access'** requires acceptance of the terms of use for the 'Google API' and the 'Device Access Sandbox', as well as a **one-time fee** of **$5 (US dollars)** (as of May 2024).

> [!IMPORTANT]
> To receive events from your devices, this adapter creates a **'Pub/Sub subscription'** on the Google platform.<br>
> **'Pub/Sub subscriptions'** on the Google platform can specify a message retention duration. This adapter sets this duration to 600 seconds (10 minutes).<br>
> After this time, unacknowledged messages are automatically deleted by the Google platform.<br>
> Please keep in mind that Google may charge you for message retention beyond this duration.<br>
> The predefined duration of 600 seconds should prevent you from incurring any charges from Google. However, this cannot be guaranteed!<br>
> Please also note that Google may change this policy in the future.<br>
> The developer(s) of this adapter are in no way responsible for any costs that may arise from the use of this adapter!


## Current development status, limitations & future goals

### In its current state of development the adapter (after beeing correctly set up) should be able to...

-   acquire a list of your Google Home (Nest) devices and create an ioBroker device object for each device.
-   retrieve the capabilities of each device, and store them into ioBroker states.
-   acquire events such as 'motion detected', 'doorbell press detected', etc., by regularly pulling data from the Google 'Pub/Sub system'.
    (see section 'Supported devices' for more details about the events implementation status).

### In its current state of development the adapter is NOT capable of...

-   acquiring camera images, preview clips, or live streams.
-   retrieving status updates like 'current ambient temperature', 'current ambient humidity', etc., for devices.
-   sending commands like 'set heat', 'set cool', 'set timer', etc. to the devices.

### Future Goals:

It is intended to implement all of the above-mentioned missing capabilities.
In addition to that, it is also intended to add the possibility to acquire events with a 'PUSH' system.
However, the feasibility of each of these goals is subject to change.



## Documentation

[🇬🇧 English documentation](https://github.com/danieldriessen/ioBroker.google-home-nest/blob/main/docs/en/README.md)<br>
[🇩🇪 German documentation](https://github.com/danieldriessen/ioBroker.google-home-nest/blob/main/docs/de/README.md)


## Supported devices

### Camera devices
| Device name / description                  | general implementation | retrieve capabilities |  retrieve status | receive events | send commands |
| ------------------------------------------ | ---------------------- | --------------------- | ---------------- | -------------- | ------------- |
| Google Nest Cam Indoor (legacy device)     | ✅ 	              | ✅                   | NONE AVAILABLE   | ✅             | ❌            |
| Google Nest Cam Outdoor (legacy device)    | ✅                     | ✅                   | NONE AVAILABLE   | ✅             | ❌            |
| Google Nest Cam IQ Indoor (legacy device)  | ✅                     | ✅                   | NONE AVAILABLE   | ✅             | ❌            |
| Google Nest Cam IQ Outdoor (legacy device) | ✅                     | ✅                   | NONE AVAILABLE   | ✅             | ❌            |
| Google Nest Cam Indoor (battery device)    | ✅                     | ✅                   | NONE AVAILABLE   | ✅             | ❌            |
| Google Nest Cam Outdoor (battery device)   | ✅                     | ✅                   | NONE AVAILABLE   | ✅             | ❌            |
| Google Nest Cam Indoor (wired device)      | ✅                     | ✅                   | NONE AVAILABLE   | ✅             | ❌            |
| Google Nest Cam with floodlight            | ✅                     | ✅                   | NONE AVAILABLE   | ✅             | ❌

### Doorbell devices
| Device name / description                  | general implementation | retrieve capabilities |  retrieve status | receive events | send commands |
| ------------------------------------------ | ---------------------- | --------------------- | ---------------- | -------------- | ------------- |
| Google Nest Doorbell (legacy device)       | ✅                     | ✅                   | NONE AVAILABLE   | ✅             | ❌            |
| Google Nest Doorbell (bettery device)      | ✅                     | ✅                   | NONE AVAILABLE   | ✅             | ❌            |
| Google Nest Doorbell (wired device)        | ✅                     | ✅                   | NONW AVAILABLE   | ✅             | ❌            |

### Display devices
| Device name / description                  | general implementation | retrieve capabilities |  retrieve status | receive events | send commands |
| ------------------------------------------ | ---------------------- | --------------------- | ---------------- | -------------- | ------------- |
| Google Nest Hub Max                        | ✅                     | ✅                   | NONE AVAILABLE   | ✅             | ❌            |

### Thermostat devices
| Device name / description                  | general implementation | retrieve capabilities |  retrieve status | receive events | send commands |
| ------------------------------------------ | ---------------------- | --------------------- | ---------------- | -------------- | ------------- |
| Google Nest Thermostat devices             | ✅                     | ❌                   | ❌               | NONE AVAILABLE | ❌            |



## DISCLAIMER

The developers of this module are in no way endorsed by or affiliated with Google LLC, or any associated subsidiaries, logos, or trademarks.
The Google logo used in this adapter is for illustrative purposes only and is the property of Google LLC.
If there are any concerns regarding the use of copyrighted materials in this adapter, please feel free to contact the developers, and they will promptly address them.

## LIMITATION OF LIABILITY

The developers of this adapter shall not be liable for any damages or issues that arise from the use of the adapter, including but not limited to loss of data, malfunction, or any other damages or issues.
By using this adapter, you agree that the developers are not responsible for any costs, damages, or issues that may arise from its use.

## USAGE AGREEMENT

By using this adapter, you agree to the following terms:

-	You may use this adapter for personal or commercial purposes.
-	You may modify the adapter for your own use, but you may not redistribute it without permission from the developers.
-	The adapter is provided "as is" without any warranty, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement.
-	The developers of this adapter reserve the right to update, modify, or discontinue the adapter at any time without prior notice.
-	Any feedback or contributions provided by users are greatly appreciated but are not mandatory.
-	The developers of this adapter shall not be liable for any costs, damages, or issues that may arise from its use.



## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 0.3.0 (2024-05-12)
-   (Daniel Drießen) Added important information to the README file.
-   (Daniel Drießen) Added basic setup documentation in german and english.
-   (Daniel Drießen) Removed automatic deletion of all stored device objects upon adapter start.
-   (Daniel Drießen) Added automatic deletion of all stored device objects that can't be found online.
-   (Daniel Drießen) Added option to recreate device object structure upon next adapter start.

### 0.2.0 (2024-05-02)
-   (Daniel Drießen) Improved admin panel and corrected some text.
-	(Daniel Drießen) Added missing translations on the admin panel.

### 0.1.2 (2024-04-30)
-   (Daniel Drießen) Modified admin panel
-   (Daniel Drießen) Changed 'redirectURI' back to 'localhost'

### 0.1.2-beta.0 (2024-04-29)
-   (Daniel Drießen) Modified Readme file

### 0.1.1-beta.0 (2024-04-29)
-   (Daniel Drießen) Corrected dependencies.

### 0.1.0-beta.0 (2024-04-28)
-   (Daniel Drießen) Initial beta version release

### 0.0.1 (2023-16-23)
-   (Daniel Drießen) Initial (unreleased) version

## License

MIT License

Copyright (c) 2023-2024 Daniel Drießen <daniel.driessen@ddproductions.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
