import {Button, Col, Divider, List, message, Row, Space,Avatar, Table} from "antd";
import React, {useContext, useEffect, useState} from "react";
import {Context} from '../AppContext'
import {utils} from "web3-wallets";
import {transformDate} from "../js/helper";

export function Accounts() {
    const {sdk} = useContext(Context);
    const [assets, setAssets] = useState([])
    const [orders, setOrders] = useState([])

    const seaportGetOrder = async (item) => {
        const order = await sdk.api.getOrders({
            asset_contract_address: item.address,
            token_ids: [item.token_id]
        })
        setOrders(order.orders)
        message.success("X2y2 post order success")
    }

    const columns = [
        {
            title: 'side',
            dataIndex: 'side'
        },
        {
            title: 'currentPrice',
            dataIndex: 'currentPrice',
            render: (text, record) => (<a>{utils.formatEther(text)}</a>)
        },
        {
            title: 'expirationTime',
            dataIndex: 'expirationTime',
            render: (text, record) => (<a>{transformDate(text)}</a>)
        },
        {
            title: 'Action',
            dataIndex: 'state',
            render: (text, record) => (<Button onClick={() => seaportCancelOrder(record)}>CancelOrder</Button>)
        }
    ];
    const looksCreateSellOrder = async (item) => {
        const order = await sdk.createSellOrder({
                asset: {
                    tokenAddress: item.address,
                    tokenId: item.token_id,
                    schemaName: item.schema_name,
                    quantity:1,
                    collection: {
                        royaltyFeeAddress: item.royaltyFeeAddress,
                        royaltyFeePoints: item.royaltyFeePoints
                    }
                },
                startAmount: 0.99
            }
        )
        const orderStr = JSON.stringify(order)
        const orderRes = await sdk.postOrder(orderStr)
        message.success("Seaport  post sell order success")
    }

    const looksCreateBuyOrder = async (item) => {
        const order = await sdk.createBuyOrder({
                asset: {
                    tokenAddress: item.address,
                    tokenId: item.token_id,
                    schemaName: item.schema_name,
                    quantity:1,
                    collection: {
                        royaltyFeeAddress: item.royaltyFeeAddress,
                        royaltyFeePoints: item.royaltyFeePoints
                    }
                },
                startAmount: 0.001
            }
        )
        const orderStr = JSON.stringify(order)
        const orderRes = await sdk.postOrder(orderStr)
        message.success("Seaport  post buy order success")
    }
    const seaportCancelOrder = async (item) => {
        await sdk.contracts.cancelOrders([item.protocolData.parameters])
    }
    useEffect(() => {
        async function fetchOrder() {
            const assets = await sdk.userAccount.getUserAssets({limit:2})
            // debugger
            setAssets(assets)
        }

        fetchOrder().catch(err => {
            // message.error(err);
            console.log(err)
        })
    }, [sdk]);

    return (
        <>
            {assets.length > 0 && <List
                style={{padding: '20px 60px'}}
                itemLayout="vertical"
                size="large"
                dataSource={assets}
                renderItem={item => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={<Avatar src={item.image_url} shape={'square'} size={60}/>}
                            title={<a>{item.name}</a>}
                            description={item.description}
                        />
                        <Space>
                            <Button key={item.name}
                                    onClick={() => looksCreateSellOrder(item)}>CreateSellOrder</Button>
                            <Button key={item.name} onClick={() => looksCreateBuyOrder(item)}>CreateBuyOrder</Button>

                            <Button onClick={() => seaportGetOrder(item)}>GetOrder</Button>
                        </Space>
                        <Divider></Divider>
                        <Table columns={columns} rowKey="listingTime" dataSource={orders} pagination={false}/>
                        {/*{()=>actions(item)}*/}
                    </List.Item>
                )}
            />}


        </>
    )
}



