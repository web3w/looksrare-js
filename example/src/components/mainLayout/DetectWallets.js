import {Button, Col, message, Row} from "antd";
import React, {useContext, useEffect, useState} from "react";
import {Context} from '../AppContext'
import {detectWallets, getWalletInfo, Web3Wallets} from 'web3-wallets';
import QRCodeModal from "web3-qrcode-modal";
import {LooksRareAPI, LooksRareSDK} from "looksrare-js";

// import * as secrets from '../../../../../secrets.json'

export function DetectWallets() {
    const {setWallet} = useContext(Context);
    const [wallets, setWallets] = useState([])

    const linkWallet = async (item) => {
        await item.enable()
        setWallet(item)
    }
    const cancelOrderByNonce = async (nonce) => {
        const {chainId, address} = new Web3Wallets('metamask')
        const sdk = new LooksRareSDK({chainId, address})
        await sdk.cancelOrders([nonce])
    }
    useEffect(() => {

        const wallet = {qrcodeModal: QRCodeModal}
        const {metamask, coinbase, walletconnect} = detectWallets(wallet)
        setWallets([metamask, coinbase, walletconnect])


        async function fetchData() {

            // debugger
            // const orders = await sdk.api.getOrders({
            //     collection: "0x6d77496b7c143d183157e8b979e47a0a0180e86b",
            //     tokenId: "1"
            // })
            // debugger
            // console.log(orders)
        }

        fetchData().catch(err => {
            message.error(err);
        })


    }, []);

    return (
        <>
            <Button type="primary" onClick={() => cancelOrderByNonce("2")}>Open</Button>
            {wallets.length > 0 && <Row>
                <Col span={12} offset={6}>
                    {
                        wallets.map(item => (
                            <Button key={item.walletName} style={{margin: 10}}
                                    onClick={() => linkWallet(item)}>{item.walletName}</Button>))
                    }
                </Col>
            </Row>
            }

            {/*<Space  size="large" align="center">*/}
            {/*    /!*<Radio.Group value={wallet} onChange={handleSizeChange}>*!/*/}
            {/*    /!*    {*!/*/}
            {/*    /!*        walletList && (walletList.map((item) => (*!/*/}
            {/*    /!*            <Radio.Button key={item.walletName} value={item}>{item.walletName}</Radio.Button>*!/*/}
            {/*    /!*        )))*!/*/}
            {/*    /!*    }*!/*/}
            {/*    /!*</Radio.Group>*!/*/}


            {/*</Space>*/}
            {/*<Space>*/}
            {/*    <Divider>Test</Divider> */}
            {/*    <Button type="primary" onClick={() => getWallet()}>GetWalletInfo</Button>*/}
            {/*    <Button type="primary" onClick={() => openQR()}>Open</Button>*/}
            {/*</Space>*/}

        </>)
}



