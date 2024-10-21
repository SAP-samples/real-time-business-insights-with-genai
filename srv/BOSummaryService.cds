using {sap.bos.db as db} from '../db/schema.cds';

service BOSummaryService {

  entity BusinessObjectSummarizations as projection on db.BusinessObjectSummarizations;
  entity SummaryFeedback as projection on db.SummaryFeedback;

}
