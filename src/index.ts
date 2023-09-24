import * as dotenv from 'dotenv'
import {OpenAIEmbeddings} from "langchain/embeddings/openai";
import {PineconeClient} from "@pinecone-database/pinecone";
import {PineconeStore} from "langchain/vectorstores/pinecone";
import {CheerioWebBaseLoader} from "langchain/document_loaders/web/cheerio";
import {PuppeteerWebBaseLoader} from "langchain/document_loaders";
import Sitemapper from "sitemapper";
import * as fs from "fs";
import * as Path from "path";
import {OpenAI} from "langchain";
import {RetrievalQAChain} from "langchain/chains";
import {Document} from "langchain/document";
import {PineconeRepository} from "./respository/PineconeRepository.js";
import {ClientRequest} from "http";
import axios from "axios";

dotenv.config()

const OPENAI_MODEL = "text-embedding-ada-002";
const INDEX_NAME = process.env.PINECONE_INDEX_NAME;

async function main(){
    const targetUrl = new URL(process.argv[2]);
    console.log(`Target URL: ${targetUrl.toString()}`);

    const openAIEmbeddings = new OpenAIEmbeddings({openAIApiKey: process.env.OPENAI_API_KEY, modelName: OPENAI_MODEL});

    const pineconeClient = new PineconeClient();
    await pineconeClient.init({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT
    });

    const indexName = urlToIndexName(targetUrl);
    const pineconeRepo = new PineconeRepository(pineconeClient, indexName, openAIEmbeddings);
    await pineconeRepo.createIndexIfNotExists();

    const sitemapEntries = await fetchSitemapEntries(targetUrl);

    // Make the root data directory if it doesn't exist
    // const dataDirPath = Path.join(process.cwd(), "data", sitemapURL.hostname);
    // fs.mkdirSync(dataDirPath, {recursive: true, mode: 0o755});
    //
    // // Get sitemap URLs
    //
    // // DEBUG DEBUG DEBUG
    // // DWC
    // sitemapperEntries.sites = sitemapperEntries.sites.slice(0,100);
    //
    // // Flat map sitemap entries using the file path in the file name
    // for( const site of sitemapperEntries.sites) {
    //     const siteURL = new URL(site);
    //     let webPaths = siteURL.pathname.split("/");
    //     webPaths = webPaths.filter((path) => { return path !== ""; });
    //     if(webPaths.length === 0) { webPaths.push("index"); }
    //     const fileName = webPaths.join(".") + ".txt";
    //     const filePath = Path.join(dataDirPath, fileName);
    //     const webContent = await fetchWebContentPuppeteer(siteURL);
    //     fs.writeFileSync(filePath.toString(), webContent, {flag: "w+"} );
    //     console.log(filePath);
    // }
    //
    // let contentDocuments: Document[] = [];
    // for( const site of sitemapperEntries.sites) {
    //     const siteURL = new URL(site);
    //     const webContent = await fetchWebContentDocument(siteURL);
    //     contentDocuments = contentDocuments.concat(webContent);
    // }

    // // let pineconeStore = await PineconeStore.fromTexts(contentFiles, {}, openAIEmbeddings, {
    // let pineconeStore = await PineconeStore.fromDocuments(contentDocuments, openAIEmbeddings,  {
    //         pineconeIndex: pineconeClient.Index(INDEX_NAME) });

    // Create a RetrievalQAChain
    // const pineconeStore = await PineconeStore.fromExistingIndex(openAIEmbeddings, {
    //     pineconeIndex: pineconeClient.Index(INDEX_NAME) });
    // const model = new OpenAI({openAIApiKey: process.env.OPENAI_API_KEY});
    // const qaChain = RetrievalQAChain.fromLLM(model, pineconeStore.asRetriever());
    // const answer = await qaChain.call({
    //     query: "Who should I contact to open a commercial account?",
    // });
    //
    // console.info(`The answer is: ${JSON.stringify(answer)}`);
}

async function fetchWebContent(webUrl: URL): Promise<string> {
    let documentText = "";

    const cheerioLoader = new CheerioWebBaseLoader(webUrl.toString(),
        {
                timeout: 5000,
                selector: "body"
        });

    const document = await cheerioLoader.load();
    document.forEach((doc) => {
        console.log(doc.pageContent);
        console.log(doc.metadata);
        documentText += doc.pageContent;
    });

    return documentText;
}

async function fetchWebContentPuppeteer(webUrl: URL): Promise<string> {
    let documentText = "";

    const puppeteerWebLoader = new PuppeteerWebBaseLoader(webUrl.toString(),
    {
        launchOptions: {
            headless: "new",
        },
        gotoOptions: {
            waitUntil: "domcontentloaded",
        },
        evaluate: async (page, browser) => {
            return await page.evaluate(() => document.getElementsByTagName("main")[0].innerText);
        }
    });

    const document = await puppeteerWebLoader.load();
    document.forEach((doc) => {
        documentText += doc.pageContent;
    });

    return documentText;
}

async function fetchWebContentDocument(webUrl: URL): Promise<Document[]> {
    let documentText = "";

    const puppeteerWebLoader = new PuppeteerWebBaseLoader(webUrl.toString(),
        {
            launchOptions: {
                headless: "new",
            },
            gotoOptions: {
                waitUntil: "domcontentloaded",
            },
            evaluate: async (page, browser) => {
                return await page.evaluate(() => document.getElementsByTagName("main")[0].innerText);
            }
        });

    return await puppeteerWebLoader.load();
}

function urlToIndexName(webUrl: URL): string {
    let indexName = webUrl.hostname;

    if(webUrl.hostname.startsWith("www.")) {
        indexName = webUrl.hostname.substring(4);
    }

    let indexNameSplit = indexName.split(".");
    return indexNameSplit.slice(0, indexNameSplit.length - 1).join();
}

async function sitemapExists(targetUrl: URL): Promise<boolean> {
    const sitemapURL = new URL("sitemap.xml", targetUrl);
    const response = await axios.get(sitemapURL.toString());

    return response.status === 200;
}

async function fetchSitemapEntries(targetUrl: URL): Promise<string[]> {
    if(!await sitemapExists(targetUrl)) {
        throw new Error(`No sitemap found for ${targetUrl.hostname}`);
    }

    const sitemapURL = new URL("sitemap.xml", targetUrl);

    const sitemapper = new Sitemapper.default({
        url: sitemapURL.toString(),
        timeout: 100000,
        concurrency: 5
    });

    let sitemapperEntries = await sitemapper.fetch();
    console.info(`Number of sitemap entries: ${sitemapperEntries.sites.length}`);

    // filter out non-data bearing entries
    sitemapperEntries.sites = sitemapperEntries.sites.filter((site) => {
        return !site.includes("blog");
    });

    sitemapperEntries.sites = sitemapperEntries.sites.filter((site) => {
        return !site.includes("sitemap");
    });

    console.info(`Number of sitemap entries after filtering: ${sitemapperEntries.sites.length}`);

    if(sitemapperEntries.errors.length) {
        console.error(`Sitemap errors: ${JSON.stringify(sitemapperEntries.errors)}`);
        throw new Error(`Sitemap errors: ${JSON.stringify(sitemapperEntries.errors)}`);
    }

    return sitemapperEntries.sites;
}

main().then(() => {
    console.log("done");
});``