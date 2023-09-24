import {Document} from "langchain/document";
import {PuppeteerWebBaseLoader} from "langchain/document_loaders";

class WebScraperRepository
{
    // TODO:
    // * Inject Puppeteer into the constructor
    // * Remove PuppeteerWebBaseLoader

    async fetchWebContentDocument(webUrl: URL): Promise<Document[]> {
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

    async fetchWebContentString(webUrl: URL): Promise<string> {
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
}