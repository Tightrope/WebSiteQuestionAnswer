import {IndexMeta, PineconeClient} from "@pinecone-database/pinecone";
import {OpenAIEmbeddings} from "langchain/embeddings/openai";
import {PineconeStore} from "langchain/vectorstores/pinecone";
import {Document} from "langchain/document";

export class PineconeRepository {
    constructor(private pineconeClient:PineconeClient, private indexName:string, openAIEmbeddings:OpenAIEmbeddings) {
    }

    async createIndexIfNotExists() {
        // Does the index exists?
        const indexList = await this.pineconeClient.listIndexes();
        const indexExists = indexList.find(index => index === this.indexName);

        if(!indexExists) {
            await this.pineconeClient.createIndex({
                createRequest: {
                    name: this.indexName,
                    dimension: 1536
                },
            });
        }

        await this.waitForIndexToBeReady();
        const indexMeta = await this.describeIndex();
        console.info(`Index ${this.indexName} state is ${indexMeta.status.state}`);
    }

    async storeDocuments(documents:Document[], openAIEmbeddings:OpenAIEmbeddings) {
        await PineconeStore.fromDocuments(documents, openAIEmbeddings,  {
            pineconeIndex: this.pineconeClient.Index(this.indexName)
        });
    }

    private async describeIndex():Promise<IndexMeta>    {
        return await this.pineconeClient.describeIndex({
            indexName: this.indexName
        });
    }

    private async waitForIndexToBeReady(): Promise<void> {
        let indexMeta = await this.describeIndex();
        if(!indexMeta.status.ready) {
            console.info(`Index ${this.indexName} state: ${indexMeta.status.state}`);
            return new Promise((resolve, reject) => {
                setTimeout(async () => {
                    try {
                        await this.waitForIndexToBeReady();
                        resolve();
                    } catch (e) {
                        console.error(`Error waiting for index ${this.indexName} to be ready. ${e}`);
                        reject(e);
                    }
                }, 5000)
            });
        }
    }
}