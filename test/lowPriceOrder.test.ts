import * as secrets from '../../secrets.json'
import {OrderSide, SellOrderParams} from "web3-accounts";
import {LooksRareSDK} from "../src";
import {NULL_ADDRESS} from "web3-wallets";


// const buyer = '0x9F7A946d935c8Efc7A8329C0d894A69bA241345A';
const seller = '0x0A56b3317eD60dC4E1027A63ffbE9df6fb102401';
const chainId = 4

export const apiConfig = {
    1: {
        proxyUrl: 'http://127.0.0.1:7890',
        apiTimeout: 200000,
    },
    4: {
        proxyUrl: 'http://127.0.0.1:7890',
        apiTimeout: 200000,
    }
}


const sdk = new LooksRareSDK({
    chainId,
    address: seller,
    privateKeys: [secrets.accounts[seller]]
}, apiConfig[chainId]);

;(async () => {
        try {
            const asset = {
                "chainId": 4,
                "name": "Doodle #73",
                "tokenId": "8001",
                "tokenAddress": "0x5fecbbbaf9f3126043a48a35eb2eb8667d469d53",
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
                nonce: 1
            } as SellOrderParams


            // const assetsRoyalt = await sdk.getAssetsFees([asset.tokenAddress])

            // const approve = await sdk.getOrderApprove(buyParams,OrderSide.Sell)
            const sellData = await sdk.createSellOrder(buyParams)
            const orderStr = JSON.stringify(sellData)

            const adjestOrder = await sdk.adjustOrder({
                orderStr,
                basePrice: 1e10.toString(),
                royaltyFeeAddress: NULL_ADDRESS,
                royaltyFeePoints: 0
            })

            const nonec = adjestOrder.nonce.toString()
            const tx = await sdk.cancelOrders([nonec])

            await tx.wait()

            console.log(tx.hash)
            // const adjestOrderStr = JSON.stringify(adjestOrder)

            const result = await sdk.postOrder(orderStr)
            console.log(result)
            // console.assert(result.success, result.message)
            // const order = result.data

            // console.log(order.data.id || order)


            // const tx = await sdk.acceptOrder(sellOrderStr,{standard})
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
            // const sellLowData = await sdk.createLowerPriceOrder(lowParams)
            // const orderStr = JSON.stringify(sellLowData)

            // const cancelTx = await sdk.cancelOrders([order.exchangeData], {standard: protocol})
            // await cancelTx.wait()
            // console.log('Cancel success', cancelTx.hash)

        } catch (err: any) {
            console.log(err)
            debugger

        }
    }
)()
