const cds = require('@sap/cds');

const MAX_TOKENS = 500;
const TEMPERATURE = 0.8;
const FREQUENCY_PENALTY = 0;
const PRESENCE_PENALTY = 0;
const STOP_SEQUENCE = null;

const Gen_AI_Model_PARAMS = {
    temperature: TEMPERATURE,
};


class service extends cds.ApplicationService {

    async init() {
        // Spread Operator
        const { BusinessObjectSummarizations, SummaryFeedback } = this.entities

        this.on(["POST","PUT"], BusinessObjectSummarizations, async (req, next)=>{
            req.data.modifiedAt = req.context.timestamp.toJSON();
            req.data.modifiedBy = req.context.user.id;
            let response = await next()
            return response;
        })

        this.on(["POST", "PUT"], SummaryFeedback, async(req, next) => {
            console.log(req.data)
        })

        await super.init();
    }
}

module.exports = service;