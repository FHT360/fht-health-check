//@ts-check
const axios = require("axios").default;
/** @type {import("assert")} */
const assert = require("assert");
const shelljs = require("shelljs");
const fs = require("fs");
const opn = require("opn");
const commander = require("commander");

commander.option("-s, --strip").parse(process.argv);

const strip = !!commander.strip;

const baseURL = "http://192.168.0.229:8081";
const http = axios.create({ baseURL });

/**
 * @typedef {{dag_id:string, dag_run_url:string, execution_date:string, start_date:string}} Dag
 */

/**
 * @param {string} dagPrefix
 * @returns {Promise<Dag>}
 */
async function getLatestRunOfDag(dagPrefix) {
    const res = await http.get("/api/experimental/latest_runs");
    const d = res.data;
    /** @type {Dag} */
    const dag = d.items.find((d) => d.dag_id.startsWith(dagPrefix));
    assert(dag.dag_id, "dag_id is falsy");
    return dag;
}

/**
 * @param {string} dagId
 * @param {string} taskId
 * @param {string} execution_date
 */
async function getDagRunTask(dagId, taskId, execution_date) {
    const res = await http.get(`/api/experimental/dags/${dagId}/dag_runs/${execution_date}/tasks/${taskId}`);
    console.log(res.data);
}

/**
 * @param {string} dagId
 * @param {string} taskId
 * @param {string} execution_date
 */
async function getDagRunLog(dagId, taskId, execution_date) {
    const url = `/admin/airflow/get_logs_with_metadata?task_id=${taskId}&dag_id=${dagId}&execution_date=${encodeURIComponent(
        execution_date,
    )}&try_number=1&metadata=null`;
    const res = await http.get(url);
    const data = res.data;
    const filePath = `./reports/${taskId}.log`;
    let content = data.message;
    if (strip) {
        content = content
            .split("\n")
            .map((s) => s.trim())
            .map((s) => s.split(" - ")[1])
            .join("\r\n");
    }
    await fs.promises.writeFile(filePath, content, {
        encoding: "utf-8",
    });
    opn(filePath);

    const attentions = shelljs
        .grep("ATTENTION", filePath)
        .grep("-v", "Template_Advanced5")
        .grep("-v", "Template_Advanced7")
        .grep("-v", "Subtask pupeteer_")
        .sort()
        .uniq("-i");

    const attentionFilePath = `./reports/${taskId}.attention.log`;
    await fs.promises.writeFile(attentionFilePath, attentions, {
        encoding: "utf-8",
    });
    opn(attentionFilePath);
}

(async () => {
    const dagId = "check_health_md_v1";
    const dag = await getLatestRunOfDag(dagId);
    const runUrl = new URL(baseURL + dag.dag_run_url);
    const params = runUrl.searchParams;
    const execution_date = params.get("execution_date");
    assert(execution_date, "execution_date is falsy");
    const webUrl =
        baseURL + `/admin/airflow/graph?dag_id=${dagId}&execution_date=${encodeURIComponent(execution_date)}`;
    opn(webUrl);
    await getDagRunLog(dag.dag_id, "health_ava", execution_date);
})();
