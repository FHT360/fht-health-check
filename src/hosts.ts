import assert from "assert";
import { AxiosProxyConfig } from "axios";

export const PROXY_URL = process.env.PROXY as string | undefined;

export const WEB_ROOT = "http://feige.fht360.cn/";

export const AXIOS_PROXY = (() => {
    let proxy: AxiosProxyConfig | false = false;
    if (PROXY_URL) {
        const u = new URL(PROXY_URL);
        proxy = {
            host: u.hostname,
            port: parseInt(u.port, 10),
        };
    }
    return proxy;
})();
