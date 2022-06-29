import * as secrets from '../../secrets.json'
import {OrderSide, SellOrderParams} from "web3-accounts";
import {LooksRareAgent} from "../src";


// const buyer = '0x9F7A946d935c8Efc7A8329C0d894A69bA241345A';
const seller = '0x32f4B63A46c1D12AD82cABC778D75aBF9889821a';
const chainId = 4

export const apiConfig = {
    1: {
        proxyUrl: 'http://127.0.0.1:7890',
        apiTimeout: 200000,
    },
    4: {
        // proxyUrl: 'http://127.0.0.1:7890',
        apiTimeout: 200000,
    }
}


const eleSDK = new LooksRareAgent({
    chainId,
    address: seller,
    privateKeys: [secrets.accounts[seller]]
}, apiConfig[chainId]);

;(async () => {
        try {
            const asset = {
                "chainId": 4,
                "name": "Doodle #73",
                "tokenId": "73",
                "tokenAddress": "0x3b06635c6429d0ffcbe3798b860d065118269cb7",
                "schemaName": "ERC721",
                "data": "https://storage.nfte.ai/nft/img/eth/0x4/3412474796512747127.webp",
                "collection": {
                    "royaltyFeePoints": 500,
                    "royaltyFeeAddress": "0xc7711f36b2c13e00821ffd9ec54b04a60aefbd1b"
                }
            }
            const buyParams = {
                asset,
                startAmount: Number('0.52'),
                quantity: 1,
                expirationTime: Math.round(new Date().getTime() / 1000 + 86000),
            } as SellOrderParams


            // const assetsRoyalt = await eleSDK.getAssetsFees([asset.tokenAddress])

            // const approve = await eleSDK.getOrderApprove(buyParams,OrderSide.Sell)
            const sellData = await eleSDK.createSellOrder(buyParams)
            const orderStr = JSON.stringify(sellData)

            const result = await eleSDK.postOrder(orderStr)
            console.log(result)
            // console.assert(result.success, result.message)
            // const order = result.data

            // console.log(order.data.id || order)


            // const tx = await eleSDK.acceptOrder(sellOrderStr,{standard})
            // await tx.wait()
            // console.log(tx.hash)
            //
            // const lowParams = {
            //     orderStr: sellOrderStr,
            //     basePrice: new BigNumber(0.009).times(new BigNumber(10).pow(18)).toString(),
            //     royaltyFeePoints: 200,
            //     royaltyFeeAddress: "0x0A56b3317eD60dC4E1027A63ffbE9df6fb102401",
            //     protocol
            // } as LowerPriceOrderParams
            // //
            // const sellLowData = await eleSDK.createLowerPriceOrder(lowParams)
            // const orderStr = JSON.stringify(sellLowData)

            // const cancelTx = await eleSDK.cancelOrders([order.exchangeData], {standard: protocol})
            // await cancelTx.wait()
            // console.log('Cancel success', cancelTx.hash)

        } catch (err: any) {
            console.log(err)
            debugger

        }
    }
)()
