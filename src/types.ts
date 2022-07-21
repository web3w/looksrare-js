import {APIConfig, ElementSchemaName, OrderSide, BaseFetch} from 'web3-accounts'

export {
    ElementSchemaName, Web3Accounts, OfferType, OrderSide, ETHToken,
    metadataToAsset, assetToMetadata, tokenToMetadata, BaseFetch
} from 'web3-accounts'

export {sleep} from "web3-wallets";

export type {APIConfig}

// API
export interface ChainInfo {
    chain?: string
    chainId?: string
}


export interface MakerNonceParams {
    maker: string
    exchange: string
    schema: ElementSchemaName
    chain?: string
}


// export type SwapTradeData = TradeDataParams & ExSwapTradeData & { errorDetail?: string }

export interface ExSwapTradeData {
    buyer: string
    chain: string
    chainId: string
    contractAddress: string
    data: string
    errorDetail: string
    exchangeData: string
    executeType: string
    marketId: string
    orderId: string
    standard: string
    toAddress: string
    tokenId: string
    value: string
    orderHash: string
    schema: ElementSchemaName
}

export const FeesABI = [{
    "inputs": [{"internalType": "address[]", "name": "collections", "type": "address[]"}],
    "name": "royaltyFeeInfos",
    "outputs": [{"internalType": "address[]", "name": "setters", "type": "address[]"}, {
        "internalType": "address[]",
        "name": "receivers",
        "type": "address[]"
    }, {"internalType": "uint256[]", "name": "fees", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [],
    "name": "royaltyFeeRegistry",
    "outputs": [{"internalType": "contract IRoyaltyFeeRegistry", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
}]
