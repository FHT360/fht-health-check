import test from "ava";
import { expect } from "chai";
import { AspNetWebApiError, getAnonymousClient } from "../src/utils";
import * as cheerio from "cheerio";
import { assert } from "chai";
import _ from "lodash";
import pMap from "p-map";
import { AxiosError } from "axios";
import { WEB_ROOT } from "../src/hosts";
import { CONCURRENCY } from "../src/constants";
import fs from "fs-extra";
import path from "path";

const httpClient = getAnonymousClient(WEB_ROOT);
const resolve = (p: string) => path.join(process.cwd(), p);

const urls = new Set<string>();

for (const n of ["home", "products", "topicposts"]) {
    const p = resolve(`./build/${n}.json`);
    assert(fs.existsSync(p), `FILE DOES NOT EXIST: ${p}`);
    const us = JSON.parse(fs.readFileSync(p, { encoding: "utf-8" })) as string[];
    us.forEach((u) => urls.add(u));
}

for (const url of Array.from(urls)) {
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
