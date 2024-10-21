const { loadSummarizationChain, SummarizationChainParams } = require("langchain/chains");
const utilSummarizationChain = require("../langchain/SummarizationChain");
const { PromptTemplate } = require("@langchain/core/prompts");
const utilGenAIHub = require("../langchain/GenAIHubChatLLM");
const summaizationController = require('./utilSummarizationController');
const { TokenTextSplitter } = require("@langchain/textsplitters");
const { encodingForModel } = require('js-tiktoken');
const cds = require("@sap/cds/libx/_runtime/cds");
const MAX_TOKENS = parseInt(cds.env.requires.SUMMARIZATION_CONFIG.MAX_TOKENS)

const countTokens = async function (combinedContent) {
  //count no. of tokens in content
  const enc = encodingForModel("gpt-4-turbo-preview");
  const tokens = enc.encode(combinedContent);
  console.log('Tokens:', tokens.length);
  return tokens.length
}

const splitTokens = async function (combinedContent) {
  const tokenSplitter = new TokenTextSplitter({ encodingName: "gpt2", chunkSize: MAX_TOKENS * 0.75, chunkOverlap: (MAX_TOKENS * 0.75) * 0.15 });
  const docs = await tokenSplitter.createDocuments([combinedContent]);
  return docs
}

const summarize = async function (textDocuments, type, summarizeConfigParams) {

  //Combine Data to String
  const combinedContent = textDocuments.map(item => item.pageContent).join(' ');

  //Count Tokens
  let tokenCount = await countTokens(combinedContent)

  //Determine Summarization Type
  if (tokenCount < (MAX_TOKENS * 0.75)) {
    type = "stuff";
  } else if (type === undefined) {
    type = "map_reduce";
  }

  // Load chat model and configuration parameters
  const chatModel = new utilGenAIHub.GenAIHubChatModel({});
  const configParams = await summaizationController.summarizeConfig(type, summarizeConfigParams)

  // Do chunking
  let docs = await splitTokens(combinedContent)

  // Load summarization chain and get summary
  const summaryChain = utilSummarizationChain.load(chatModel, configParams);       
  const textSummary = await summaryChain.invoke({ input_documents: docs });

  console.log("Summary Type:" + type)
  return {textSummary, configParams};
}

module.exports = { summarize };