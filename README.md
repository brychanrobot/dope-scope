# DopeScope

A web GUI for USB oscilloscopes such as Owon VDS1022 or Hantek 6022BE. This uses the WebUSB API, which should allow users to view the data from the oscilloscopes on any device that can run the Chrome browser. As other browsers begin to support the API, it should work on them as well.

## Getting started

```
yarn install
```

### Creating ssl certificates

In order to use WebUSB you have to either be using localhost or using https. That requires creating ssl certificates. The easiest way to do that is with [mkcert](https://github.com/FiloSottile/mkcert). After installing mkcert, run:

```
mkcert -install
```

and then run this command from the root of this repo to create ssl certificates for your local server and place them in .ssl/:

```
mkdir ssl && mkcert -key-file ssl/server.pem -cert-file ssl/server.crt $(hostname) $(hostname).local localhost 127.0.0.1 ::1    
```

If you want to access your local server from another device, then you will need to install the certificates on another system in order to test you can follow the directions [here](https://github.com/FiloSottile/mkcert#installing-the-ca-on-other-systems)

### Run the development server

```
yarn serve
```

## Source Code Headers

Every file containing source code must include copyright and license
information. This includes any JS/CSS files that you might be serving out to
browsers. (This is to help well-intentioned people avoid accidental copying that
doesn't comply with the license.)

Apache header:

    Copyright 2020 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

## Disclaimer

This is not an officially supported Google product.
