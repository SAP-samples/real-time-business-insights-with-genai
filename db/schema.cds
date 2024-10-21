namespace sap.bos.db;

using {cuid, managed} from '@sap/cds/common';
entity BusinessObjectSummarizations : cuid, managed {
            boId     : String(40);
            history  : String;
}

entity SummaryFeedback : cuid, managed {
            boName: String;
            summaryType  : String;
            prompt: String;
            boId     : String(40);
            like: Boolean;    
}
