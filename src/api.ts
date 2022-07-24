import {
    APIConfig, sleep, BaseFetch
} from "./types";
import QueryString from "querystring";

export const LOOKS_API_KEY = ""

export const LOOKS_PROTOCOL_FEE_POINTS = 200
//Api Timeout
export const API_TIMEOUT = 10000

export const LOOKSRARE_API_CONFIG = {
    1: {
        apiBaseUrl: 'https://api.looksrare.org/api/v1'
    },
    4: {
        apiBaseUrl: 'https://api-rinkeby.looksrare.org/api/v1'
    }
}

export class LooksRareAPI extends BaseFetch {
    constructor(
        config?: APIConfig
    ) {
        const chainId = config?.chainId || 1
        const url = config?.apiBaseUrl || LOOKSRARE_API_CONFIG[chainId].apiBaseUrl || LOOKSRARE_API_CONFIG[1].apiBaseUrl
        const apiBaseUrl = config?.apiBaseUrl || url
        super({
            apiBaseUrl,
            apiKey: config?.apiKey || LOOKS_API_KEY
        })
        if (LOOKSRARE_API_CONFIG[chainId]) {
            this.proxyUrl = config?.proxyUrl
            this.apiTimeout = config?.apiTimeout || API_TIMEOUT
        } else {
            throw 'OpenseaAPI unsport chainId:' + config?.chainId
        }
    }

    // https://looksrare.github.io/api-docs/#/Orders/OrderController.getOrderNonce
    public async getOrdersNonce(collection: string, retries = 2): Promise<number> {
        try {
            // console.log("getOrdersNonce", `${this.apiBaseUrl}/orders/nonce/${collection}`)
            const json = await this.get(`/orders/nonce`, {address: collection}, {
                headers: {
                    // "X-Looks-Api-Key": this.apiKey || LOOKS_API_KEY
                }
            })
            if (!json.data) {
                throw new Error('Not  found: no  matching  order  found')
            }
            return json.data
        } catch (error: any) {
            this.throwOrContinue(error, retries)
            await sleep(3000)
            return this.getOrdersNonce(collection, retries - 1)
        }
    }

    //https://looksrare.github.io/api-docs/#/Orders/OrderController.getOrders
    public async getOrders(queryParams: { collection: string, tokenId: string }, retries = 2): Promise<{ orders: any, count: number }> {
        try {
            const json = await this.get(`/orders`, queryParams)
            if (json.message) {
                throw new Error(json.message)
            }
            const orders: any[] = json.data
            return {
                orders,
                count: orders.length
            }
        } catch (error: any) {
            this.throwOrContinue(error, retries)
            await sleep(3000)
            return this.getOrders(queryParams, retries - 1)
        }
    }

    public async postOrder(orderStr: string, retries = 2): Promise<any> {
        const singSellOrder = JSON.parse(orderStr)
        try {
            const opts = {
                headers: {
                    'X-Looks-Api-Key': this.apiKey || LOOKS_API_KEY
                }
            }
            const result = await this.post(
                `/orders`,
                singSellOrder,
                opts
            ).catch((e: any) => {
                console.log(e)
                throw e
            })
            //{"name":"BadRequestError","message":"Signer did not approve to sell the token","success":false,"data":null}
            return result

        } catch (error: any) {
            this.throwOrContinue(error, retries)
            await sleep(3000)
            return this.postOrder(orderStr, retries)
        }
    }

    //https://docs.opensea.io/reference/getting-assets
    public async getOwnerAssets(queryParams: { owner: string, chainId?: number, limit?: number }, retries = 2): Promise<any> {
        const {owner, limit, chainId} = queryParams
        const query = {
            include_orders: false,
            limit: limit || 1,
            owner
        }
        const queryUrl = QueryString.stringify(query)
        try {
            //https://testnets-api.opensea.io/api/v1/assets?include_orders=false&limit=1&owner=0x0A56b3317eD60dC4E1027A63ffbE9df6fb102401
            const apiUrl = {
                1: 'https://api.opensea.io/api/v1/assets?',
                4: 'https://testnets-api.opensea.io/api/v1/assets?'
            }
            const url = apiUrl[chainId || 1]
            console.log("getAssets", `${url}${queryUrl}`)
            const json = await this.getURL(`${url}${queryUrl}`)
            return json.assets.map(val => ({
                ...val.asset_contract,
                royaltyFeePoints: Number(val.collection?.dev_seller_fee_basis_points),
                protocolFeePoints: Number(val.collection?.opensea_seller_fee_basis_points),
                royaltyFeeAddress: val.collection?.payout_address,
                sell_orders: val.sell_orders,
                token_id: val.token_id,
                supports_wyvern: val.supports_wyvern
            }))
        } catch (error: any) {
            this.throwOrContinue(error, retries)

        }
    }
}
