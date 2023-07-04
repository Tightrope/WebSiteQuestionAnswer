# Developer Notes

## TODO
* [ ] Get sitemap loader working

## Environment Variables
The following environment variables are required to run the code:
   * `OPENAI_API_KEY` - OpenAI API Key
   * `PINECONE_API_KEY` - Pinecone API Key
   * `PINECONE_ENVIRONMENT` - See Pinecone.io dashboard

Place the above in a `.env` file in the root of the project.

## Notes
 * To run this code in WebStorm, in the Run/Debug Configurations set node parameters to:
     ```
     --loader ts-node/esm
     ```
    The above is done to support loading LangChain ESM modules.

* OpenAI `text-embedding-ada-002` outputs [1536 dimensions](https://platform.openai.com/docs/guides/embeddings/what-are-embeddings)

## References
* [WebBaseLoader](https://python.langchain.com/en/latest/modules/indexes/document_loaders/examples/web_base.html)
* [Example: Sitemap Loader](https://python.langchain.com/en/latest/modules/indexes/document_loaders/examples/sitemap.html)
* [PuppeteerWebBaseLoader](https://js.langchain.com/docs/modules/indexes/document_loaders/examples/web_loaders/web_puppeteer)
* [National Credit Union Association, Locator](https://mapping.ncua.gov/)
