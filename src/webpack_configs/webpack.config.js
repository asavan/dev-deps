import os from "os";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CopyPlugin from "copy-webpack-plugin";
import webpack from "webpack";

import {wsServerOnServer} from "../devtools/ws-server.js";

const SERVER_WILDCARD = "0.0.0.0";

function getLocalExternalIP(defaultAddr) {
    let cand = Object.values(os.networkInterfaces())
        .flat()
        .filter(a => a.family === "IPv4" && !a.internal);
    if (cand.length > 1) {
        cand = cand.filter(a => a.netmask === "255.255.255.0");
    }
    if (cand.length === 0) {
        return defaultAddr;
    }
    cand = cand.map(a => a.address);
    console.log(cand);
    return cand.slice(-1)[0];
}

function getHostUrl(ip, port) {
    return "http://" + ip + ":" + port;
}

const devConfig = (extraContent, settings) => {
    const resolved_addr = getLocalExternalIP(SERVER_WILDCARD);
    console.log(resolved_addr);
    const additionCopy = extraContent || [];
    const port = 8080;
    const shUrl = getHostUrl(resolved_addr, port);
    const params = {
        sh : shUrl
    };
    const paramsQuery = new URLSearchParams(params).toString();
    const devServer = {
        compress: true,
        port: port,
        allowedHosts: "all",
        hot: true,
        open: `/?${paramsQuery}`,
        host: SERVER_WILDCARD
    };
    if (settings && settings.wsPath) {
        devServer.port = settings.wsPort || devServer.port;
        devServer.onListening = (ds) => {
            wsServerOnServer(ds.server, settings.wsPath);
        };
    }
    return {
        entry: {main: ["./src/index.js", "./src/css/style.css"]},
        module: {
            rules: [
                {
                    test: /\.css$/i,
                    use: [MiniCssExtractPlugin.loader, {
                        loader: "css-loader",
                        options: {
                            url: false
                        }
                    }],
                }
            ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                minify: false,
                scriptLoading: "module",
                template: "./src/index.html"
            }),
            new MiniCssExtractPlugin({
                filename: "[name].css"
            }),
            new webpack.DefinePlugin({
                __USE_SERVICE_WORKERS__: false
            }),
            new CopyPlugin({
                patterns: [
                    {from: "./src/images", to: "./images"},
                    {from: "./src/app.webmanifest", to: "./"},
                    {from: "./.well-known", to: "./.well-known"},
                    ...additionCopy
                ],
            })
        ],
        devServer: devServer
    };
};

export default devConfig;
