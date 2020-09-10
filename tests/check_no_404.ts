import test from "ava";
import { AspNetWebApiError, getAnonymousClient } from "../src/utils";
import { assert } from "chai";
import _ from "lodash";
import { AxiosError } from "axios";
import { WEB_ROOT } from "../src/hosts";
import fs from "fs-extra";
import path from "path";
import url from "url";
import querystring from "querystring";

const httpClient = getAnonymousClient(WEB_ROOT);
const resolve = (p: string) => path.join(process.cwd(), p);

const urls = new Set<string>();

const secret = process.env.TEST_SECRET || "SECRET NOT FOUND";
console.log("TEST_SECRET", secret.length, _.camelCase(secret));

for (const n of ["home", "products", "topicposts"]) {
    const p = resolve(`./build/${n}.json`);
    assert(fs.existsSync(p), `FILE DOES NOT EXIST: ${p}`);
    const us = JSON.parse(fs.readFileSync(p, { encoding: "utf-8" })) as string[];
    us.forEach((u) => urls.add(u));
}

function makeUrlDedupTag(link: string, compactQueryKeys = ["Q", "companyId"], ignoreQueryKeys = ["stat_ctx"]): string {
    const p = url.parse(link.toLowerCase());
    const pathName = p.pathname || "";
    const q = querystring.parse(p.query as string);
    for (const ignoreKey of ignoreQueryKeys) {
        delete q[ignoreKey];
    }
    for (const [key, value] of Object.entries(q)) {
        if (compactQueryKeys.includes(key)) {
            q[key] = "*";
        }
    }
    return pathName + querystring.stringify(q);
}

const dedupUrls = Object.values(_.groupBy(Array.from(urls), makeUrlDedupTag)).map((us) => us[0]);
console.log("TOTAL", urls.size, "urls, after dedup: ", dedupUrls.length);

for (const url of dedupUrls) {
    test(`HTTP GET ${url}`, async (t) => {
        try {
            const res = await httpClient.get(url);
        } catch (e) {
            const error = e as AxiosError;
            if (error.isAxiosError) {
                t.fail(`AXIOS ERROR: [${error.response?.status}]: ${url}`);
            } else if (error instanceof AspNetWebApiError && error.serverExceptionMessage) {
                t.fail(`Server Exception: ${error.serverExceptionMessage}: ${url}`);
                t.log(error.serverStackTrace);
            } else {
                t.fail(`Non Axios Error: ${url}`);
            }
        }
    });
}
