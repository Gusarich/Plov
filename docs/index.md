# Plov
## Introduction
todo

## Background
todo

## Structure
### Node
A node is a device that runs a program that creates and validates blocks in the network.
This program connects to multiple peers, queries the current state of the network, and proceeds to process transactions.
To be able to create blocks and receive rewards, you first need to stake or burn a certain amount of coins from the account that is linked to the node.

### State
A state is an object that contains information necessary to keep the network running.
State structure:
```yaml
blockchainState: {
    height: <Current blockchain height>,
    accounts: {
        abc...01: {},
        abc...02: {},
        <All accounts that have ever interacted with the blockchain>
    },
    allocated: []
}
```
#### Height
`height` Variable stores current blockchan height.
#### Accounts
`accounts` Object stores all accounts that have ever interacted with the blockchain.
#### Allocated
todo
### Transaction
A transaction is an object that contains information that allows you to validate, process and write changes to state.
Transaction structure:
```yaml
transaction: {
    fromPublicKey: <Sender address>,
    toPublicKey: <Recepient address>,
    amount: <Amount of coins transfered>,
    nonce: <Nonce of transaction>
}
```
### Block
A block is a unit of information in a blockchain. The block contains the current time, transactions, block producer. By dividing information into blocks, it is easier to maintain a general consensus in a decentralized network.
Blocks are generated at equal intervals. All blocks are not saved on the node device, only the last one is saved and overwritten.
Block structure:
```yaml
block: {
    index: <Index of block, equal to blockchain height>,
    timestamp: <Current timestamp>,
    transactions: [
        {...},
        {...},
        <All transactions in block>
    ],
    producer: <Block producer that gets reward>,
    hash: <Block hash>,
    signature: <Block signature taken from hash>
}
```
### Account
An account is an object that contains information about an address in the blockchain.
Account structure:
```yaml
account: {
    nonce: <Nonce of account>,
    balance: <Amount of coins that account has>
}
```
### Staking
Staking is a mechanism that reduces the total circulating supply of coins on the network.
While staking does not technically reduce inflation, it does exactly that effect.
By staking a coin, an account gets the opportunity to produce blocks and receive a reward for it.
The more coins an account has staked, the more chances it will have to produce the next block.
Staked coins can be returned to the balance, but the ability to produce blocks disappears, or decreases if not all coins are withdrawn from the stake.
### Burning
Burning is a process that reduces inflation in the network. By burning coins, the account loses some of them, but gets the opportunity to produce blocks. At the same time, so that users have the motivation to burn tokens, and not stake, for burning the account gets more chances to produce a block. The multiplier is 2.
That is, if account `abc...01` burned 100 coins, and account `abc...02` staked 200 coins, these accounts will have an equal chance of producing a block and receiving a reward.
