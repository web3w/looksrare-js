import {ethers, BigNumber} from "ethers";
import {signMakerOrder, addressesByNetwork, SupportedChainId, MakerOrder} from "@looksrare/sdk";
import {fetchJson, getProvider} from "web3-wallets";
import * as secrets from '../../../secrets.json'
import {SignerProvider} from "web3-signer-provider";
import {LooksRareSDK} from "../src/index";
import {apiConfig} from "./lowPriceOrder.test";
// import JsonRpcProvider from "ethers";

const seller = '0x0A56b3317eD60dC4E1027A63ffbE9df6fb102401';
const chainId = 4

const wallet = {
    chainId,
    address: seller,
    privateKeys: secrets.privateKeys
}

const sdk = new LooksRareSDK(wallet);
;(async () => {
    const tx = await sdk.updateRoyaltyInfoForCollectionIfOwner({
        collection: "0x6b0d7ed64d8facde81b76f8ea6598808ee93fb0b",
        setter: seller,
        receiver: seller,
        fee: 500
    })
    console.log(tx.hash)
    await tx.wait()

})()


// If for any reason, the signMakerOrder doesn't fit your needs (i.e you only have access to an wallet, and not a json rpc provider), you can replace the signMakerOrder call with this:
//
// import { generateMakerOrderTypedData, addressesByNetwork, SupportedChainId } from "@looksrare/sdk";
//
// const chainId = SupportedChainId.MAINNET;
// const addresses = addressesByNetwork[chainId];
//
// const signer = new ethers.Wallet(WALLET_PRIVATE_KEY);
// const { domain, value, type } = generateMakerOrderTypedData(signerAddress, chainId, makerOrder);
// const signature = await signer._signTypedData(domain, type, value);
