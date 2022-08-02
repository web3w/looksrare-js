// 一口价购买
import {
    Addresses,
    addressesByNetwork, getMakerOrderTypeAndDomain,
    LooksRareExchangeAbi,
    MakerOrder,
    MakerOrderWithSignature, MakerOrderWithVRS,
    RoyaltyFeeRegistryAbi,
    RoyaltyFeeSetterAbi,
    signMakerOrder, TakerOrder,
    TransferSelectorNFTAbi
} from "@looksrare/sdk";
import EventEmitter from 'events'
import {
    AdjustOrderParams,
    APIConfig,
    Asset,
    BuyOrderParams,
    CreateOrderParams,
    ElementSchemaName,
    ExchangetAgent,
    FeesInfo,
    MatchOrderOption,
    MatchOrdersParams,
    MatchParams,
    OrderSide,
    SellOrderParams,
    Token,
    tokenToAsset,
} from 'web3-accounts'
import {
    BigNumber,
    Contract,
    ethers,
    getProvider,
    LimitedCallSpec,
    NULL_ADDRESS,
    splitECSignature,
    utils,
    WalletInfo
} from 'web3-wallets'
import {FeesABI, Web3Accounts} from "./types";
import {LOOKS_PROTOCOL_FEE_POINTS, LooksRareAPI} from "./api";
import {Web3ABICoder} from "web3-abi-coder";

export function toFixed(x): string | number {
    if (Math.abs(Number(x)) < 1.0) {
        let e = parseInt(x.toString().split('e-')[1]);
        if (e) {
            x *= Math.pow(10, e - 1);
            x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
        }
    } else {
        let e = parseInt(x.toString().split('+')[1]);
        if (e > 20) {
            e -= 20;
            x /= Math.pow(10, e);
            x += (new Array(e + 1)).join('0');
        }
    }
    return x;
}

const FeeGeterAddress = {
    1: "0x7bbe00f898d8e5d584af14edf7325b6d31cc0f49",
    4: "0xf11cddde95c25deaf7de9bd2957e84fba0ee9a38"
}

export class LooksRareSDK extends EventEmitter implements ExchangetAgent {
    public contracts: any
    public userAccount: Web3Accounts
    public walletInfo: WalletInfo
    public api: LooksRareAPI
    public contractAddresses: Addresses
    public royaltyFeeRegistry: Contract
    public royaltyFeeSetter: Contract
    public transferSelectorNFT: Contract
    public exchange: Contract
    public royaltyFeeGeter: Contract
    public GasWarpperToken: Token
    public coder: Web3ABICoder

