import {arrayify, hexZeroPad, joinSignature, splitSignature} from "@ethersproject/bytes";
import {ec as EC} from "elliptic";
import {ecSignHash, fetchJson, getEIP712Hash, privateKeysToAddress, WalletInfo} from "web3-wallets";
import {_TypedDataEncoder} from "@ethersproject/hash";

// const EC = _ec.ec;

export interface RequestArguments {
    method: string;
    params?: unknown[] | object;
}

// export type ProviderChainId = string;
//
// export interface ProviderConnectInfo {
//     readonly chainId: string
// }

export type  ProviderAccounts = string[];


export interface ResponseError {
    message: string;
    code: number;
}

export interface ResponsePayload {
    result: any;
    id: number;
    jsonrpc: string;
    error?: ResponseError;
}

export function createProvider(walletInfo: WalletInfo) {
    const {chainId, address, privateKeys} = walletInfo
    const accounts = privateKeys && privateKeysToAddress(privateKeys)
    if (accounts) {
        if (!accounts[address.toLowerCase()]) throw 'PriKey error'
    }

    return async (body: RequestArguments) => {
        const {params, method} = body
        if (!method || typeof method !== 'string') {
            throw new Error('Error: missing or invalid topic field')
        }
        if (!params || typeof params !== "object") {
            throw new Error('Error: missing or invalid webhook field')
        }

        if (method == "eth_chainId") {
            return '0x' + (chainId).toString(16)
        } else if (method == "eth_accounts") {
            return [address.toLowerCase()]
        } else if (method === "eth_signTypedData_v4" || method === "eth_signTypedData_v3" || method === "eth_signTypedData") {
            if (Array.isArray(params) && params.length == 2) {
                const account = <string>params[0]
                // @ts-ignore
                const privateKey = accounts[account.toLowerCase()]
                const typeData = JSON.parse(<string>params[1])


                if (typeData.types.EIP712Domain) {
                    delete typeData.types.EIP712Domain
                }
                const typeHash = _TypedDataEncoder.hash(typeData.domain, typeData.types, typeData.message)
                const curve = new EC("secp256k1");
                const keyPair = curve.keyFromPrivate(arrayify(privateKey));
                const digestBytes = arrayify(typeHash);
                if (digestBytes.length !== 32) {
                    // logger.throwArgumentError("bad digest length", "digest", digest);
                }
                const signature = keyPair.sign(digestBytes, {canonical: true});
                const vrs = splitSignature({
                    recoveryParam: signature.recoveryParam,
                    r: hexZeroPad("0x" + signature.r.toString(16), 32),
                    s: hexZeroPad("0x" + signature.s.toString(16), 32),
                })

                return joinSignature(vrs)

            }

        } else {
            console.log("RPC:", body)
            const option = {
                method: 'POST',
                body: JSON.stringify(body),
                headers: {'Content-Type': 'application/json'}
            }

            const res = await fetchJson("", option)
            if (res.ok) {
                return res.json().result
            }

            throw new Error(" ")
        }
    }
}


export class JsonRpcSigner {
    address = ""
    chainId: number
    provider: (args: RequestArguments) => any

    constructor(wallet: WalletInfo) {
        const {chainId, address} = wallet
        this.address = address.toLowerCase()
        this.chainId = chainId
        this.provider = createProvider(wallet)
    }

    async request(args: RequestArguments) {
        return this.provider(args)
    };

    //ProviderAccounts
    async enable(): Promise<ProviderAccounts> {
        return Promise.resolve([this.address])
    }
}

