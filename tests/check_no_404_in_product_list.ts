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
test.serial("can get product list first 5 page urls", async (t) => {
    const res = await httpClient.get("/list");
    t.is(res.status, 200, "res.status not 200");
    const body = res.data as string;
    assert(typeof body === "string", "body is not string");
    const $ = cheerio.load(body);

    function extractPageLinks($: CheerioStatic): string[] {
        const pageLinks = $(".fht-pagination__content a[href]")
            .map((idx, el) => {
                return el.attribs["href"];
            })
            .get() as string[];
        assert(pageLinks.length, "pageLinks empty");
        return pageLinks;
    }
    const pageLinks = extractPageLinks($);
    function extractLinks($: CheerioStatic): string[] {
        const hrefs = $("a[href]")
            .map((idx, el) => {
                return el.attribs["href"];
            })
            .get() as string[];
        assert(hrefs.length, "hrefs empty");
        return hrefs;
    }

    const hrefs = extractLinks($);

    for (const pageLink of _.take(pageLinks, 4)) {
        const res2 = await httpClient.get(pageLink);
        t.is(res2.status, 200, "res2.status not 200");
        const body2 = res2.data as string;
        assert(typeof body2 === "string", "body2 is not string");
        const $2 = cheerio.load(body2);
        extractLinks($2).forEach((h) => hrefs.push(h));
    }

    urls = _.uniq(hrefs.filter((h) => !h.includes("javascript:")));
    t.truthy(urls.length, "should have urls");
});

test.serial("http get urls from product list concurrently", async (t) => {
    t.timeout(5 * 60 * 1000);
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
