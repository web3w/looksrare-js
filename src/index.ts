// 一口价购买
import {
    addressesByNetwork,
    MakerOrder,
    MakerOrderWithSignature,
    signMakerOrder,
    RoyaltyFeeRegistryAbi,
    LooksRareExchangeAbi,
    Addresses
} from "@looksrare/sdk";
import EventEmitter from 'events'
import {Contract, ethers} from "ethers"
import {
    APIConfig, Asset,
    BuyOrderParams,
    CreateOrderParams,
    ElementSchemaName,
    ExchangetAgent, FeesInfo,
    LowerPriceOrderParams,
    MatchOrderOption,
    MatchOrdersParams,
    MatchParams,
    OrderSide,
    SellOrderParams, tokenToAsset,
} from 'web3-accounts'
import {BigNumber, getProvider, LimitedCallSpec, WalletInfo} from 'web3-wallets'
import {Web3Accounts} from "./types";
import {LooksRareAPI, LOOKS_PROTOCOL_FEE_POINTS} from "./api";
import {formatUnits} from "@ethersproject/units/src.ts/index";


export class LooksRareSDK extends EventEmitter implements ExchangetAgent {
    public contracts: any
    public userAccount: Web3Accounts
    public walletInfo: WalletInfo
    public api: LooksRareAPI
    public contractAddresses: Addresses
    public royaltyFeeRegistry: Contract
    public exchange: Contract

    // 初始化SDK
    constructor(wallet: WalletInfo, config?: APIConfig) {
        super()
        this.userAccount = new Web3Accounts(wallet)
        this.api = new LooksRareAPI({...config, chainId: wallet.chainId})
        this.walletInfo = wallet
        const contractAddresses = addressesByNetwork[wallet.chainId]
        this.contractAddresses = contractAddresses
        this.royaltyFeeRegistry = new Contract(contractAddresses.ROYALTY_FEE_REGISTRY, RoyaltyFeeRegistryAbi, this.userAccount.signer)
        this.exchange = new Contract(contractAddresses.EXCHANGE, LooksRareExchangeAbi, this.userAccount.signer)
    }

    async getOrderApprove(params: CreateOrderParams, side: OrderSide) {
        let {asset, paymentToken} = params
        if (side == OrderSide.Buy) {
            asset = tokenToAsset(paymentToken)
        }
        //https://etherscan.io/address/0xf42aa99F011A1fA7CDA90E5E98b277E306BcA83e
        //https://rinkeby.etherscan.io/address/0x3f65a762f15d01809cdc6b43d8849ff24949c86a
        if (asset.schemaName.toLowerCase() == 'erc721') {
            return this.userAccount.getAssetApprove(asset, this.contractAddresses.TRANSFER_MANAGER_ERC721)
        } else if (asset.schemaName.toLowerCase() == 'erc1155') {
            return this.userAccount.getAssetApprove(asset, this.contractAddresses.TRANSFER_MANAGER_ERC1155)
        } else {
            return this.userAccount.getAssetApprove(asset, this.contractAddresses.EXECUTION_MANAGER)
        }
    }

    async getMatchCallData(params: MatchParams)
        : Promise<{ callData: LimitedCallSpec, params: any }> {
        // metadata = '0x', takerAmount?: string, taker?: string
        const {orderStr, metadata = '0x', assetRecipientAddress} = params
        const data = await this.contracts.orderMatchCallData(orderStr, {metadata, taker: assetRecipientAddress})


        const callData: LimitedCallSpec = {
            value: data?.value ? data.value?.toString() : '0',
            data: data?.data || "",
            to: data?.to || ""
        }
        return {callData, params: {}}
    }

