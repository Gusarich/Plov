[![Tests](https://github.com/Gusarich/Plov/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/Gusarich/Plov/actions/workflows/tests.yml)

# Plov

## Table of contents
* [Plov](#plov)
   * [Table of contents](#table-of-contents)
   * [General info](#general-info)
   * [Wallet](#wallet)
      * [Installation](#installation)
      * [Usage](#usage)
   * [Node](#node)
      * [Installation](#installation-1)
      * [Usage](#usage-1)

## General info
Plov is next-gen Blockchain.

## Wallet
### Installation
Use `npm` package manager to install
```
npm install --global plov-wallet
```
### Usage
Usage example:
```
$ plov status
Current time: 1622449597403
Current block: 443016
```
Use `--help` option to get more information
```
plov --help
```
### Commands
* status
* keypair
    * generate
* balance
* transfer

#### status
Prints current time and block from Plov network.
```
$ plov status
Current time: 1622449597403
Current block: 443016
```

#### keypair
Keypair actions
##### generate
Generates new keypair and stores secret key to ~/.plov directory.
```
$ plov keypair generate
Generated keypair (/home/.plov/keypair1)
```

#### balance
Get current balance of specific account.
```
$ plov balance --account 9nh9cw98fwkdwupzcw6kmnlqvesbxwh56azgan58ryjbfqk53
107.24
```

#### transfer
Transfer Plov to another account.
```
$ plov keypair generate
Generated keypair (/home/.plov/keypair1)
$ plov balance --account keypair1
107.24
$ plov transfer 10 fqeok9qo5c7qum1ypm3omyjrje8uvxbtbs1yrk4h9h67lbp3cf --account keypair1
Broadcasting transaction...
Transfer success!
$ plov balance --account keypair1
97.24
$ plov balance --account fqeok9qo5c7qum1ypm3omyjrje8uvxbtbs1yrk4h9h67lbp3cf
10.0
```

## Node

Plov-node npm package is in development right now. You can't use it yet.

### Installation
Use `npm` package manager to install
```
npm install --global plov-node
```
### Usage
Usage example:
```
$ plov-node sync
Sync done
```
Use `--help` option to get more information
```
plov-node --help
```
