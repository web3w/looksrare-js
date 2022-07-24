import * as secrets from '../../../secrets.json'
import {LooksRareSDK} from "../src/index";
import {Asset, SellOrderParams} from "web3-accounts";


const seller = '0x36B1a29E0bbD47dFe9dcf7380F276e86da90c4c2';
const buyre = '0x32f4B63A46c1D12AD82cABC778D75aBF9889821a';
const chainId = 1


const sdk = new LooksRareSDK({
    chainId,
    address: buyre,
    privateKeys: secrets.privateKeys
}, {proxyUrl: "http://127.0.0.1:7890", apiKey: secrets.looksApikey});

const sellSdk = new LooksRareSDK({
    chainId,
    address: seller,
    privateKeys: secrets.privateKeys
} );

;(async () => {
        try {

            // const assets =await sdk.api.getOwnerAssets({owner: seller, chainId})
            // console.log(assets)
            // const asset:Asset = {
            //     tokenId:assets[0].token_id,
            //     tokenAddress:assets[0].address,
            //     schemaName:assets[0].schema_name
            // }

            // signature: '0xb0f39e866c5145481b34f395c4d6c7808c6a822c5cdf0c725e0c3a2fc6f3cb326a5b863361f58abe5e8f07e506342d762b91e8acfb4c3850f21a112ea0533b1b1c',
            //     v: 28,
            //     r: '0xb0f39e866c5145481b34f395c4d6c7808c6a822c5cdf0c725e0c3a2fc6f3cb32',
            //     s: '0x6a5b863361f58abe5e8f07e506342d762b91e8acfb4c3850f21a112ea0533b1b'

            const asset: Asset = {
                tokenId: "45",
                tokenAddress: "0x52F687B1c6aACC92b47DA5209cf25D987C876628",
                schemaName: "ERC721"
            }

            const buyParams = {
                asset,
                startAmount: 0.0009,
                quantity: 1,
                expirationTime: Math.round(new Date().getTime() / 1000 + 3600),
                listingTime: 0
            } as SellOrderParams
            //
            const buyData = await sdk.createBuyOrder(buyParams)
            const orderStr = JSON.stringify(buyData)
            // const result = await sdk.postOrder(orderStr)
            // console.log(result)
            const gas = await sellSdk.fulfillOrder(orderStr)
            console.log(gas)

            // const order = result.data
            // console.log(result)
            //


        } catch (err: any) {
            console.log(err)
            debugger

        }
    }
)()

// https://testnets-api.opensea.io/api/v1/assets?include_orders=false&limit=1&owner=0x9F7A946d935c8Efc7A8329C0d894A69bA241345A
// https://testnets-api.opensea.io/api/v1/assets?include_orders=false&limit=1&owner=0x9F7A946d935c8Efc7A8329C0d894A69bA241345A
