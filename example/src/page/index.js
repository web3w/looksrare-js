import {message, Layout, Descriptions, Menu, Alert, Button} from 'antd';
import React, {useContext, useState} from "react";
import "../assets/css/index.css"
import {Context} from '../AppContext'
import {LooksRareSDK} from "./LooksRareSDK";
import {WalletList} from "./WalletList";
import pkg from "../../package.json"
import {Accounts} from "./Accounts";


const {Header, Content, Footer, Sider} = Layout;

export function MainLayout() {
    const {wallet, sdk} = useContext(Context);
    const [collapsed, setCollapsed] = useState(false);
    const [page, setPage] = useState("accounts");

    const switchMainNet = ()=>{
        // wallet.
    }
    const items = [
        {label: 'Accounts', key: 'accounts'},
        {label: 'LooksRare', key: 'looksRare'},
        {label: 'Wallets', key: 'wallets'},
    ];
    return (
        // <AppContext.Provider value={[wallet, setWallet]}>

        <Layout style={{minHeight: '100vh'}}>

            <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
                <div className="logo">{`${pkg.name}@${sdk.version}`}</div>
                <Menu theme="dark"
                      defaultSelectedKeys={[page]}
                      onClick={(val) => setPage(val.key)}
                      items={items}
                />
            </Sider>
            <Layout className="site-layout">

                <Header className="site-layout-background" style={{padding: 10}}>

                    {wallet.walletName && <Descriptions size="small" column={2}>
                        <Descriptions.Item label="Name">{wallet.walletName}</Descriptions.Item>
                        <Descriptions.Item label="ChainId">
                            <a>{wallet.chainId}</a>
                        </Descriptions.Item>
                        <Descriptions.Item label="Address">{wallet.address}</Descriptions.Item>
                        {wallet.walletProvider.peerMetaName &&
                        <Descriptions.Item
                            label="PeerMetaName">{wallet.walletProvider.peerMetaName}</Descriptions.Item>}
                    </Descriptions>}
                </Header>
                {wallet.chainId !=1 && <Alert message="Please switch to the main net to see Example" banner action={
                    <Button size="small" >
                        SwitchMainNet
                    </Button>
                }/>}
                {page == "accounts" && <Accounts/>}
                {page == "looksRare" && <LooksRareSDK/>}
                {page == "wallets" && <WalletList/>}

            </Layout>
        </Layout>
        // </AppContext.Provider>
    )
}



