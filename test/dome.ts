import {ethers, BigNumber} from "ethers";
import {signMakerOrder, addressesByNetwork, SupportedChainId, MakerOrder} from "@looksrare/sdk";
import {fetchJson, getProvider} from "web3-wallets";
import * as secrets from '../../../secrets.json'
import {JsonRpcSigner} from "./JsonRpcSigner";
import {SignerProvider} from "web3-signer-provider";
// import JsonRpcProvider from "ethers";

const seller = '0x0A56b3317eD60dC4E1027A63ffbE9df6fb102401';
const chainId = 4

async function getUserNonce(address: string) {
    const data = await fetchJson("https://api-rinkeby.looksrare.org/api/v1/orders/nonce?address=" + address)
    return data
}

;(async () => {
    // const signer = ethersProvider.getSigner()
    const wallet = {
        chainId,
        address: seller,
        privateKeys: secrets.privateKeys
    }
    const {walletSigner, walletProvider} = getProvider(wallet);
    // const signerAddress = await walletSigner.getAddress();

    const addresses = addressesByNetwork[chainId];
    // const nonce =  await getUserNonce(signerAddress); // Fetch from the api

    //0x3f65a762f15d01809cdc6b43d8849ff24949c86a
    const now = Math.floor(Date.now() / 1000);
    const paramsValue = [];

// Get protocolFees and creatorFees from the contracts
    const netPriceRatio = 9000//BigNumber.from(10000).sub(protocolFees.add(creatorFees)).toNumber();
// This variable is used to enforce a max slippage of 25% on all orders, if a collection change the fees to be >25%, the order will become invalid
    const minNetPriceRatio = 7500;


    const sigerProvider = new SignerProvider(wallet)
    const signer = new ethers.providers.Web3Provider(sigerProvider).getSigner()
    // const provider1 = new ethers.providers.Web3Provider(walletProvider).getSigner()

    const signerAddress = await signer.getAddress();

    const makerOrder: MakerOrder = {
        isOrderAsk: true,
        signer: signerAddress,
        collection: "0xcE25E60A89F200B1fA40f6c313047FFe386992c3",
        price: "1000000000000000000", // :warning: PRICE IS ALWAYS IN WEI :warning:
        tokenId: "1", // Token id is 0 if you use the STRATEGY_COLLECTION_SALE strategy
        amount: "1",
        strategy: addresses.STRATEGY_STANDARD_SALE,
        currency: addresses.WETH,
        nonce: 0,
        startTime: now,
        endTime: now + 86400, // 1 day validity
        minPercentageToAsk: Math.max(netPriceRatio, minNetPriceRatio),
        params: paramsValue,
    };

    const signatureHash = await signMakerOrder(signer, chainId, makerOrder);
    console.log(signatureHash)

    const offerOrder = {
        "isOrderAsk": true,
        "tokenId": null,
        "collection": "0xA8Bf4A0993108454aBB4EBb4f5E3400AbB94282D",
        "strategy": "0x86F909F70813CdB1Bc733f4D97Dc6b03B8e7E8F3",
        "currency": "0xc778417E063141139Fce010982780140Aa0cD5Ab",
        "signer": "0x72c0e50be0f76863F708619784Ea4ff48D8587bE",
        "nonce": "20",
        "amount": "1",
        "price": "10201020023",
        "startTime": "1645470906",
        "endTime": "1645471906",
        "minPercentageToAsk": 8500,
        "params": "",
        "signature": "0xca048086170d030e223f36f21d329636dc163775ee4130c3f4d62cad8748bd5250cd0aacec582c73d0c53b555ae7661065ed9e16ff4fbfd5bb6e53688e4c807b1c",
    }

    // const url = "https://api.looksrare.org/assets/swagger.yaml"
    const url = "https://api-rinkeby.looksrare.org/api/v1/orders"

    fetchJson(url,)
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
