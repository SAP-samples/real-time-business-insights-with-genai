const cds = require('@sap/cds');
const { PromptTemplate } = require("@langchain/core/prompts");
const MAX_TOKENS = parseInt(cds.env.requires.SUMMARIZATION_CONFIG.MAX_TOKENS) * 0.75


const checkSummaryExists = async (boId) => {
  const { BusinessObjectSummarizations } = await cds.services.BOSummaryService.entities;
  let summaryResponse = await SELECT.one.from(BusinessObjectSummarizations).where({ boId: boId });
  if (summaryResponse != undefined) {
    return { history: summaryResponse["history"], modifiedAt: summaryResponse["modifiedAt"] }
  } else {
    return { history: 'no historical summary found', modifiedAt: '' }
  }
}

const summarizeConfig = async (type, summarizeConfigParams) => {
  let configParams;
  const stuffPrompts = [
    //Prompt Index starts from 1 and not 0. Feedback will store first Stuff prompt as 1 instead of 0
    `You are a Summarization agent for ERP Business System which helps in summarization of content. You will be supplied with some content of related to business objects of the given ERP System. You need to work with all these json entities in order to summarize and to find the history of changes done in each object. Always give summary in ${summarizeConfigParams.SISelectedStructure} structure and analyze the history based on the date if provided. Keep the word limit of the summarization upto ${summarizeConfigParams.SIWordLength} and answer it in ${summarizeConfigParams.SIVoiceTone} tone.Always take a deep breath and answer the question.\n\n\n"{text}"\n\n\nCONCISE SUMMARY:`,
    `With the data that you have been given, you need to generate a very detailed and precise summary where you need to mention the actions taken on a particular day and also describe the action so that I can understand what actions to take in the future based on your answers. Make sure to summarize correctly as it is very important and affects my business. Also tell me which actions are most important (being used more) and what is being emphasized more. Always give summary in ${summarizeConfigParams.SISelectedStructure} structure and analyze the history based on the date if provided. Keep the word limit of the summarization upto ${summarizeConfigParams.SIWordLength} and answer it in ${summarizeConfigParams.SIVoiceTone} tone.\n\n\n"{text}"\n\n\nCONCISE SUMMARY:`
  ];
  const randomIndex = Math.floor(Math.random() * stuffPrompts.length);
  const selectedPrompt = stuffPrompts[randomIndex];
  if (summarizeConfigParams.selectedCategory == 'SIPrompt') {
    switch (type) {
      case "stuff":
        configParams = {
          type: type,
          prompt: new PromptTemplate({ inputVariables: ["text"], template: selectedPrompt }),
          promptIndex: randomIndex
        };
        break;
      case "refine":
        configParams = {
          type: type,
          outputKey: "text",
          refinePrompt: new PromptTemplate({ inputVariables: ["existing_answer", "text"], template: `Your job is to produce a final summary\nWe have provided an existing summary up to a certain point: \"{existing_answer}\"\nWe have the opportunity to refine the existing summary\n(only if needed) with some more context below.\n------------\n\"{text}\"\n------------\n\nGiven the new context, refine the original summary\nIf the context isnt useful, return the original summary. Always give summary in ${summarizeConfigParams.SISelectedStructure} structure and analyze it based on the date if provided. Keep the word limit of the summarization upto ${summarizeConfigParams.SIWordLength} and answer it in ${summarizeConfigParams.SIVoiceTone} tone.\n\nREFINED SUMMARY:` }),

          questionPrompt: new PromptTemplate({ inputVariables: ["text"], template: `Write a short and concise summary of the following and give the summary in ${summarizeConfigParams.SISelectedStructure} structure and analyze the history based on the date if provided. Keep the word limit of the summarization upto ${summarizeConfigParams.SIWordLength} and answer it in ${summarizeConfigParams.SIVoiceTone} tone.:\n\n\n"{text}"\n\n\nCONCISE SUMMARY:` })
        };
        break;
      case "map_reduce":
        configParams = {
          type: type,
          maxTokens: MAX_TOKENS * 0.75,
          combinePrompt: new PromptTemplate({ inputVariables: ["text"], template: `Write a precise and detailed summary of the following mentioning the proper dates and what happened on that day and always give summary in ${summarizeConfigParams.SISelectedStructure} structure and analyze the history based on the date if provided. Keep the word limit of the summarization upto ${summarizeConfigParams.SIWordLength} and answer it in ${summarizeConfigParams.SIVoiceTone} tone.:\n\n\n"{text}"\n\n\nCONCISE SUMMARY:` }),

          combineMapPrompt: new PromptTemplate({ inputVariables: ["text"], template: `Write a precise and detailed summary of the following mentioning the proper dates and what happened on that day and always give summary in ${summarizeConfigParams.SISelectedStructure} structure and analyze the history based on the date if provided. Keep the word limit of the summarization upto ${summarizeConfigParams.SIWordLength} and answer it in ${summarizeConfigParams.SIVoiceTone} tone.:\n\n\n"{text}"\n\n\nCONCISE SUMMARY:` })
        };
        break;
    }
  } 
  else if (summarizeConfigParams.selectedCategory == 'OEPrompt') {
    switch (type) {
      case "stuff":
        configParams = {
          type: type,
          prompt: new PromptTemplate({ inputVariables: ["text"], template: summarizeConfigParams.OEPromptInput + '\n\n\n"{text}"\n\n\nCONCISE SUMMARY:' })
        };
        break;
      case "refine":
        configParams = {
          type: type,
          outputKey: "text",
          prompt: new PromptTemplate({ inputVariables: ["text"], template: summarizeConfigParams.OEPromptInput + '\n\n\n"{text}"\n\n\nCONCISE SUMMARY:' })
        };
        break;
      case "map_reduce":
        configParams = {
          type: type,
          maxTokens: MAX_TOKENS * 0.75,
          prompt: new PromptTemplate({ inputVariables: ["text"], template: summarizeConfigParams.OEPromptInput + '\n\n\n"{text}"\n\n\nCONCISE SUMMARY:' })
        };
        break;
    }
  }
  return configParams;
}

module.exports = { checkSummaryExists, summarizeConfig };