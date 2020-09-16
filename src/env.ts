import assert from "assert";

export enum ApplicationEnvEnum {
    Local = "Local",
    Development = "Development",
    MobileDevelopment = "MobileDevelopment",
    Staging = "Staging",
    Production = "Production"
}

export const PROXY_URL = process.env.PROXY as string | undefined;
export const APP_ENV = process.env.APP_ENV as ApplicationEnvEnum;

assert(APP_ENV, "NO APP_ENV environment variable");

if (APP_ENV) {
    assert(
        ApplicationEnvEnum[APP_ENV],
        "Invalid Application Env: " + APP_ENV + ", valid options: " + Object.keys(ApplicationEnvEnum).join(", "),
    );
}
