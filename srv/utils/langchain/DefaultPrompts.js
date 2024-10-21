const prompts = require("@langchain/core/prompts");

//  refinePromptTemplate
const refinePromptTemplate = `Your job is to produce a final summary
We have provided an existing summary up to a certain point: "{existing_answer}"
We have the opportunity to refine the existing summary
(only if needed) with some more context below.
------------
"{text}"
------------

Given the new context, refine the original summary
If the context isn't useful, return the original summary.

REFINED SUMMARY:`;

//  defaultPromptTemplate
const defaultPromptTemplate = `Write a concise summary of the following:


"{text}"


CONCISE SUMMARY:`;

const REFINE_PROMPT = new prompts.PromptTemplate({
  template: refinePromptTemplate,
  inputVariables: ["existing_answer", "text"]
});
const DEFAULT_PROMPT = new prompts.PromptTemplate({
    template: defaultPromptTemplate,
    inputVariables: ["text"]
});

module.exports = {REFINE_PROMPT, DEFAULT_PROMPT};