    async createSellOrder(params: SellOrderParams): Promise<MakerOrderWithSignature> {
        const {asset, startAmount, quantity, expirationTime, paymentToken} = params
        const direction = OrderSide.Sell
        const nonce = await this.api.getOrdersNonce(this.walletInfo.address)

        // const nonce1 = await this.exchange.userMinOrderNonce(this.walletInfo.address)
        // console.log(nonce1.toString())


        const {isApprove, balances, calldata} = await this.getOrderApprove(params, direction)
        if (new BigNumber(balances).lt(quantity)) {
            throw 'CreateSellOrder asset balances not enough'
        }
        if (!isApprove && calldata) {
            const tx = await this.userAccount.ethSend(calldata).catch((err: any) => {
                throw err
            })
            if (tx) {
                await tx.wait();
                const info = await this.getOrderApprove(params, direction)
                console.log("Asset  setApproved", asset, tx.hash, info.isApprove, info.balances);
            }
        }


        const now = Math.floor(Date.now() / 1000);
        const {collection} = asset
        let fees = LOOKS_PROTOCOL_FEE_POINTS //protocolFeePoints
        if (collection && collection.royaltyFeePoints) {
            fees = fees + collection.royaltyFeePoints
        }
        // Get protocolFees and creatorFees from the contracts
        const netPriceRatio = ethers.BigNumber.from(10000).sub(fees).toNumber();
        // This variable is used to enforce a max slippage of 25% on all orders, if a collection change the fees to be >25%, the order will become invalid
        const minNetPriceRatio = 7500;
        if (!asset.tokenId) throw new Error("Token id undefind")
        const decimals = paymentToken.decimals && paymentToken.address ? paymentToken.decimals : 18
        const price = ethers.utils.parseUnits(startAmount.toString(), decimals).toString()

        const makerOrder: MakerOrder = {
            isOrderAsk: true,
            signer: this.walletInfo.address,
            collection: asset.tokenAddress,
            price, // :warning: PRICE IS ALWAYS IN WEI :warning:
            tokenId: asset.tokenId, // Token id is 0 if you use the STRATEGY_COLLECTION_SALE strategy
            amount: quantity.toString(),
            strategy: this.contractAddresses.STRATEGY_STANDARD_SALE,
            currency: this.contractAddresses.WETH,
            nonce: nonce || 0,
            startTime: now,
            endTime: expirationTime || now + 60 * 60 * 24 * 4, // 1 day validity
            minPercentageToAsk: Math.max(netPriceRatio, minNetPriceRatio),
            params: [],
        };
        const {walletProvider, walletSigner} = getProvider(this.walletInfo)
        let signer = walletSigner as any
        if (typeof window === 'undefined') {
            signer = new ethers.providers.Web3Provider(walletProvider).getSigner()
        }

        const signature = await signMakerOrder(signer, this.walletInfo.chainId, makerOrder);

        return {...makerOrder, signature}
    }

    async createBuyOrder(order: BuyOrderParams): Promise<any> {
        return this.contracts.createBuyOrder(order)
    }

    public async createLowerPriceOrder(params: LowerPriceOrderParams) {
        const {
            orderStr,
            basePrice,
            paymentToken,
            royaltyFeePoints,
            protocolFeePoints,
            royaltyFeeAddress,
            protocolFeeAddress
        } = params

        const order: MakerOrder = JSON.parse(orderStr)
        const {tokenId, collection, amount, nonce, startTime, endTime} = order
        const asset: Asset = {
            tokenId: tokenId.toString(),
            tokenAddress: collection,
            schemaName: "ERC721",
            collection: {
                royaltyFeePoints,
                protocolFeePoints,
                royaltyFeeAddress,
                protocolFeeAddress
            }
        }
        const decimals = paymentToken?.decimals && paymentToken.address ? paymentToken.decimals : 18

        return {
            asset,
            startAmount: ethers.utils.formatUnits(basePrice, decimals),
            quantity: Number(amount),
            listingTime: Number(startTime),
            expirationTime: Number(endTime),
            nonce,

        } as SellOrderParams
    }

    async fulfillOrder(orderStr: string, option?: MatchOrderOption) {
        return this.contracts.orderMatch(orderStr, option)
    }

    async fulfillOrders(orders: MatchOrdersParams) {
        const {orderList, mixedPayment} = orders
        if (orderList.length == 0) {
            throw 'Element v3 acceptOrders orders eq 0'
        }

        if (orderList.length == 1) {
            const {orderStr, metadata, takerAmount, taker} = orderList[0]
            const oneOption: MatchOrderOption = {
                metadata,
                takerAmount,
                taker,
                mixedPayment
            }
            return this.fulfillOrder(orderStr, oneOption)
        } else {
            return this.contracts.batchBuy(orders)
        }
    }

    async cancelOrders(orders: string[]) {
        if (orders.length == 0) {
            return this.contracts.cancelAllOrder()
        }

        if (orders.length == 1) {
            return this.contracts.cancelOrder(orders[0])
        } else {
            let schame = ElementSchemaName.ERC721
            const nonces = orders.map(val => {
                const {order} = JSON.parse(val)
                if (order.erc1155TokenId) {
                    schame = ElementSchemaName.ERC1155
                }
                return order.nonce
            })
            return this.contracts.batchCancelOrder(schame, nonces)
        }
    }

    async postOrder(orderStr: string) {
        return this.api.postOrder(orderStr)
    }

    async getAssetsFees(assets: string[]) {

        const fees: FeesInfo[] = []
        for (const asset of assets) {
            const royalty = await this.royaltyFeeRegistry.royaltyInfo(asset, 100)
            fees.push(<FeesInfo>{
                royaltyFeeAddress: royalty[0],
                royaltyFeePoints: royalty[1].toNumber(),
                protocolFeePoints: LOOKS_PROTOCOL_FEE_POINTS,
                protocolFeeAddress: this.contractAddresses.FEE_SHARING_SYSTEM
            })
        }

        return fees

    }


}

