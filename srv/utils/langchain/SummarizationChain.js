const { StuffDocumentsChain, MapReduceDocumentsChain, RefineDocumentsChain, LLMChain } = require("langchain/chains");
const { DEFAULT_PROMPT, REFINE_PROMPT } = require("./DefaultPrompts");

const load = (llm, params = { type: "map_reduce" }) => {
    if (params.type === "stuff") {
        const { prompt = DEFAULT_PROMPT } = params;
        const llmChain = new LLMChain({ prompt, llm, ...params });
        const chain = new StuffDocumentsChain({
            llmChain,
            documentVariableName: "text",
            ...params
        });
        return chain;
    }
    if (params.type === "map_reduce") {
        const { combineMapPrompt = DEFAULT_PROMPT, combinePrompt = DEFAULT_PROMPT  } = params;
        const llmChain = new LLMChain({ prompt: combineMapPrompt, llm, ...params });
        const combineLLMChain = new LLMChain({
            prompt: combinePrompt,
            llm: params.combineLLM ?? llm,
            ...params
        });
        const combineDocumentChain = new StuffDocumentsChain({
            llmChain: combineLLMChain,
            documentVariableName: "text",
            ...params
        });
        const chain = new MapReduceDocumentsChain({
            llmChain,
            combineDocumentChain,
            documentVariableName: "text",
            ...params
        });
        return chain;
    }
    if (params.type === "refine") {
        const { refinePrompt = REFINE_PROMPT, questionPrompt = DEFAULT_PROMPT, } = params;
        const llmChain = new LLMChain({ prompt: questionPrompt, llm, ...params });
        const refineLLMChain = new LLMChain({
            prompt: refinePrompt,
            llm: params.refineLLM ?? llm,
            ...params
        });
        const chain = new RefineDocumentsChain({
            llmChain,
            refineLLMChain,
            documentVariableName: "text",
            ...params
        });
        return chain;
    }
    throw new Error(`Invalid _type: ${params.type}`);
};


module.exports = {load};