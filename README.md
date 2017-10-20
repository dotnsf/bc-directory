# composer-api for BC Directory

## Overview

Hyperledger Composer API for BC Directory.

## Pre-requisite

### Node.js V6.x

- https://nodejs.org/

- V8.x is not supported by Hyperledger Composer

### Docker & Docker Compose

- https://docker.github.io/

## Setup API

### Hyperledger Composer

- Install Hyperledger Composer by executing the following command in the terminal window

`$ curl -sSL https://hyperledger.github.io/composer/install-hlfv1.sh | bash`

- Check if ~/.composer-connection-profiles/ exists.

- Edit ~/.composer-connection-profiles/<profilename>/connection.json

### Hyperledger Composer CLI and Fabric tools

- Install Composer CLI by executing the following command in the terminal window

`$ sudo npm install -g composer-cli@0.11.2`

### Edit settings.js

- Edit following lines with appropriate values if needed

`exports.connectionProfile = 'hlfv1';                //. connectionProfile name
exports.businessNetworkIdentifier = 'bc-directory';  //. specified in BNA file
exports.participantId = 'PeerAdmin';
exports.participantPwd = 'secret';
exports.maskPattern = '********';                    //. mask pattern
exports.superSecret = 'mysecret';                    //. Secret strings

exports.basic_username = 'username';                 //. Username for apidoc.html
exports.basic_password = 'password';                 //. Password for apidoc.html`

### Deploy Hyperledger Business Network

- Deploy Hyperledger Business Network

`$ composer network deploy -p <profilename> -a ./superec-bc.bna -i PeerAdmin -s secret`

### Launch as application

- Install dependencies

`$ npm install`

- Launch application

`$ node app`

### Launch in IBM Bluemix

- Launch application

`$ cf push appname`

### Launch Bluemix

- Launch API document

Browse /apidoc.html

### Enjoy!

