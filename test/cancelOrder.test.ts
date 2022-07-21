import * as secrets from '../../secrets.json'
import {OrderSide, SellOrderParams} from "web3-accounts";
import {LooksRareSDK} from "../src";
import {NULL_ADDRESS} from "web3-wallets";


// const buyer = '0x9F7A946d935c8Efc7A8329C0d894A69bA241345A';
const seller = '0x20E30b5a64960A08DFb64bEB8Ab65D860cD71Da7';
const chainId = 1

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
            const cancelTxGas = await sdk.cancelOrders(["2"])

            console.log('Cancel success', cancelTxGas.toString())

        } catch (err: any) {
            console.log(err)
            debugger

        }
    }
)()
