import test from "ava";
import assert from "assert";
import { getAnonymousClient } from "../src/utils";
import { WEB_ROOT } from "../src/hosts";
import { AxiosError } from "axios";
const coreWeb = "http://www.fht360.cn";
const apiWeb = "http://api.fht360.cn";
const agencyWeb = "http://agency.fht360.cn";

const httpClient = getAnonymousClient(WEB_ROOT);

const hosts = [coreWeb, apiWeb, agencyWeb];
const securityPaths = ["/elmah.axd", "/trace.axd", "/glimpse.axd", "/swagger/ui/index", "/Help"];

test.failing("http://192.168.0.228/T17836 all production sensitive pages must be blocked", async (t) => {
    for (const host of hosts) {
        for (const path of securityPaths) {
            const url = host + path;
            try {
                const res = await httpClient.get(url);
                t.truthy(res.status, "valid response must have statusCode");
                t.true(res.status >= 400, url + " has status code of " + res.status);
            } catch (err) {
                const error = err as AxiosError<unknown>;
                t.truthy(err);
                const response = error.response;
                t.truthy(response, "must have response but is: " + err);
                assert(response, "response should be truthy");
                t.true(response.status >= 302, url + " has status code of: " + response.status);
            }
        }
    }
});
