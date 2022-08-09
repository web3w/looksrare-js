import QueryString from "querystring";

function addZero(m) {
    return m < 10 ? '0' + m : m;
}

export function transformTime(timestamp = +new Date()) {
    if (timestamp) {
        const time = new Date(timestamp);
        const y = time.getFullYear();
        const M = time.getMonth() + 1;
        const d = time.getDate();
        const h = time.getHours();
        const m = time.getMinutes();
        const s = time.getSeconds();
        return y + '-' + addZero(M) + '-' + addZero(d) + ' ' + addZero(h) + ':' + addZero(m) + ':' + addZero(s);
    } else {
        return '';
    }
}

export const transformDate = (seconds) => {
    const dateFormat = 'YY-MM-DD HH:mm';
    return transformTime(Number(seconds) * 1000)

}

export async function getOwnerAssets(owner, chainId, limit) {
    const query = {
        include_orders: false,
        limit: limit || 10,
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
    } catch (error) {
        throw error
    }
}
