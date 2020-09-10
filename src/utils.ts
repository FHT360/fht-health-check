import * as cheerio from "cheerio";
import axios, { AxiosInstance, AxiosError } from "axios";
import assert from "assert";
import { AXIOS_PROXY } from "./hosts";

export class AspNetWebApiError extends Error {
    name = "AspNetWebApiError";
    serverExceptionMessage: string;
    serverStackTrace: string;
    constructor(message: string, serverStack: string) {
        super(message);
        this.serverExceptionMessage = message;
        this.serverStackTrace = serverStack;
    }
}

export function getAnonymousClient(host: string): AxiosInstance {
    const instance = axios.create({
        baseURL: host,
        headers: {
            "User-Agent": "FHT2BOT/V1",
        },
        maxRedirects: 0,
        proxy: AXIOS_PROXY,
        validateStatus(status) {
            return status >= 200 && status < 400;
        },
    });

    instance.interceptors.response.use(
        (value) => value,
        (error) => {
            const err = error as AxiosError<unknown>;
            assert(err.response, `should be AxiosError but is ${typeof err}: ${err}`);
            const body = err.response!.data as string;
            if (body.includes("Exception Details:")) {
                const $ = cheerio.load(body);
                const des = $("table[bgcolor]").last().text().replace("[No relevant source lines]", "").trim();
                if (des) {
                    const msg = des.split("\n", 1)[0];
                    return Promise.reject(new AspNetWebApiError(msg, des));
                }
            }
            return Promise.reject(err);
        },
    );
    return instance;
}
