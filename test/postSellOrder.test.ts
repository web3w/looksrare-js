import * as secrets from '../../../secrets.json'
import {LooksRareSDK} from "../src/index";
import {Asset, SellOrderParams} from "web3-accounts";


// const seller = '0x9F7A946d935c8Efc7A8329C0d894A69bA241345A';
const seller = '0x36B1a29E0bbD47dFe9dcf7380F276e86da90c4c2';
const chainId = 1


const sdk = new LooksRareSDK({
    chainId,
    address: seller,
    privateKeys: secrets.privateKeys
}, {proxyUrl: "http://127.0.0.1:7890", apiKey: secrets.looksApikey});

;(async () => {
        try {

            // const assets =await sdk.api.getOwnerAssets({owner: seller, chainId})
            // console.log(assets)
            // const asset:Asset = {
            //     tokenId:assets[0].token_id,
            //     tokenAddress:assets[0].address,
            //     schemaName:assets[0].schema_name
            // }

            const asset: Asset = {
                tokenId: "45",
                tokenAddress: "0x52F687B1c6aACC92b47DA5209cf25D987C876628",
                schemaName: "ERC721"
            }

            const sellParams = {
                asset,
                startAmount: 0.13,
                quantity: 1,
                expirationTime: Math.round(new Date().getTime() / 1000 + 86000),
                listingTime: 0,
                protocolFeeAddress: "0x7538262Ae993ca117A0e481f908209137A46268e",
                protocolFeePoints: 200
            } as SellOrderParams
            //
            const sellData = await sdk.createSellOrder(sellParams)
            const orderStr = JSON.stringify(sellData)
            console.log(orderStr)
            const result = (await sdk.postOrder(orderStr))

            console.log(result)

            //
            //


        } catch (err: any) {
            console.log(err)
            debugger

        }
    }
)()

// https://testnets-api.opensea.io/api/v1/assets?include_orders=false&limit=1&owner=0x9F7A946d935c8Efc7A8329C0d894A69bA241345A
// https://testnets-api.opensea.io/api/v1/assets?include_orders=false&limit=1&owner=0x9F7A946d935c8Efc7A8329C0d894A69bA241345A
