import test from "ava";
import assert from "assert";
import { AXIOS_PROXY } from "../src/hosts";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
const coreWeb = "http://feige.fht360.cn";
const apiWeb = "https://api.fht360.cn";
const agencyWeb = "http://agencyapi.fht360.cn";

const hosts = [coreWeb, apiWeb, agencyWeb];
const securityPaths = ["/elmah.axd", "/trace.axd", "/glimpse.axd", "/swagger/ui/index", "/Help"];

for (const host of hosts) {
    for (const path of securityPaths) {
        const url = host + path;
        test(`HTTP GET: ${url}`, async (t) => {
            const config: AxiosRequestConfig = {
                baseURL: host,
                headers: {
                    "User-Agent": "FHT2BOT/V1",
                },
                maxRedirects: 0,
                proxy: AXIOS_PROXY,
                validateStatus(status) {
                    return true;
                },
            };

            const httpClient = axios.create(config);
            const res = await httpClient.get(path);
            t.truthy(res.status, "valid response must have statusCode");
            t.true(res.status >= 300, url + " has status code of " + res.status);
        });
    }
}
