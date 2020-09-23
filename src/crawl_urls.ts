import assert from "assert";
import { getAnonymousClient, PageTag } from "./utils";
import fs from "fs-extra";
import * as path from "path";
import { uniq } from "lodash";
import cheerio from "cheerio";
import _ from "lodash";
import commander from "commander";
import chalk from "chalk";
import { APP_ENV } from "./env";
import { WEB_ROOT } from "./hosts";

commander
    .requiredOption("-t --tag <tag>", `any of : ${Object.keys(PageTag).join(", ")}`)
    .option("-p --pages <pages>", "max number of pages to crawl for each tag")
    .parse(process.argv);
const tag = PageTag[commander.tag as PageTag];

const MAX_PAGE = Number(commander.pages) || 5;

assert(tag, "tag is falsy, should be any of: " + Object.keys(PageTag).join(", "));

async function crawl_urls(tag: PageTag, maxPage = MAX_PAGE) {
    let urlPath;
    if (tag === PageTag.home) {
        urlPath = WEB_ROOT;
    } else if (tag === PageTag.products) {
        urlPath = WEB_ROOT + "/list";
    } else if (tag === PageTag.topicposts) {
        urlPath = WEB_ROOT.replace(/(www|feige)\./, "topic.") + "/fuwu";
    } else {
        throw new Error("impossible tag: " + tag);
    }

    const u = new URL(urlPath);
    const pathAndQuery = u.pathname + u.search;
    const httpClient = await getAnonymousClient(u.origin);
    console.log("HTTP GET", chalk.green(urlPath));
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
    const errors: Error[] = [];

    for (const pageLink of _.take(pageLinks, maxPage)) {
        try {
            const res2 = await httpClient.get(pageLink);
            assert.strictEqual(res2.status, 200, "res2.status not 200");
            const body2 = res2.data as string;
            assert(typeof body2 === "string", "body2 is not string");
            const $2 = cheerio.load(body2);
            extractLinks($2).forEach((h) => hrefs.push(h));
        } catch (err) {
            const error = new Error(`HTTP GET ${pageLink} failed: ${err}`);
            errors.push(error);
        }
    }

    const urls = _.uniq(hrefs.filter((h) => !h.includes("javascript:")));
    assert(urls.length, "should have urls");
    const p = path.join(process.cwd(), `build/${APP_ENV}/${tag}.json`);
    const d = path.dirname(p);
    await fs.ensureDir(d);
    await fs.writeFile(p, JSON.stringify(uniq(urls), null, 2));
    console.log(chalk.green(`DONE saving ${urls.length} links to ${p}`));
    return errors;
}

(async () => {
    const errors = await crawl_urls(tag);
    if (errors.length) {
        console.error(chalk.bgRed(`Crawling experienced ${errors.length} errors`));
        for (const error of errors) {
            console.error(chalk.red(error.message));
        }
    }

    process.exit(errors.length);
})();
