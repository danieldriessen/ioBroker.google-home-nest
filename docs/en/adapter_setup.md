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

