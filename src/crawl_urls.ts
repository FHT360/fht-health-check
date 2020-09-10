import assert from "assert";
import { getAnonymousClient } from "./utils";
import fs from "fs-extra";
import * as path from "path";
import { uniq } from "lodash";
import cheerio from "cheerio";
import _ from "lodash";
import commander from "commander";
import chalk from "chalk";

commander
    .requiredOption("-p, --path <path>", "url path to crawl")
    .requiredOption("-o --savedPath <savedPath>", "saved output path")
    .parse(process.argv);

const urlPath = commander.path;
const savedPath = commander.savedPath;

async function crawl_urls(urlPath: string, savedPath: string, maxPage = 5) {
    const u = new URL(urlPath);
    const pathAndQuery = u.pathname + u.search;
    const httpClient = await getAnonymousClient(u.origin);
    console.log("HTTP GET", chalk.green(pathAndQuery));
    const res = await httpClient.get(pathAndQuery);
    assert.strictEqual(res.status, 200, "res.status not 200");
    const body = res.data as string;
    assert(typeof body === "string", "body is not string");
    const $ = cheerio.load(body);

    function extractPageLinks($: CheerioStatic): string[] {
        const pageLinks = $(".fht-pagination__content a[href]")
            .map((idx, el) => {
                return $(el).attr("href");
            })
            .get() as string[];
        return pageLinks;
    }
    const pageLinks = extractPageLinks($);
    function extractLinks($: CheerioStatic): string[] {
        const hrefs = $("a[href]")
            .map((idx, el) => {
                let href = $(el).attr("href");
                if (!href) return;
                if (href.startsWith("/")) {
                    href = u.origin + href;
                }
                return href;
            })
            .get() as string[];
        assert(hrefs.length, "hrefs empty");
        return hrefs;
    }

    const hrefs = extractLinks($);

    for (const pageLink of _.take(pageLinks, maxPage)) {
        const res2 = await httpClient.get(pageLink);
        assert.strictEqual(res2.status, 200, "res2.status not 200");
        const body2 = res2.data as string;
        assert(typeof body2 === "string", "body2 is not string");
        const $2 = cheerio.load(body2);
        extractLinks($2).forEach((h) => hrefs.push(h));
    }

    const urls = _.uniq(hrefs.filter((h) => !h.includes("javascript:")));
    assert(urls.length, "should have urls");

    const p = path.join(process.cwd(), savedPath);
    await fs.writeFile(p, JSON.stringify(uniq(urls), null, 2));
    console.log(chalk.green(`DONE saving ${urls.length} links to ${p}`));
}

(async () => {
    await crawl_urls(urlPath, savedPath);
})();
