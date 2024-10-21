const { SimpleChatModel } = require("@langchain/core/language_models/chat_models");
const cds = require("@sap/cds");

class GenAIHubChatModel extends SimpleChatModel {

    constructor(params) {
        super(params);
    }

    async _call(messages) {
        try {
            const capllm = await cds.connect.to("cap-llm-plugin");
            let chatResponse = await capllm.getChatCompletion({ messages: this._convertToChatMessages(messages) });
            return chatResponse.content;
        } catch (err) {
            console.log(err);
            return "Error in calling GenAI Hub Chat Model";
        }
    }

    _convertToChatMessages(messages) {
        const chatMessages = [];
        messages.forEach(message => {
            switch (message.toDict().type) {
                case 'human':
                    chatMessages.push({ "role": "user", "content": message.toDict().data.content });
                    break;
                case 'system':
                    chatMessages.push({ "role": "system", "content": message.toDict().data.content });
                    break;
                case 'ai':
                    chatMessages.push({ "role": "assistant", "content": message.toDict().data.content });
                    break;
            }
        });
        return chatMessages;
    }

    _llmType() {
        return "GenAI Hub Chat Model";
    }

    async *_streamResponseChunks(messages, options, runManager) {
        throw new Error("Streaming of response is not supported!")
      }
}

module.exports = {GenAIHubChatModel};