import * as dotenv from 'dotenv'
import {OpenAIEmbeddings} from "langchain/embeddings/openai";
import {PineconeClient} from "@pinecone-database/pinecone";
import {CheerioWebBaseLoader} from "langchain/document_loaders/web/cheerio";
import {PuppeteerWebBaseLoader} from "langchain/document_loaders";
import Sitemapper from "sitemapper";
import * as fs from "fs";
import * as Path from "path";

dotenv.config()

const OPENAI_MODEL = "text-embedding-ada-002";

async function main(){
    const openAIEmbeddings = new OpenAIEmbeddings({openAIApiKey: process.env.OPENAI_API_KEY, modelName: OPENAI_MODEL});

    // Add text files to Pinecone
    const pineconeClient = new PineconeClient();
    await pineconeClient.init({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT
    });

    // Is there a sitemap for the site?
    const sitemapURL = new URL("sitemap.xml", process.env.TARGET_URL);
    console.log(`Sitemap URL: ${sitemapURL.toString()}`);

    // Make the root data directory if it doesn't exist
    const dataDirPath = Path.join(process.cwd(), "data", sitemapURL.hostname);
    fs.mkdirSync(dataDirPath, {recursive: true, mode: 0o755});

    // Get sitemap URLs
    const sitemapper = new Sitemapper.default({
        url: sitemapURL.toString(),
        timeout: 100000,
        concurrency: 5
    });

    let sitemapperEntries = await sitemapper.fetch();
    console.log(`Number of sitemap entries: ${sitemapperEntries.sites.length}`);

    // filter out non-blog entries
    sitemapperEntries.sites = sitemapperEntries.sites.filter((site) => {
        return !site.includes("blog");
    });

    console.log(`Number of sitemap entries after filtering out blog posts: ${sitemapperEntries.sites.length}`);

    sitemapperEntries.sites.forEach((site) => {
        console.log(site);
    });

    // DEBUG DEBUG DEBUG
    // TODO remove this
    // sitemapperEntries.sites = sitemapperEntries.sites.slice(0, 3);

    for (const site of sitemapperEntries.sites) {
        const siteURL = new URL(site);
        console.log(`Fetching ${siteURL.toString()}`);
        const webPaths = siteURL.pathname.split("/");
        fs.mkdirSync(Path.join(dataDirPath, ...webPaths), {recursive: true, mode: 0o755});
        const webContent = await fetchWebContentPuppeteer(siteURL);
        const filePath = Path.join(dataDirPath, ...webPaths, "index.txt");
        fs.writeFileSync(filePath.toString(), webContent, {flag: "w+"} );
    }


    // let pineconeStore = await PineconeStore.fromTexts(contentFiles, {}, openAIEmbeddings, {
    //     pineconeIndex: pineconeClient.Index("beato") });
    //
    // // Create a RetrievalQAChain
    // const model = new OpenAI({openAIApiKey: process.env.OPENAI_API_KEY, modelName: OPENAI_MODEL});
    // const qaChain = RetrievalQAChain.fromLLM(model, pineconeStore.asRetriever());
    // const answer = await qaChain.call({
    //     query: "Describe a unique chord change",
    // });
    //
    // console.info(`The answer is: ${answer}`);
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

main().then(() => {
    console.log("done");
});``