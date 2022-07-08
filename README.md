# OJDS-NX ViGEm Client

This project aims to create a virtual controller on Windows that mimics the inputs from a modded Nintendo Switch.

E.g. to display the controller inputs using https://gamepadviewer.com/.

## Setup

### On the Switch

First the Switch needs to be [modded](https://switch.homebrew.guide/) with [Athmosphere](https://github.com/Atmosphere-NX/Atmosphere).

Once that is done we can copy over the [OJDS-NX](https://github.com/Istador/OJDS-NX/) files to the SD card (download the latest `zip` from the [releases](https://github.com/Istador/OJDS-NX/releases)).

Once put onto the SD card, the `OJDS-NX` server runs automatically in the background on port `56709/tcp` and waits for clients to connect.
When a client connects and requests data, the server responds with the current controller values.

### On your Windows PC

First we need to install the latest [ViGEmBus](https://github.com/ViGEm/ViGEmBus) drivers on the Windows PC (download the latest `exe` from the [releases](https://github.com/ViGEm/ViGEmBus/releases)).

In order to run this project [Node.js](https://nodejs.org/en/download/) also needs to be installed.

Clone this repository and install additional dependencies with:
```shell
git  clone  https://github.com/Istador/node-ojds-nx-vigemclient
cd  node-ojds-nx-vigemclient
npm  install
```

## Usage

### Client

To connect to the Switch we need to know its IP address in our network.
The IP address can be found at the connection status in the internet system settings on the Switch.
For example let's assume it is `192.168.0.2`.

Knowing its IP we can simply run:
```shell
node  client  192.168.0.2
```

This will connect to the Switch and create a virtual controller.
It will then continues to request the controller states every about 50ms from the Switch and update the controller values until it is stopped (`CTRL + C`).

By default the client creates a virtual DualShock4 (PS4) controller (`DirectInput`).
But it can also create a virtual XBox 360 controller (`XInput`), by adding `xbox` as an additional parameter.
This will also remap the ABXY button layout which differs between Switch and Xbox controllers (`ABXY` <=> `BAYX`).
```shell
node  client  192.168.0.2  xbox
```

### Test Server

To test the client without a Switch, there's also a small dummy server that responds with random controller values.

It can be started with:
```shell
node  server
```

And the client can connect to it by simply running:
```shell
node  client
# or:
node  client  127.0.0.1
```
