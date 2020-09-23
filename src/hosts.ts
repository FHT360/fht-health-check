import assert from "assert";
import { AxiosProxyConfig } from "axios";
import { ApplicationEnvEnum, APP_ENV, PROXY_URL } from "./env";

export const WEB_ROOT = (() => {
    if (APP_ENV === ApplicationEnvEnum.Development) {
        return "http://www.developmentfht360web.com";
    } else if (APP_ENV === ApplicationEnvEnum.MobileDevelopment) {
        return "http://www.mobiledevelopmentfht360web.com";
    } else if (APP_ENV === ApplicationEnvEnum.Staging) {
        return "http://www.stagingfht360web.com";
    } else if (APP_ENV === ApplicationEnvEnum.Production) {
        return "http://feige.fht360.cn";
    }
    throw new Error("impossible env: " + APP_ENV);
})();

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