    //init SDK
    constructor(wallet: WalletInfo, config?: APIConfig) {
        super()
        this.userAccount = new Web3Accounts(wallet)
        this.api = new LooksRareAPI({...config, chainId: wallet.chainId})
        this.walletInfo = wallet
        const contractAddresses = addressesByNetwork[wallet.chainId]
        this.contractAddresses = contractAddresses
        this.royaltyFeeRegistry = new Contract(contractAddresses.ROYALTY_FEE_REGISTRY, RoyaltyFeeRegistryAbi, this.userAccount.signer)
        this.transferSelectorNFT = new Contract(contractAddresses.TRANSFER_SELECTOR_NFT, TransferSelectorNFTAbi, this.userAccount.signer);
        this.exchange = new Contract(contractAddresses.EXCHANGE, LooksRareExchangeAbi, this.userAccount.signer)
        this.coder = new Web3ABICoder(LooksRareExchangeAbi)
        this.royaltyFeeSetter = new Contract(contractAddresses.ROYALTY_FEE_SETTER, RoyaltyFeeSetterAbi, this.userAccount.signer)
        this.royaltyFeeGeter = new Contract(FeeGeterAddress[wallet.chainId], FeesABI, this.userAccount.signer)
        this.GasWarpperToken = {
            name: 'GasToken',
            symbol: 'GasToken',
            address: contractAddresses.WETH,
            decimals: 18
        }
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
            return this.userAccount.getAssetApprove(asset, this.contractAddresses.EXCHANGE)
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

    private async createOrder(isOrderAsk: boolean, params: CreateOrderParams): Promise<MakerOrderWithSignature> {
        const {asset, startAmount, quantity, expirationTime, paymentToken,isCheckOrderApporve} = params
        const direction = isOrderAsk ? OrderSide.Sell : OrderSide.Buy
        let nonce = params.nonce
        if (typeof nonce == "undefined") {
            nonce = await this.api.getOrdersNonce(this.walletInfo.address)
        }

        const decimals = paymentToken?.decimals && paymentToken?.address ? paymentToken.decimals : 18
        const currency = !paymentToken?.address || paymentToken?.address == NULL_ADDRESS
            ? this.contractAddresses.WETH
            : paymentToken.address
        const price = ethers.utils.parseUnits(toFixed(startAmount).toString(), decimals).toString()


        if(isCheckOrderApporve){
            const {isApprove, balances, calldata} = await this.getOrderApprove(params, direction)
            if (direction == OrderSide.Buy && new BigNumber(balances).lt(price)) {
                // const basePrice = utils.parseUnits(startAmount.toString(), paymentToken.decimals).gt(balances)
                throw new Error('CreateBuyOrder asset balances not enough')
            }

            if (direction == OrderSide.Sell && new BigNumber(balances).lt(quantity)) {
                throw new Error('CreateSellOrder asset balances not enough')
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

        const makerOrder: MakerOrder = {
            isOrderAsk,
            signer: this.walletInfo.address,
            collection: asset.tokenAddress,
            price, // :warning: PRICE IS ALWAYS IN WEI :warning:
            tokenId: asset.tokenId, // Token id is 0 if you use the STRATEGY_COLLECTION_SALE strategy
            amount: quantity.toString(),
            strategy: this.contractAddresses.STRATEGY_STANDARD_SALE,
            currency: currency,
            nonce: nonce || 0,
            startTime: now,
            endTime: expirationTime || now + 60 * 60 * 24, // 1 day validity
            minPercentageToAsk: Math.max(netPriceRatio, minNetPriceRatio),
            params: [],
        };
        const {walletProvider, walletSigner} = getProvider(this.walletInfo)
        let signer = walletSigner as any
        if (typeof window === 'undefined') {
            signer = new ethers.providers.Web3Provider(walletProvider).getSigner()
        }

        const addr = await  signer.getAddress()
        const signature = await signMakerOrder(signer, this.walletInfo.chainId, makerOrder);
        const {domain, type} = getMakerOrderTypeAndDomain(this.walletInfo.chainId);
        const signerAddr = utils.verifyTypedData(domain, type, makerOrder, signature)

        console.assert(signerAddr == this.walletInfo.address, "VerifyTypedData error")

        return {...makerOrder, signature}
    }

    async createSellOrder(params: SellOrderParams): Promise<MakerOrderWithSignature> {
        return this.createOrder(true, params)
    }

    async createBuyOrder(params: BuyOrderParams): Promise<any> {
        if (!params.paymentToken || params.paymentToken.address == NULL_ADDRESS) {
            params.paymentToken = this.GasWarpperToken
        }

        return this.createOrder(false, params)
    }

    private async getSchemaName(collection: string) {
        const nft = await this.transferSelectorNFT.checkTransferManagerForToken(collection);

        if (nft.toLowerCase() == this.contractAddresses.TRANSFER_MANAGER_ERC721.toLowerCase()) {
            return ElementSchemaName.ERC721
        }
        if (nft.toLowerCase() == this.contractAddresses.TRANSFER_MANAGER_ERC1155.toLowerCase()) {
            return ElementSchemaName.ERC1155
        }
        throw new Error("selectNFTType not support")
    }

    async adjustOrder(params: AdjustOrderParams) {
        const {
            orderStr,
            basePrice,
            paymentToken,
            royaltyFeePoints,
            protocolFeePoints,
            royaltyFeeAddress,
            protocolFeeAddress,
            quantity,
            expirationTime
        } = params

        const order: MakerOrder = JSON.parse(orderStr)
        const {tokenId, collection, amount, nonce, startTime, endTime} = order
        const schemaName = await this.getSchemaName(collection)
        const asset = {
            tokenId: tokenId.toString(),
            tokenAddress: collection,
            schemaName,
            collection: {
                royaltyFeePoints,
                protocolFeePoints,
                royaltyFeeAddress,
                protocolFeeAddress
            }
        } as Asset
        const decimals = paymentToken && paymentToken?.decimals && paymentToken?.address ? paymentToken.decimals : 18

        const startAmount = ethers.utils.formatUnits(basePrice, decimals)
        const sellParams = {
            asset,
            startAmount: Number(startAmount),
            quantity: quantity || Number(amount),
            listingTime: Number(startTime),
            expirationTime: expirationTime || Number(endTime),
            paymentToken: paymentToken || this.GasWarpperToken,
            nonce
        } as SellOrderParams

        return this.createSellOrder(sellParams)
    }

    // TODO
    async fulfillOrder(orderStr: string, option?: MatchOrderOption) {
        const {mixedPayment, metadata} = option || {}
        const order = JSON.parse(orderStr)
        //MakerOrderWithVRS
        if (order.signature) {
            //MakerOrderWithSignature
            const signature = splitECSignature(order.signature)
            order.v = signature.v
            order.r = signature.r
            order.s = signature.s
            delete order.signature

            order as MakerOrderWithVRS
        }

        if (order.isOrderAsk) { // sellOrder
            const takerBid: TakerOrder = {
                isOrderAsk: false,
                taker: this.walletInfo.address,
                price: order.price,
                tokenId: order.tokenId,
                minPercentageToAsk: '7500',
                params: []
            }
            const makerAsk = order
            if (order.currency.toLowerCase() == this.GasWarpperToken.address.toLowerCase()) {
                //matchAskWithTakerBidUsingETHAndWETH pay ETH
                return this.exchange.matchAskWithTakerBidUsingETHAndWETH(takerBid, makerAsk)
            } else {
                return this.exchange.matchAskWithTakerBid(takerBid, makerAsk)
            }

        } else { // buyOrder
            const asset: Asset = {
                tokenAddress: order.collection,
                tokenId: order.tokenId.toString(),
                schemaName: metadata || "ERC721"
            }

            let assetApprove
            if (asset.schemaName.toLowerCase() == 'erc721') {
                assetApprove = await this.userAccount.getAssetApprove(asset, this.contractAddresses.TRANSFER_MANAGER_ERC721)
            } else if (asset.schemaName.toLowerCase() == 'erc1155') {
                assetApprove = await this.userAccount.getAssetApprove(asset, this.contractAddresses.TRANSFER_MANAGER_ERC1155)
            }
            const {isApprove, calldata} = assetApprove
            if (!isApprove && calldata) {
                const tx = await this.userAccount.ethSend(calldata).catch((err: any) => {
                    throw err
                })
                if (tx) {
                    await tx.wait();
                }
            }

            const takerAsk: TakerOrder = {
                isOrderAsk: true,
                taker: this.walletInfo.address,
                price: order.price,
                tokenId: order.tokenId,
                minPercentageToAsk: '7500',
                params: []
            }
            const makerBid = order
            console.log(takerAsk, makerBid)
            return this.exchange.matchBidWithTakerAsk(takerAsk, makerBid)
        }

        // if (mixedPayment) {
        //     const payAmount = ""
        //     const takerBid = ""
        //     const makerAsk = ""
        //     return this.exchange.matchAskWithTakerBidUsingETHAndWETH(payAmount, takerBid, makerAsk)
        // }

    }


    async cancelOrders(nonces: string[]) {
        if (nonces.length == 0) {
            throw new Error('LooksRare  cancelOrders eq 0')
        }
        return this.exchange.cancelMultipleMakerOrders(nonces)
    }

    async cancelAllOrders(nonec?: string) {
        const minNonce = nonec || await this.exchange.userMinOrderNonce(this.walletInfo.address)
        return this.exchange.cancelAllOrdersForSender(minNonce)
    }

    async postOrder(orderStr: string) {
        return this.api.postOrder(orderStr)
    }

    async getAssetsFees(assets: string[]) {
        // const fees: FeesInfo[] = []
        const royaltys = await this.royaltyFeeGeter.royaltyFeeInfos(assets)
        // @ts-ignore
        const fees: FeesInfo[] = royaltys.fees.map((fee, index) => (
            <FeesInfo>{
                royaltyFeeAddress: royaltys.receivers[index],
                royaltyFeePoints: fee.toNumber(),
                protocolFeePoints: LOOKS_PROTOCOL_FEE_POINTS,
                protocolFeeAddress: this.contractAddresses.FEE_SHARING_SYSTEM
            }
        ))
        return fees
    }

    async getAssetsFeesOne(assets: string[]) {
        const fees: FeesInfo[] = []
        for (const asset of assets) {
            const royalty = await this.royaltyFeeRegistry.royaltyInfo(asset, 10000)
            fees.push(<FeesInfo>{
                royaltyFeeAddress: royalty[0],
                royaltyFeePoints: royalty[1].toNumber(),
                protocolFeePoints: LOOKS_PROTOCOL_FEE_POINTS,
                protocolFeeAddress: this.contractAddresses.FEE_SHARING_SYSTEM
            })
        }
        return fees

    }

    async updateRoyaltyInfoForCollectionIfOwner(params: { collection: string, setter: string, receiver: string, fee: number }) {

        // const royaltyFeeRegistry = await this.royaltyFeeSetter.royaltyFeeRegistry()

        const isCheck = await this.royaltyFeeSetter.checkForCollectionSetter(params.collection)
        console.log(isCheck.toString())
        if (isCheck[1] == 4) {
            throw new Error("not owner()")
        }

        const feeLimit = await this.royaltyFeeRegistry.royaltyFeeLimit()
        if (params.fee > feeLimit.toNumber()) {
            throw new Error("Set fee>feeLimit")
        }

        //RoyaltyFeeManager: https://etherscan.io/address/0x7358182024c9f1b2e6b0153e60bf6156b7ef4906#code
        //RoyaltyFeeSetter: https://etherscan.io/address/0x66466107d9cae4da0176a699406419003f3c27a8#readContract
        const {collection, setter, receiver, fee} = params
        return this.royaltyFeeSetter.updateRoyaltyInfoForCollectionIfOwner(collection, setter, receiver, fee.toString())

    }


}

