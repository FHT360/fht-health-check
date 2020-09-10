import test from "ava";
import { expect } from "chai";
import { getAnonymousClient } from "../src/utils";
import * as cheerio from "cheerio";
import { assert } from "chai";
import _ from "lodash";
import pMap from "p-map";
import { AxiosError } from "axios";
import { WEB_ROOT } from "../src/hosts";
import { CONCURRENCY } from "../src/constants";

const httpClient = getAnonymousClient(WEB_ROOT);

let urls: string[];
test.serial("can get home urls", async (t) => {
    const res = await httpClient.get("/");
    t.is(res.status, 200, "res.status not 200");
    const body = res.data as string;
    assert(typeof body === "string", "body is not string");
    const $ = cheerio.load(body);
    const hrefs = $("a[href]")
        .map((idx, el) => {
            return el.attribs["href"];
        })
        .get() as string[];

    urls = _.uniq(hrefs.filter((h) => !h.includes("javascript:") && !h.includes("https:")));
    t.truthy(urls.length, "should have urls");
});

test.serial("http get urls from home concurrently", async (t) => {
    t.timeout(10 * 60 * 1000);
    const errors: string[] = [];
    const mapper = async (url: string) => {
        try {
            const res = await httpClient.get(url);
            const s = `[${res.status}] ${url}`;
            t.is(res.status, 200, s);
        } catch (err) {
            const error = err as AxiosError;
            t.assert(error.isAxiosError, "not axios error?");
            const s = `[${error.response?.status}] ${url}`;
            errors.push(s);
            t.log("ERRRRRR", s);
        }
    };
    await pMap(urls, mapper, { concurrency: CONCURRENCY });
    t.log(`${urls.length} urls has errors: ${errors.length}`);
    expect(errors).to.be.empty;
});
